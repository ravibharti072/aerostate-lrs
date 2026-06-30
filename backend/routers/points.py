from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

from core.security import (
    get_current_user,
    get_tenant_scope,
    require_roles,
)

from services.customer_service import get_customer_or_404
from services.loyalty_item_service import get_loyalty_item_or_404


router = APIRouter(tags=["Points"])


# ------------------------------------------------------------------
# POINT ASSIGNMENT ROUTES
# ------------------------------------------------------------------
@router.post("/points/assign", response_model=schemas.PointTransactionResponse)
def assign_points_from_item(
    request: schemas.PointAssignRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    if request.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Amount must be greater than zero",
        )

    customer = get_customer_or_404(
        request.customer_id,
        db,
        current_user,
        for_update=True,
    )

    item = get_loyalty_item_or_404(
        request.loyalty_item_id,
        db,
        current_user,
    )

    if getattr(customer, "is_active", True) is False:
        raise HTTPException(
            status_code=400,
            detail="Customer is inactive",
        )

    if item.is_active is False:
        raise HTTPException(
            status_code=400,
            detail="Loyalty item is inactive",
        )

    if customer.store_id != item.store_id:
        raise HTTPException(
            status_code=400,
            detail="Customer and loyalty item must belong to the same store",
        )

    if item.per_point_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid per point amount for this item",
        )

    points = int(request.amount // item.per_point_amount)

    if points <= 0:
        raise HTTPException(
            status_code=400,
            detail="Calculated points is zero. Increase amount or reduce per point amount.",
        )

    customer.points_balance = int(customer.points_balance or 0) + points

    db_transaction = models.PointTransaction(
        store_id=customer.store_id,
        customer_id=customer.id,
        loyalty_item_id=item.id,
        transaction_type="EARN",
        points=points,
        amount=request.amount,
        note=request.note,
    )

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return db_transaction


@router.post("/points/manual-add", response_model=schemas.PointTransactionResponse)
def manual_add_points(
    request: schemas.ManualPointRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    if request.points <= 0:
        raise HTTPException(
            status_code=400,
            detail="Points must be greater than zero",
        )

    customer = get_customer_or_404(
        request.customer_id,
        db,
        current_user,
        for_update=True,
    )

    if getattr(customer, "is_active", True) is False:
        raise HTTPException(
            status_code=400,
            detail="Customer is inactive",
        )

    customer.points_balance = int(customer.points_balance or 0) + request.points

    db_transaction = models.PointTransaction(
        store_id=customer.store_id,
        customer_id=customer.id,
        loyalty_item_id=None,
        transaction_type="MANUAL_ADD",
        points=request.points,
        amount=None,
        note=request.note,
    )

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return db_transaction


@router.post("/points/manual-deduct", response_model=schemas.PointTransactionResponse)
def manual_deduct_points(
    request: schemas.ManualPointRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    if request.points <= 0:
        raise HTTPException(
            status_code=400,
            detail="Points must be greater than zero",
        )

    customer = get_customer_or_404(
        request.customer_id,
        db,
        current_user,
        for_update=True,
    )

    if int(customer.points_balance or 0) < request.points:
        raise HTTPException(
            status_code=400,
            detail="Customer does not have enough points",
        )

    customer.points_balance = int(customer.points_balance or 0) - request.points

    db_transaction = models.PointTransaction(
        store_id=customer.store_id,
        customer_id=customer.id,
        loyalty_item_id=None,
        transaction_type="MANUAL_DEDUCT",
        points=request.points,
        amount=None,
        note=request.note,
    )

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return db_transaction


@router.get("/points/history", response_model=list[schemas.PointTransactionResponse])
def read_points_history(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.PointTransaction).join(
        models.Customer,
        models.PointTransaction.customer_id == models.Customer.id,
    )

    if tenant_id is not None:
        query = query.filter(models.PointTransaction.store_id == tenant_id)

    if customer_id is not None:
        query = query.filter(models.PointTransaction.customer_id == customer_id)

    return query.order_by(
        models.PointTransaction.created_at.desc()
    ).offset(skip).limit(limit).all()