from sqlalchemy.orm import Session

import models


def serialize_user(user, db: Session):
    store_name = None

    if user.store_id:
        store = db.query(models.Store).filter(
            models.Store.id == user.store_id
        ).first()

        if store:
            store_name = store.name

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "store_id": user.store_id,
        "store_name": store_name,
        "is_active": getattr(user, "is_active", True),
        "created_at": str(getattr(user, "created_at", "")) if getattr(user, "created_at", None) else None,
    }