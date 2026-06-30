from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

from core.security import (
    get_current_user,
    get_current_db_user,
    get_password_hash,
    is_superadmin_role,
    require_roles,
    verify_password,
)

from services.user_service import serialize_user


router = APIRouter(tags=["Users"])


class UserSelfUpdate(BaseModel):
    username: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


# ------------------------------------------------------------------
# CURRENT USER SETTINGS / PROFILE
# IMPORTANT: keep /users/me before /users/{user_id}
# ------------------------------------------------------------------
@router.get("/users/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    db_user = get_current_db_user(db, current_user)

    return serialize_user(db_user, db)


@router.put("/users/me")
def update_my_profile(
    payload: UserSelfUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    db_user = get_current_db_user(db, current_user)

    if getattr(db_user, "is_active", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    if payload.username is not None:
        clean_username = payload.username.strip()

        if not clean_username:
            raise HTTPException(
                status_code=400,
                detail="Username cannot be empty",
            )

        existing_user = db.query(models.User).filter(
            models.User.username == clean_username,
            models.User.id != db_user.id,
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="This username is already used by another user",
            )

        db_user.username = clean_username

    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(
                status_code=400,
                detail="Current password is required",
            )

        if not verify_password(payload.current_password, db_user.password_hash):
            raise HTTPException(
                status_code=400,
                detail="Current password is incorrect",
            )

        if len(payload.new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="New password must be at least 6 characters",
            )

        db_user.password_hash = get_password_hash(payload.new_password)

    db.commit()
    db.refresh(db_user)

    return {
        "message": "Profile updated successfully. Please login again if username was changed.",
        "user": serialize_user(db_user, db),
    }


# ------------------------------------------------------------------
# USER & ROLE MANAGEMENT
# ------------------------------------------------------------------
@router.post("/superadmin/create-client/")
def create_client(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin"])

    if user.store_id is None:
        raise HTTPException(
            status_code=400,
            detail="Store ID is required",
        )

    store = db.query(models.Store).filter(
        models.Store.id == user.store_id
    ).first()

    if not store:
        raise HTTPException(
            status_code=404,
            detail="Store not found",
        )

    existing_user = db.query(models.User).filter(
        models.User.username == user.username
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username already exists",
        )

    db_user = models.User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        role="Admin",
        store_id=user.store_id,
    )

    if hasattr(db_user, "is_active"):
        db_user.is_active = True

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {
        "message": f"Client '{user.username}' successfully assigned as Admin to Store #{user.store_id}",
        "id": db_user.id,
        "user_id": db_user.id,
        "username": db_user.username,
        "role": db_user.role,
        "store_id": db_user.store_id,
        "store_name": store.name,
        "is_active": getattr(db_user, "is_active", True),
    }


@router.get("/superadmin/users")
@router.get("/users/all/")
@router.get("/users/")
@router.get("/users")
def get_all_users_for_superadmin(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin"])

    users = db.query(models.User).order_by(models.User.id.desc()).all()

    return [
        serialize_user(user, db)
        for user in users
    ]


@router.put("/superadmin/users/{user_id}")
@router.put("/users/{user_id}")
def update_admin_user_by_superadmin(
    user_id: int,
    update_data: schemas.UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin"])

    superadmin = get_current_db_user(db, current_user)

    if not verify_password(update_data.superadmin_password, superadmin.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect SuperAdmin password",
        )

    target_user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if target_user.id == superadmin.id or is_superadmin_role(target_user.role):
        raise HTTPException(
            status_code=400,
            detail="Use SuperAdmin credential update section for SuperAdmin account",
        )

    if update_data.new_username:
        existing = db.query(models.User).filter(
            models.User.username == update_data.new_username,
            models.User.id != target_user.id,
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Username already taken",
            )

        target_user.username = update_data.new_username

    if update_data.new_password:
        if len(update_data.new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="New password must be at least 6 characters",
            )

        target_user.password_hash = get_password_hash(update_data.new_password)

    if hasattr(update_data, "is_active") and update_data.is_active is not None:
        if hasattr(target_user, "is_active"):
            target_user.is_active = update_data.is_active

    db.commit()
    db.refresh(target_user)

    return {
        "message": "Admin user updated successfully",
        "user": serialize_user(target_user, db),
    }


@router.delete("/superadmin/users/{user_id}")
@router.delete("/users/{user_id}")
def delete_admin_user_by_superadmin(
    user_id: int,
    delete_data: schemas.UserDeleteRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin"])

    superadmin = get_current_db_user(db, current_user)

    if not verify_password(delete_data.superadmin_password, superadmin.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect SuperAdmin password",
        )

    target_user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if target_user.id == superadmin.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account",
        )

    username = target_user.username

    db.delete(target_user)
    db.commit()

    return {
        "message": f"User '{username}' deleted successfully",
    }


@router.put("/superadmin/update-credentials")
def update_superadmin_credentials(
    data: schemas.SuperAdminCredentialUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin"])

    superadmin = get_current_db_user(db, current_user)

    if not verify_password(data.current_password, superadmin.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    if data.new_username:
        existing_user = db.query(models.User).filter(
            models.User.username == data.new_username,
            models.User.id != superadmin.id,
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Username already exists",
            )

        superadmin.username = data.new_username

    if data.new_password:
        if len(data.new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="New password must be at least 6 characters",
            )

        superadmin.password_hash = get_password_hash(data.new_password)

    db.commit()
    db.refresh(superadmin)

    return {
        "message": "SuperAdmin credentials updated successfully. Please login again.",
        "username": superadmin.username,
        "role": superadmin.role,
    }


@router.post("/admin/create-staff/")
def create_staff(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["Admin"])

    staff_count = db.query(models.User).filter(
        models.User.store_id == current_user["store_id"],
        models.User.role == "Staff",
    ).count()

    if staff_count >= 2:
        raise HTTPException(
            status_code=400,
            detail="Staff limit reached. You can only assign 2 staff members to your store.",
        )

    existing_user = db.query(models.User).filter(
        models.User.username == user.username
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username already exists",
        )

    db_user = models.User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        role="Staff",
        store_id=current_user["store_id"],
    )

    if hasattr(db_user, "is_active"):
        db_user.is_active = True

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {
        "message": f"Staff '{user.username}' created successfully. ({staff_count + 1}/2 slots used)",
        "id": db_user.id,
        "username": db_user.username,
        "role": db_user.role,
        "store_id": db_user.store_id,
        "is_active": getattr(db_user, "is_active", True),
    }