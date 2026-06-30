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


router = APIRouter(tags=["Payouts"])


# ------------------------------------------------------------------
# PAYOUT / REDEMPTION ROUTES
# ------------------------------------------------------------------
@router.post("/payouts", response_model=schemas.PayoutResponse)
def create_payout(
    payout: schemas.PayoutCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    if payout.points_redeemed <= 0:
        raise HTTPException(
            status_code=400,
            detail="Points redeemed must be greater than zero",
        )

    customer = get_customer_or_404(
        payout.customer_id,
        db,
        current_user,
        for_update=True,
    )

    if int(customer.points_balance or 0) < payout.points_redeemed:
        raise HTTPException(
            status_code=400,
            detail="Customer does not have enough points",
        )

    customer.points_balance = int(customer.points_balance or 0) - payout.points_redeemed

    db_payout = models.Payout(
        store_id=customer.store_id,
        customer_id=customer.id,
        points_redeemed=payout.points_redeemed,
        payout_value=payout.payout_value,
        status="completed",
        note=payout.note,
    )

    db_transaction = models.PointTransaction(
        store_id=customer.store_id,
        customer_id=customer.id,
        loyalty_item_id=None,
        transaction_type="REDEEM",
        points=payout.points_redeemed,
        amount=payout.payout_value,
        note=payout.note,
    )

    db.add(db_payout)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_payout)

    return db_payout


@router.get("/payouts", response_model=list[schemas.PayoutResponse])
def read_payouts(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.Payout)

    if tenant_id is not None:
        query = query.filter(models.Payout.store_id == tenant_id)

    if customer_id is not None:
        query = query.filter(models.Payout.customer_id == customer_id)

    return query.order_by(
        models.Payout.created_at.desc()
    ).offset(skip).limit(limit).all()