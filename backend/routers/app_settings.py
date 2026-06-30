from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
import schemas

from core.security import (
    get_current_db_user,
    get_current_user,
    get_tenant_scope,
    require_roles,
    verify_password,
)


router = APIRouter(tags=["App Settings"])


# ------------------------------------------------------------------
# AMOUNT ASSIGNMENT / POINT VALUE ROUTES
# ------------------------------------------------------------------
@router.get("/settings/point-value")
def get_point_value(
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    setting = db.execute(
        text("""
            SELECT setting_value
            FROM app_settings
            WHERE setting_key = 'point_value_rupees'
            AND (
                (:store_id IS NULL AND store_id IS NULL)
                OR store_id = :store_id
            )
            ORDER BY id DESC
            LIMIT 1
        """),
        {"store_id": tenant_id},
    ).fetchone()

    point_value = float(setting[0]) if setting else 1.0

    return {
        "point_value_rupees": point_value,
        "message": f"1 point = ₹{point_value}",
    }


@router.put("/settings/point-value")
def update_point_value(
    data: schemas.PointValueUpdate,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    if data.point_value_rupees <= 0:
        raise HTTPException(
            status_code=400,
            detail="Point value must be greater than zero",
        )

    db_user = get_current_db_user(db, current_user)

    if not verify_password(data.password, db_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect password",
        )

    tenant_id = get_tenant_scope(current_user, store_id)

    existing = db.execute(
        text("""
            SELECT id
            FROM app_settings
            WHERE setting_key = 'point_value_rupees'
            AND (
                (:store_id IS NULL AND store_id IS NULL)
                OR store_id = :store_id
            )
            ORDER BY id DESC
            LIMIT 1
        """),
        {"store_id": tenant_id},
    ).fetchone()

    if existing:
        db.execute(
            text("""
                UPDATE app_settings
                SET setting_value = :setting_value,
                    updated_at = NOW()
                WHERE id = :id
            """),
            {
                "setting_value": str(data.point_value_rupees),
                "id": existing[0],
            },
        )
    else:
        db.execute(
            text("""
                INSERT INTO app_settings (store_id, setting_key, setting_value)
                VALUES (:store_id, 'point_value_rupees', :setting_value)
            """),
            {
                "store_id": tenant_id,
                "setting_value": str(data.point_value_rupees),
            },
        )

    db.commit()

    return {
        "message": "Point value updated successfully",
        "point_value_rupees": data.point_value_rupees,
        "display": f"1 point = ₹{data.point_value_rupees}",
    }