from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

from core.security import (
    check_store_access,
    get_current_db_user,
    get_current_user,
    get_tenant_scope,
    require_roles,
    verify_password,
)

from services.customer_service import get_customer_or_404
from services.loyalty_item_service import get_loyalty_item_or_404


router = APIRouter(tags=["Transactions"])


@router.get("/transactions/")
@router.get("/transactions")
def read_transactions_alias(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.PointTransaction)

    if tenant_id is not None:
        query = query.filter(models.PointTransaction.store_id == tenant_id)

    if customer_id is not None:
        query = query.filter(models.PointTransaction.customer_id == customer_id)

    transactions = query.order_by(
        models.PointTransaction.created_at.desc()
    ).offset(skip).limit(limit).all()

    response = []

    for txn in transactions:
        raw_type = str(txn.transaction_type or "").upper()

        if raw_type in ["EARN", "MANUAL_ADD", "POINTS_CREDIT", "CREDIT"]:
            frontend_type = "POINTS_CREDIT"
        elif raw_type in ["REDEEM", "MANUAL_DEDUCT", "POINTS_DEBIT", "DEBIT"]:
            frontend_type = "POINTS_DEBIT"
        else:
            frontend_type = raw_type

        customer = db.query(models.Customer).filter(
            models.Customer.id == txn.customer_id
        ).first()

        reward_item = db.query(models.RewardEntryItem).filter(
            models.RewardEntryItem.point_transaction_id == txn.id
        ).first()

        reward_entry = None
        loyalty_item = None

        if reward_item:
            reward_entry = db.query(models.RewardEntry).filter(
                models.RewardEntry.id == reward_item.reward_entry_id
            ).first()

            loyalty_item = db.query(models.LoyaltyItem).filter(
                models.LoyaltyItem.id == reward_item.loyalty_item_id
            ).first()

        elif txn.loyalty_item_id:
            loyalty_item = db.query(models.LoyaltyItem).filter(
                models.LoyaltyItem.id == txn.loyalty_item_id
            ).first()

        response.append({
            "id": txn.id,
            "transaction_id": txn.id,
            "point_transaction_id": txn.id,

            "store_id": txn.store_id,
            "customer_id": txn.customer_id,
            "customer_name": customer.name if customer else None,
            "phone_number": customer.phone_number if customer else None,

            "reward_entry_id": reward_entry.id if reward_entry else None,
            "reward_entry_item_id": reward_item.id if reward_item else None,

            "loyalty_item_id": reward_item.loyalty_item_id if reward_item else txn.loyalty_item_id,
            "item_id": reward_item.loyalty_item_id if reward_item else txn.loyalty_item_id,
            "item_name": loyalty_item.item_name if loyalty_item else None,

            "unit": reward_item.unit if reward_item else None,
            "quantity": reward_item.quantity if reward_item else None,
            "points_per_unit": reward_item.points_per_unit if reward_item else None,

            "transaction_type": txn.transaction_type,
            "type": frontend_type,

            "points": txn.points,
            "total_points": txn.points,
            "amount": txn.amount,
            "note": txn.note,
            "description": txn.note,
            "created_at": txn.created_at,
        })

    return response


@router.put("/transactions/reward-entry-items/{reward_entry_item_id}")
def update_reward_entry_item_transaction(
    reward_entry_item_id: int,
    update_data: schemas.RewardEntryItemUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    reward_item = db.query(models.RewardEntryItem).filter(
        models.RewardEntryItem.id == reward_entry_item_id
    ).first()

    if not reward_item:
        raise HTTPException(
            status_code=404,
            detail="Reward entry item not found",
        )

    reward_entry = db.query(models.RewardEntry).filter(
        models.RewardEntry.id == reward_item.reward_entry_id
    ).first()

    if not reward_entry:
        raise HTTPException(
            status_code=404,
            detail="Reward entry not found",
        )

    check_store_access(current_user, reward_entry.store_id)

    customer = get_customer_or_404(
        reward_entry.customer_id,
        db,
        current_user,
        for_update=True,
    )

    loyalty_item = get_loyalty_item_or_404(
        update_data.loyalty_item_id,
        db,
        current_user,
    )

    if customer.store_id != loyalty_item.store_id:
        raise HTTPException(
            status_code=400,
            detail="Customer and item must belong to the same store",
        )

    if update_data.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero",
        )

    points_per_unit = float(loyalty_item.per_point_amount or 0)

    if points_per_unit <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid points for item '{loyalty_item.item_name}'",
        )

    old_points = int(reward_item.total_points or 0)
    old_loyalty_item_id = reward_item.loyalty_item_id

    new_points = int(round(points_per_unit * update_data.quantity))
    points_difference = new_points - old_points

    new_customer_balance = int(customer.points_balance or 0) + points_difference

    if new_customer_balance < 0:
        raise HTTPException(
            status_code=400,
            detail="This edit will make customer point balance negative",
        )

    transaction = None

    if getattr(reward_item, "point_transaction_id", None):
        transaction = db.query(models.PointTransaction).filter(
            models.PointTransaction.id == reward_item.point_transaction_id
        ).first()

    if not transaction:
        transaction = db.query(models.PointTransaction).filter(
            models.PointTransaction.customer_id == customer.id,
            models.PointTransaction.loyalty_item_id == old_loyalty_item_id,
            models.PointTransaction.transaction_type == "EARN",
            models.PointTransaction.points == old_points,
        ).order_by(
            models.PointTransaction.created_at.desc()
        ).first()

    manual_entry_date = update_data.entry_date

    reward_item.loyalty_item_id = loyalty_item.id
    reward_item.unit = update_data.unit
    reward_item.quantity = update_data.quantity
    reward_item.points_per_unit = points_per_unit
    reward_item.total_points = new_points

    if manual_entry_date:
        reward_item.created_at = manual_entry_date
        reward_entry.created_at = manual_entry_date

    customer.points_balance = new_customer_balance

    reward_entry.total_points = sum(
        int(item.total_points or 0)
        for item in reward_entry.items
    )

    note = (
        update_data.note
        or f"Reward Entry - {loyalty_item.item_name} ({update_data.quantity} {update_data.unit})"
    )

    if transaction:
        transaction.store_id = customer.store_id
        transaction.customer_id = customer.id
        transaction.loyalty_item_id = loyalty_item.id
        transaction.transaction_type = "EARN"
        transaction.points = new_points
        transaction.amount = None
        transaction.note = note

        if manual_entry_date:
            transaction.created_at = manual_entry_date

        reward_item.point_transaction_id = transaction.id
    else:
        new_transaction_payload = {
            "store_id": customer.store_id,
            "customer_id": customer.id,
            "loyalty_item_id": loyalty_item.id,
            "transaction_type": "EARN",
            "points": new_points,
            "amount": None,
            "note": note,
        }

        if manual_entry_date:
            new_transaction_payload["created_at"] = manual_entry_date

        new_transaction = models.PointTransaction(**new_transaction_payload)

        db.add(new_transaction)
        db.flush()

        reward_item.point_transaction_id = new_transaction.id

    db.commit()
    db.refresh(reward_item)

    return {
        "message": "Transaction updated successfully",
        "reward_entry_item_id": reward_item.id,
        "reward_entry_id": reward_entry.id,
        "customer_id": customer.id,
        "customer_name": customer.name,
        "loyalty_item_id": loyalty_item.id,
        "item_name": loyalty_item.item_name,
        "unit": reward_item.unit,
        "quantity": reward_item.quantity,
        "points_per_unit": reward_item.points_per_unit,
        "total_points": reward_item.total_points,
        "customer_points_balance": customer.points_balance,
        "created_at": reward_item.created_at,
    }


@router.put("/transactions/{transaction_id}")
def update_point_transaction(
    transaction_id: int,
    transaction_data: schemas.PointTransactionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    transaction = db.query(models.PointTransaction).filter(
        models.PointTransaction.id == transaction_id
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Point transaction not found",
        )

    reward_item = db.query(models.RewardEntryItem).filter(
        models.RewardEntryItem.point_transaction_id == transaction.id
    ).first()

    if reward_item:
        raise HTTPException(
            status_code=400,
            detail="Reward Entry transactions must be edited by product, unit, and quantity.",
        )

    check_store_access(current_user, transaction.store_id)

    old_customer = get_customer_or_404(
        transaction.customer_id,
        db,
        current_user,
        for_update=True,
    )

    old_type = str(transaction.transaction_type or "").upper()
    old_points = int(transaction.points or 0)

    if old_type in ["EARN", "MANUAL_ADD", "POINTS_CREDIT", "CREDIT"]:
        old_customer.points_balance = int(old_customer.points_balance or 0) - old_points
    elif old_type in ["REDEEM", "MANUAL_DEDUCT", "POINTS_DEBIT", "DEBIT"]:
        old_customer.points_balance = int(old_customer.points_balance or 0) + old_points

    new_customer = get_customer_or_404(
        transaction_data.customer_id,
        db,
        current_user,
        for_update=True,
    )

    if transaction.store_id != new_customer.store_id:
        raise HTTPException(
            status_code=400,
            detail="Transaction and customer must belong to the same store",
        )

    new_points = int(transaction_data.points or 0)

    if new_points <= 0:
        raise HTTPException(
            status_code=400,
            detail="Points must be greater than zero",
        )

    incoming_type = str(
        transaction_data.type or transaction_data.transaction_type or ""
    ).upper()

    if incoming_type in ["POINTS_CREDIT", "CREDIT", "EARN", "MANUAL_ADD"]:
        new_transaction_type = "EARN"
        new_customer.points_balance = int(new_customer.points_balance or 0) + new_points

    elif incoming_type in ["POINTS_DEBIT", "DEBIT", "REDEEM", "MANUAL_DEDUCT"]:
        new_transaction_type = "REDEEM"

        if int(new_customer.points_balance or 0) < new_points:
            if old_type in ["EARN", "MANUAL_ADD", "POINTS_CREDIT", "CREDIT"]:
                old_customer.points_balance = int(old_customer.points_balance or 0) + old_points
            elif old_type in ["REDEEM", "MANUAL_DEDUCT", "POINTS_DEBIT", "DEBIT"]:
                old_customer.points_balance = int(old_customer.points_balance or 0) - old_points

            raise HTTPException(
                status_code=400,
                detail="Customer does not have enough points",
            )

        new_customer.points_balance = int(new_customer.points_balance or 0) - new_points

    else:
        if old_type in ["EARN", "MANUAL_ADD", "POINTS_CREDIT", "CREDIT"]:
            old_customer.points_balance = int(old_customer.points_balance or 0) + old_points
        elif old_type in ["REDEEM", "MANUAL_DEDUCT", "POINTS_DEBIT", "DEBIT"]:
            old_customer.points_balance = int(old_customer.points_balance or 0) - old_points

        raise HTTPException(
            status_code=400,
            detail="Invalid transaction type",
        )

    transaction.customer_id = new_customer.id
    transaction.store_id = new_customer.store_id
    transaction.transaction_type = new_transaction_type
    transaction.points = new_points

    if transaction_data.description is not None:
        transaction.note = transaction_data.description

    if transaction_data.note is not None:
        transaction.note = transaction_data.note

    db.commit()
    db.refresh(transaction)

    return {
        "message": "Point transaction updated successfully",
        "id": transaction.id,
        "customer_id": transaction.customer_id,
        "transaction_type": transaction.transaction_type,
        "type": "POINTS_CREDIT" if transaction.transaction_type == "EARN" else "POINTS_DEBIT",
        "points": transaction.points,
        "note": transaction.note,
        "description": transaction.note,
        "created_at": transaction.created_at,
    }


@router.delete("/transactions/{transaction_id}")
def delete_point_transaction(
    transaction_id: int,
    delete_data: schemas.TransactionDeleteRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    current_db_user = get_current_db_user(db, current_user)

    if not verify_password(delete_data.password, current_db_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect password",
        )

    transaction = db.query(models.PointTransaction).filter(
        models.PointTransaction.id == transaction_id
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    check_store_access(current_user, transaction.store_id)

    customer = get_customer_or_404(
        transaction.customer_id,
        db,
        current_user,
        for_update=True,
    )

    points = int(transaction.points or 0)
    raw_type = str(transaction.transaction_type or "").upper()

    reward_item = db.query(models.RewardEntryItem).filter(
        models.RewardEntryItem.point_transaction_id == transaction.id
    ).first()

    if reward_item:
        reward_entry = db.query(models.RewardEntry).filter(
            models.RewardEntry.id == reward_item.reward_entry_id
        ).first()

        reverse_points = int(reward_item.total_points or points or 0)

        new_balance = int(customer.points_balance or 0) - reverse_points

        if new_balance < 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete this earned transaction because customer balance will become negative",
            )

        customer.points_balance = new_balance

        if reward_entry:
            remaining_items = [
                item for item in reward_entry.items
                if item.id != reward_item.id
            ]

            db.delete(reward_item)
            db.flush()

            if remaining_items:
                reward_entry.total_points = sum(
                    int(item.total_points or 0)
                    for item in remaining_items
                )
            else:
                db.delete(reward_entry)
        else:
            db.delete(reward_item)
            db.flush()

        db.delete(transaction)
        db.commit()

        return {
            "message": "Reward entry transaction deleted successfully",
            "transaction_id": transaction_id,
            "customer_id": customer.id,
            "customer_points_balance": customer.points_balance,
        }

    if raw_type in ["EARN", "MANUAL_ADD", "POINTS_CREDIT", "CREDIT"]:
        new_balance = int(customer.points_balance or 0) - points

        if new_balance < 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete this credit transaction because customer balance will become negative",
            )

        customer.points_balance = new_balance

    elif raw_type in ["REDEEM", "MANUAL_DEDUCT", "POINTS_DEBIT", "DEBIT"]:
        customer.points_balance = int(customer.points_balance or 0) + points

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid transaction type",
        )

    db.delete(transaction)
    db.commit()

    return {
        "message": "Transaction deleted successfully",
        "transaction_id": transaction_id,
        "customer_id": customer.id,
        "customer_points_balance": customer.points_balance,
    }