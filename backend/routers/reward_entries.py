import os
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


router = APIRouter(tags=["Reward Entries"])


def _env_true(value: Optional[str]) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def whatsapp_auto_reward_enabled() -> bool:
    return _env_true(
        os.getenv(
            "WHATSAPP_AUTO_SEND_REWARD",
            os.getenv("WHATSAPP_AUTO_SEND", "false"),
        )
    )


def round_points(value) -> float:
    return round(float(value or 0), 2)


def calculate_item_points(points_per_unit, quantity) -> float:
    return round_points(float(points_per_unit or 0) * float(quantity or 0))


def get_final_unit(input_unit, loyalty_item) -> str:
    return (
        input_unit
        or getattr(loyalty_item, "unit", None)
        or "pcs"
    )


def try_auto_send_reward_whatsapp(
    *,
    reward_entry_id: int,
    db: Session,
    current_user: dict,
) -> dict:
    if not whatsapp_auto_reward_enabled():
        return {
            "enabled": False,
            "attempted": False,
            "success": False,
            "status": "disabled",
            "message": "Auto WhatsApp reward sending is disabled.",
            "log_id": None,
            "message_cost": 0.0,
            "cost_currency": "INR",
            "billing_status": "disabled",
            "error_message": None,
        }

    try:
        from routers.messages import send_reward_entry_whatsapp_core

        response = send_reward_entry_whatsapp_core(
            reward_entry_id=reward_entry_id,
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
                "Reward WhatsApp message sent automatically."
                if response.success
                else "Reward WhatsApp auto-send failed."
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
            "message": "Reward WhatsApp auto-send failed.",
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
            "message": "Reward WhatsApp auto-send failed.",
            "log_id": None,
            "message_cost": 0.0,
            "cost_currency": "INR",
            "billing_status": "not_billable_failed",
            "error_message": str(exc),
        }


# ------------------------------------------------------------------
# REWARD ENTRY ROUTES
# ------------------------------------------------------------------
@router.post("/reward-entries/bulk")
@router.post("/reward-entries/bulk/")
def create_bulk_reward_entry(
    reward_data: schemas.RewardEntryBulkCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    customer = get_customer_or_404(
        reward_data.customer_id,
        db,
        current_user,
        for_update=True,
    )

    if getattr(customer, "is_active", True) is False:
        raise HTTPException(
            status_code=400,
            detail="Customer is inactive",
        )

    if not reward_data.items or len(reward_data.items) == 0:
        raise HTTPException(
            status_code=400,
            detail="At least one item is required",
        )

    store_id = customer.store_id
    calculated_total_points = 0.0
    manual_entry_date = reward_data.entry_date

    reward_entry_payload = {
        "store_id": store_id,
        "customer_id": customer.id,
        "total_points": 0.0,
        "note": reward_data.note,
    }

    if manual_entry_date:
        reward_entry_payload["created_at"] = manual_entry_date

    new_reward_entry = models.RewardEntry(**reward_entry_payload)

    db.add(new_reward_entry)
    db.flush()

    created_items = []

    for row in reward_data.items:
        loyalty_item = get_loyalty_item_or_404(
            row.loyalty_item_id,
            db,
            current_user,
        )

        if getattr(loyalty_item, "is_active", True) is False:
            raise HTTPException(
                status_code=400,
                detail=f"Item '{loyalty_item.item_name}' is inactive",
            )

        if customer.store_id != loyalty_item.store_id:
            raise HTTPException(
                status_code=400,
                detail="Customer and item must belong to the same store",
            )

        quantity = float(row.quantity or 0)

        if quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be greater than zero",
            )

        points_per_unit = float(
            loyalty_item.per_point_amount or row.points_per_unit or 0
        )

        if points_per_unit <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid points for item '{loyalty_item.item_name}'",
            )

        final_unit = get_final_unit(row.unit, loyalty_item)
        total_points = calculate_item_points(points_per_unit, quantity)

        if total_points <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Calculated points is zero for item '{loyalty_item.item_name}'",
            )

        calculated_total_points = round_points(calculated_total_points + total_points)

        reward_entry_item_payload = {
            "reward_entry_id": new_reward_entry.id,
            "loyalty_item_id": loyalty_item.id,
            "unit": final_unit,
            "quantity": quantity,
            "points_per_unit": points_per_unit,
            "total_points": total_points,
        }

        if manual_entry_date:
            reward_entry_item_payload["created_at"] = manual_entry_date

        reward_entry_item = models.RewardEntryItem(**reward_entry_item_payload)

        db.add(reward_entry_item)
        db.flush()

        point_transaction_payload = {
            "store_id": store_id,
            "customer_id": customer.id,
            "loyalty_item_id": loyalty_item.id,
            "transaction_type": "EARN",
            "points": total_points,
            "amount": None,
            "note": f"Reward Entry - {loyalty_item.item_name} ({quantity} {final_unit})",
        }

        if manual_entry_date:
            point_transaction_payload["created_at"] = manual_entry_date

        point_transaction = models.PointTransaction(**point_transaction_payload)

        db.add(point_transaction)
        db.flush()

        reward_entry_item.point_transaction_id = point_transaction.id

        created_items.append({
            "reward_entry_item_id": reward_entry_item.id,
            "transaction_id": point_transaction.id,
            "loyalty_item_id": loyalty_item.id,
            "item_name": loyalty_item.item_name,
            "unit": final_unit,
            "quantity": quantity,
            "points_per_unit": points_per_unit,
            "total_points": total_points,
        })

    new_reward_entry.total_points = round_points(calculated_total_points)

    customer.points_balance = round_points(
        float(customer.points_balance or 0) + calculated_total_points
    )

    db.commit()
    db.refresh(new_reward_entry)
    db.refresh(customer)

    whatsapp_result = try_auto_send_reward_whatsapp(
        reward_entry_id=new_reward_entry.id,
        db=db,
        current_user=current_user,
    )

    return {
        "message": "Reward entry saved successfully",
        "reward_entry_id": new_reward_entry.id,
        "transaction_group_id": new_reward_entry.id,
        "customer_id": customer.id,
        "customer_name": customer.name,
        "item_count": len(created_items),
        "total_points": new_reward_entry.total_points,
        "new_points_balance": customer.points_balance,
        "created_at": new_reward_entry.created_at,
        "items": created_items,
        "whatsapp": whatsapp_result,
    }


@router.post("/reward-entries/{reward_entry_id}/items")
def add_item_to_reward_entry(
    reward_entry_id: int,
    item_data: schemas.RewardEntryItemAdd,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    reward_entry = db.query(models.RewardEntry).filter(
        models.RewardEntry.id == reward_entry_id
    ).first()

    if not reward_entry:
        raise HTTPException(
            status_code=404,
            detail="Reward entry not found",
        )

    customer = get_customer_or_404(
        reward_entry.customer_id,
        db,
        current_user,
        for_update=True,
    )

    if getattr(customer, "is_active", True) is False:
        raise HTTPException(
            status_code=400,
            detail="Customer is inactive",
        )

    loyalty_item = get_loyalty_item_or_404(
        item_data.loyalty_item_id,
        db,
        current_user,
    )

    if getattr(loyalty_item, "is_active", True) is False:
        raise HTTPException(
            status_code=400,
            detail=f"Item '{loyalty_item.item_name}' is inactive",
        )

    if customer.store_id != loyalty_item.store_id:
        raise HTTPException(
            status_code=400,
            detail="Customer and item must belong to the same store",
        )

    quantity = float(item_data.quantity or 0)

    if quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero",
        )

    points_per_unit = float(
        loyalty_item.per_point_amount or item_data.points_per_unit or 0
    )

    if points_per_unit <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid points for item '{loyalty_item.item_name}'",
        )

    final_unit = get_final_unit(item_data.unit, loyalty_item)
    total_points = calculate_item_points(points_per_unit, quantity)

    if total_points <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Calculated points is zero for item '{loyalty_item.item_name}'",
        )

    item_date = item_data.entry_date or reward_entry.created_at

    reward_entry_item_payload = {
        "reward_entry_id": reward_entry.id,
        "loyalty_item_id": loyalty_item.id,
        "unit": final_unit,
        "quantity": quantity,
        "points_per_unit": points_per_unit,
        "total_points": total_points,
    }

    if item_date:
        reward_entry_item_payload["created_at"] = item_date

    reward_entry_item = models.RewardEntryItem(**reward_entry_item_payload)

    db.add(reward_entry_item)
    db.flush()

    point_transaction_payload = {
        "store_id": customer.store_id,
        "customer_id": customer.id,
        "loyalty_item_id": loyalty_item.id,
        "transaction_type": "EARN",
        "points": total_points,
        "amount": None,
        "note": item_data.note
        or f"Reward Entry - {loyalty_item.item_name} ({quantity} {final_unit})",
    }

    if item_date:
        point_transaction_payload["created_at"] = item_date

    point_transaction = models.PointTransaction(**point_transaction_payload)

    db.add(point_transaction)
    db.flush()

    reward_entry_item.point_transaction_id = point_transaction.id

    reward_entry.total_points = round_points(
        float(reward_entry.total_points or 0) + total_points
    )

    customer.points_balance = round_points(
        float(customer.points_balance or 0) + total_points
    )

    db.commit()
    db.refresh(reward_entry_item)
    db.refresh(reward_entry)
    db.refresh(customer)

    return {
        "message": "Item added to existing reward entry successfully",
        "reward_entry_id": reward_entry.id,
        "transaction_group_id": reward_entry.id,
        "reward_entry_item_id": reward_entry_item.id,
        "transaction_id": point_transaction.id,
        "customer_id": customer.id,
        "customer_name": customer.name,
        "loyalty_item_id": loyalty_item.id,
        "item_name": loyalty_item.item_name,
        "unit": reward_entry_item.unit,
        "quantity": reward_entry_item.quantity,
        "points_per_unit": reward_entry_item.points_per_unit,
        "total_points": reward_entry_item.total_points,
        "reward_entry_total_points": reward_entry.total_points,
        "customer_points_balance": customer.points_balance,
        "created_at": reward_entry_item.created_at,
    }


@router.get("/reward-entries/grouped")
def read_reward_entries_grouped(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.RewardEntry)

    if tenant_id is not None:
        query = query.filter(models.RewardEntry.store_id == tenant_id)

    if customer_id is not None:
        query = query.filter(models.RewardEntry.customer_id == customer_id)

    reward_entries = query.order_by(
        models.RewardEntry.created_at.desc()
    ).offset(skip).limit(limit).all()

    response = []

    for entry in reward_entries:
        customer_name = entry.customer.name if entry.customer else None
        phone_number = entry.customer.phone_number if entry.customer else None

        items = []

        for item in entry.items:
            items.append({
                "id": item.id,
                "reward_entry_item_id": item.id,
                "transaction_id": item.point_transaction_id,
                "point_transaction_id": item.point_transaction_id,
                "loyalty_item_id": item.loyalty_item_id,
                "item_id": item.loyalty_item_id,
                "item_name": item.loyalty_item.item_name if item.loyalty_item else None,
                "unit": item.unit,
                "quantity": item.quantity,
                "points_per_unit": item.points_per_unit,
                "total_points": item.total_points,
                "created_at": item.created_at,
            })

        response.append({
            "id": entry.id,
            "reward_entry_id": entry.id,
            "transaction_group_id": entry.id,
            "store_id": entry.store_id,
            "customer_id": entry.customer_id,
            "customer_name": customer_name,
            "phone_number": phone_number,
            "type": "POINTS_CREDIT",
            "transaction_type": "EARN",
            "item_count": len(items),
            "total_points": entry.total_points,
            "points": entry.total_points,
            "note": entry.note,
            "created_at": entry.created_at,
            "items": items,
        })

    return response


@router.get("/reward-entries")
@router.get("/reward-entries/")
def read_reward_entries(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.RewardEntry)

    if tenant_id is not None:
        query = query.filter(models.RewardEntry.store_id == tenant_id)

    if customer_id is not None:
        query = query.filter(models.RewardEntry.customer_id == customer_id)

    reward_entries = query.order_by(
        models.RewardEntry.created_at.desc()
    ).offset(skip).limit(limit).all()

    response = []

    for entry in reward_entries:
        customer_name = entry.customer.name if entry.customer else None
        phone_number = entry.customer.phone_number if entry.customer else None

        for item in entry.items:
            response.append(
                {
                    "id": item.id,
                    "reward_entry_item_id": item.id,
                    "reward_entry_id": entry.id,
                    "transaction_group_id": entry.id,

                    "transaction_id": item.point_transaction_id,
                    "point_transaction_id": item.point_transaction_id,

                    "store_id": entry.store_id,
                    "customer_id": entry.customer_id,
                    "customer_name": customer_name,
                    "phone_number": phone_number,

                    "loyalty_item_id": item.loyalty_item_id,
                    "item_id": item.loyalty_item_id,
                    "item_name": item.loyalty_item.item_name if item.loyalty_item else None,

                    "unit": item.unit,
                    "quantity": item.quantity,
                    "points_per_unit": item.points_per_unit,
                    "total_points": item.total_points,

                    "reward_entry_total_points": entry.total_points,
                    "note": entry.note,
                    "created_at": entry.created_at,
                }
            )

    return response