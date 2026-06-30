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

from services.customer_service import (
    get_customer_or_404,
    set_if_model_has_attr,
)


router = APIRouter(tags=["Customers"])


# ------------------------------------------------------------------
# CUSTOMER DIRECTORY ROUTES
# ------------------------------------------------------------------
@router.post("/customers/", response_model=schemas.CustomerResponse)
def create_customer(
    customer: schemas.CustomerCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    store_id = resolve_store_id(customer.store_id, current_user, db)

    existing_customer = db.query(models.Customer).filter(
        models.Customer.phone_number == customer.phone_number
    ).first()

    if existing_customer:
        raise HTTPException(
            status_code=400,
            detail="Customer with this phone number already exists",
        )

    db_customer = models.Customer(
        store_id=store_id,
        name=customer.name,
        phone_number=customer.phone_number,
        points_balance=customer.points_balance,
    )

    optional_customer_fields = [
        "address",
        "aadhaar_number",
        "pan_number",
        "bank_account_number",
        "bank_name",
        "ifsc_code",
        "is_active",
    ]

    for field in optional_customer_fields:
        if field == "ifsc_code":
            value = customer.ifsc_code.upper() if customer.ifsc_code else None
        elif field == "pan_number":
            value = customer.pan_number.upper() if customer.pan_number else None
        elif field == "is_active":
            value = True
        else:
            value = getattr(customer, field, None)

        set_if_model_has_attr(db_customer, field, value)

    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)

    return db_customer


@router.get("/customers/", response_model=list[schemas.CustomerResponse])
def read_customers(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    active_only: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.Customer)

    if tenant_id is not None:
        query = query.filter(models.Customer.store_id == tenant_id)

    if active_only is not None and hasattr(models.Customer, "is_active"):
        query = query.filter(models.Customer.is_active == active_only)

    return query.order_by(
        models.Customer.id.desc()
    ).offset(skip).limit(limit).all()


@router.get("/customers/{customer_id}", response_model=schemas.CustomerResponse)
def read_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    customer = get_customer_or_404(customer_id, db, current_user)

    return customer


@router.put("/customers/{customer_id}", response_model=schemas.CustomerResponse)
def update_customer(
    customer_id: int,
    customer_data: schemas.CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    customer = get_customer_or_404(customer_id, db, current_user)

    update_data = customer_data.model_dump(exclude_unset=True)

    if "phone_number" in update_data:
        existing_customer = db.query(models.Customer).filter(
            models.Customer.phone_number == update_data["phone_number"],
            models.Customer.id != customer_id,
        ).first()

        if existing_customer:
            raise HTTPException(
                status_code=400,
                detail="Another customer already uses this phone number",
            )

    for key, value in update_data.items():
        setattr(customer, key, value)

    db.commit()
    db.refresh(customer)

    return customer


@router.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    customer = get_customer_or_404(customer_id, db, current_user)

    if hasattr(customer, "is_active"):
        customer.is_active = False
        db.commit()
    else:
        db.delete(customer)
        db.commit()

    return {
        "message": "Customer deleted successfully",
    }