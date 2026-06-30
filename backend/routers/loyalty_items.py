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
    resolve_store_id,
)

from services.loyalty_item_service import get_loyalty_item_or_404


router = APIRouter(tags=["Loyalty Items"])


# ------------------------------------------------------------------
# LOYALTY ITEM MASTER ROUTES
# ------------------------------------------------------------------
@router.post("/loyalty/items", response_model=schemas.LoyaltyItemResponse)
def create_loyalty_item(
    item: schemas.LoyaltyItemCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    store_id = resolve_store_id(item.store_id, current_user, db)

    if item.per_point_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Per point amount must be greater than zero",
        )

    selected_unit = (
        item.unit
        or item.quantity_unit
        or item.uom
        or item.default_unit
        or "pcs"
    )

    db_item = models.LoyaltyItem(
        store_id=store_id,
        item_name=item.item_name,
        category=item.category,
        sku=item.sku,
        unit=selected_unit,
        per_point_amount=item.per_point_amount,
        is_active=True,
    )

    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return db_item


@router.get("/loyalty/items", response_model=list[schemas.LoyaltyItemResponse])
def read_loyalty_items(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    active_only: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.LoyaltyItem)

    if tenant_id is not None:
        query = query.filter(models.LoyaltyItem.store_id == tenant_id)

    if active_only is not None:
        query = query.filter(models.LoyaltyItem.is_active == active_only)

    return query.order_by(
        models.LoyaltyItem.id.desc()
    ).offset(skip).limit(limit).all()


@router.get("/loyalty/items/{item_id}", response_model=schemas.LoyaltyItemResponse)
def read_loyalty_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    item = get_loyalty_item_or_404(item_id, db, current_user)

    return item


@router.put("/loyalty/items/{item_id}", response_model=schemas.LoyaltyItemResponse)
def update_loyalty_item(
    item_id: int,
    item_data: schemas.LoyaltyItemUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    item = get_loyalty_item_or_404(item_id, db, current_user)

    update_data = item_data.model_dump(exclude_unset=True)

    selected_unit = (
        update_data.get("unit")
        or update_data.get("quantity_unit")
        or update_data.get("uom")
        or update_data.get("default_unit")
    )

    update_data.pop("quantity_unit", None)
    update_data.pop("uom", None)
    update_data.pop("default_unit", None)

    if selected_unit:
        update_data["unit"] = selected_unit

    if "per_point_amount" in update_data and update_data["per_point_amount"] is not None:
        if update_data["per_point_amount"] <= 0:
            raise HTTPException(
                status_code=400,
                detail="Per point amount must be greater than zero",
            )

    for key, value in update_data.items():
        if hasattr(item, key):
            setattr(item, key, value)

    db.commit()
    db.refresh(item)

    return item


@router.delete("/loyalty/items/{item_id}")
def delete_loyalty_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    item = get_loyalty_item_or_404(item_id, db, current_user)

    item.is_active = False

    db.commit()

    return {
        "message": "Loyalty item deleted successfully",
    }