from fastapi import HTTPException
from sqlalchemy.orm import Session

import models
from core.security import check_store_access


def set_if_model_has_attr(model_object, field_name: str, value):
    if hasattr(model_object, field_name):
        setattr(model_object, field_name, value)


def get_customer_or_404(
    customer_id: int,
    db: Session,
    current_user: dict,
    for_update: bool = False,
):
    query = db.query(models.Customer).filter(
        models.Customer.id == customer_id
    )

    if for_update:
        query = query.with_for_update()

    customer = query.first()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    check_store_access(current_user, customer.store_id)

    return customer