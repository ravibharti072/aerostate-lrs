import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

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


def _env_true(value: Optional[str]) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def whatsapp_auto_redemption_enabled() -> bool:
    return _env_true(
        os.getenv(
            "WHATSAPP_AUTO_SEND_REDEMPTION",
            os.getenv(
                "WHATSAPP_AUTO_SEND_PAYOUT",
                os.getenv("WHATSAPP_AUTO_SEND", "false"),
            ),
        )
    )


def _payout_to_response(payout: models.Payout) -> schemas.PayoutResponse:
    customer = getattr(payout, "customer", None)

    return schemas.PayoutResponse(
        id=payout.id,
        store_id=payout.store_id,
        customer_id=payout.customer_id,
        customer_name=getattr(customer, "name", None),
        phone_number=getattr(customer, "phone_number", None),
        points_balance=float(getattr(customer, "points_balance", 0) or 0),
        points_redeemed=float(payout.points_redeemed or 0),
        payout_value=float(payout.payout_value or 0),
        status=payout.status or "completed",
        note=payout.note,
        created_at=payout.created_at,
    )


def try_auto_send_redemption_whatsapp(
    *,
    payout_id: int,
    db: Session,
    current_user: dict,
) -> dict:
    if not whatsapp_auto_redemption_enabled():
        return {
            "enabled": False,
            "attempted": False,
            "success": False,
            "status": "disabled",
            "message": "Auto WhatsApp redemption sending is disabled.",
            "log_id": None,
            "message_cost": 0.0,
            "cost_currency": "INR",
            "billing_status": "disabled",
            "error_message": None,
        }

    try:
        from routers.messages import send_payout_whatsapp_core

        response = send_payout_whatsapp_core(
            payout_id=payout_id,
            allow_resend=False,
            db=db,
            current_user=current_user,
        )

        return {
            "enabled": True,
            "attempted": True,
            "success": bool(response.success),
            "status": response.status,
            "message": (
                "Redemption WhatsApp message sent automatically."
                if response.success
                else "Redemption WhatsApp auto-send failed."
            ),
            "log_id": response.log_id,
            "message_cost": float(response.message_cost or 0),
            "cost_currency": response.cost_currency or "INR",
            "billing_status": response.billing_status or "estimated",
            "error_message": response.error_message,
        }

    except HTTPException as exc:
        return {
            "enabled": True,
            "attempted": True,
            "success": False,
            "status": "failed",
            "message": "Redemption WhatsApp auto-send failed.",
            "log_id": None,
            "message_cost": 0.0,
            "cost_currency": "INR",
            "billing_status": "not_billable_failed",
            "error_message": str(exc.detail),
        }

    except Exception as exc:
        return {
            "enabled": True,
            "attempted": True,
            "success": False,
            "status": "failed",
            "message": "Redemption WhatsApp auto-send failed.",
            "log_id": None,
            "message_cost": 0.0,
            "cost_currency": "INR",
            "billing_status": "not_billable_failed",
            "error_message": str(exc),
        }


# ------------------------------------------------------------------
# PAYOUT / REDEMPTION ROUTES
# ------------------------------------------------------------------
@router.post("/payouts")
def create_payout(
    payout: schemas.PayoutCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    redeem_points = float(payout.points_redeemed or 0)

    if redeem_points <= 0:
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

    current_balance = float(customer.points_balance or 0)

    if current_balance < redeem_points:
        raise HTTPException(
            status_code=400,
            detail="Customer does not have enough points",
        )

    customer.points_balance = current_balance - redeem_points

    payout_value = float(payout.payout_value or 0)

    db_payout = models.Payout(
        store_id=customer.store_id,
        customer_id=customer.id,
        points_redeemed=redeem_points,
        payout_value=payout_value,
        status="completed",
        note=payout.note,
    )

    db_transaction = models.PointTransaction(
        store_id=customer.store_id,
        customer_id=customer.id,
        loyalty_item_id=None,
        transaction_type="REDEEM",
        points=redeem_points,
        amount=payout_value,
        note=payout.note,
    )

    db.add(db_payout)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_payout)

    db_payout = (
        db.query(models.Payout)
        .options(joinedload(models.Payout.customer))
        .filter(models.Payout.id == db_payout.id)
        .first()
    )

    whatsapp_result = try_auto_send_redemption_whatsapp(
        payout_id=db_payout.id,
        db=db,
        current_user=current_user,
    )

    response_data = _payout_to_response(db_payout).model_dump()
    response_data["whatsapp"] = whatsapp_result

    return response_data


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

    query = db.query(models.Payout).options(
        joinedload(models.Payout.customer)
    )

    if tenant_id is not None:
        query = query.filter(models.Payout.store_id == tenant_id)

    if customer_id is not None:
        query = query.filter(models.Payout.customer_id == customer_id)

    payouts = (
        query.order_by(models.Payout.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [_payout_to_response(payout) for payout in payouts]