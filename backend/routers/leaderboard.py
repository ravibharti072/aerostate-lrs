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


router = APIRouter(tags=["Leaderboard"])


# ------------------------------------------------------------------
# LEADERBOARD ROUTES
# ------------------------------------------------------------------
@router.get("/leaderboard", response_model=list[schemas.LeaderboardResponse])
def read_leaderboard(
    skip: int = 0,
    limit: int = 20,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.Customer)

    if hasattr(models.Customer, "is_active"):
        query = query.filter(models.Customer.is_active == True)

    if tenant_id is not None:
        query = query.filter(models.Customer.store_id == tenant_id)

    customers = query.order_by(
        models.Customer.points_balance.desc()
    ).offset(skip).limit(limit).all()

    return [
        {
            "customer_id": customer.id,
            "name": customer.name,
            "phone_number": customer.phone_number,
            "points_balance": customer.points_balance,
        }
        for customer in customers
    ]


@router.put("/leaderboard/customers/{customer_id}")
def update_leaderboard_customer_points(
    customer_id: int,
    data: schemas.LeaderboardCustomerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    customer = get_customer_or_404(
        customer_id,
        db,
        current_user,
        for_update=True,
    )

    new_balance = int(data.points_balance or 0)

    if new_balance < 0:
        raise HTTPException(
            status_code=400,
            detail="Points balance cannot be negative",
        )

    old_balance = int(customer.points_balance or 0)
    difference = new_balance - old_balance

    customer.points_balance = new_balance

    if difference != 0:
        db_transaction = models.PointTransaction(
            store_id=customer.store_id,
            customer_id=customer.id,
            loyalty_item_id=None,
            transaction_type="MANUAL_ADD" if difference > 0 else "MANUAL_DEDUCT",
            points=abs(difference),
            amount=None,
            note=data.note or "Leaderboard points balance edited",
        )

        db.add(db_transaction)

    db.commit()
    db.refresh(customer)

    return {
        "message": "Leaderboard customer points updated successfully",
        "customer_id": customer.id,
        "name": customer.name,
        "phone_number": customer.phone_number,
        "points_balance": customer.points_balance,
    }