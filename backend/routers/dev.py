import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models

from core.security import get_password_hash


router = APIRouter(tags=["Development"])


# ------------------------------------------------------------------
# PROTECTED DEV ROUTE
# ------------------------------------------------------------------
@router.post("/dev/create-superadmin/")
def create_initial_superadmin(
    username: str,
    password: str,
    db: Session = Depends(get_db),
):
    enable_dev_superadmin = os.getenv("ENABLE_DEV_SUPERADMIN", "false").lower()

    if enable_dev_superadmin != "true":
        raise HTTPException(
            status_code=403,
            detail="This development route is disabled.",
        )

    existing = db.query(models.User).filter(
        models.User.username == username
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="User already exists",
        )

    db_user = models.User(
        username=username,
        password_hash=get_password_hash(password),
        role="SuperAdmin",
        store_id=None,
    )

    if hasattr(db_user, "is_active"):
        db_user.is_active = True

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {
        "message": f"SuperAdmin '{username}' created. You can now login from /superadmin only.",
        "id": db_user.id,
        "username": db_user.username,
        "role": db_user.role,
    }