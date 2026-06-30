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


router = APIRouter(tags=["Stores"])


def set_if_model_has_attr(model_object, field_name: str, value):
    if hasattr(model_object, field_name):
        setattr(model_object, field_name, value)


# ------------------------------------------------------------------
# STORE ROUTES
# ------------------------------------------------------------------
@router.post("/stores/", response_model=schemas.StoreResponse)
def create_store(
    store: schemas.StoreCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin"])

    store_data = store.model_dump(exclude_unset=True)

    db_store = models.Store(
        name=store_data.get("name"),
        business_type=store_data.get("business_type"),
    )

    optional_store_fields = [
        "owner_name",
        "owner_phone",
        "owner_email",
        "address",
        "city",
        "state",
        "pincode",
        "is_active",
    ]

    for field in optional_store_fields:
        if field in store_data:
            set_if_model_has_attr(db_store, field, store_data.get(field))

    db.add(db_store)
    db.commit()
    db.refresh(db_store)

    return db_store


@router.get("/stores/", response_model=list[schemas.StoreResponse])
def read_stores(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.Store)

    if tenant_id is not None:
        query = query.filter(models.Store.id == tenant_id)

    return query.order_by(
        models.Store.id.desc()
    ).offset(skip).limit(limit).all()


@router.get("/stores/{store_id}", response_model=schemas.StoreResponse)
def read_store_by_id(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin"])

    store = db.query(models.Store).filter(
        models.Store.id == store_id
    ).first()

    if not store:
        raise HTTPException(
            status_code=404,
            detail="Store not found",
        )

    return store


@router.put("/stores/{store_id}", response_model=schemas.StoreResponse)
def update_store(
    store_id: int,
    store_data: schemas.StoreUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin"])

    store = db.query(models.Store).filter(
        models.Store.id == store_id
    ).first()

    if not store:
        raise HTTPException(
            status_code=404,
            detail="Store not found",
        )

    update_data = store_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        if hasattr(store, key):
            setattr(store, key, value)

    db.commit()
    db.refresh(store)

    return store