from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

from core.security import (
    create_access_token,
    get_current_user,
    is_superadmin_role,
    verify_password,
)

from core.rate_limit import limiter


router = APIRouter(tags=["Authentication"])


def validate_subscription(user: models.User, db: Session) -> None:
    """
    Checks if a tenant/merchant user's subscription has expired.
    If expired, marks the user inactive in the database and blocks access.
    """
    subscription_end = getattr(user, "subscription_end", None)
    if not subscription_end:
        return

    # Handle both string ('YYYY-MM-DD') and date/datetime objects from SQLAlchemy
    if isinstance(subscription_end, str):
        try:
            exp_date = datetime.strptime(subscription_end.strip(), "%Y-%m-%d").date()
        except ValueError:
            return
    elif isinstance(subscription_end, datetime):
        exp_date = subscription_end.date()
    elif isinstance(subscription_end, date):
        exp_date = subscription_end
    else:
        return

    current_date = datetime.utcnow().date()

    if current_date > exp_date:
        if getattr(user, "is_active", True):
            user.is_active = False
            db.commit()
            db.refresh(user)

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your subscription plan has expired. Please contact SuperAdmin to renew your license.",
        )


@router.post("/token", response_model=schemas.Token)
@limiter.limit("5/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .filter(models.User.username == form_data.username)
        .first()
    )

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if is_superadmin_role(user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin cannot login from normal login page",
        )

    # 1. Validate subscription expiry before proceeding
    validate_subscription(user, db)

    # 2. Check general active state
    if getattr(user, "is_active", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    access_token = create_access_token(
        data={
            "sub": user.username,
            "store_id": user.store_id,
            "role": user.role,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/superadmin/token", response_model=schemas.Token)
@limiter.limit("5/minute")
def superadmin_login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .filter(models.User.username == form_data.username)
        .first()
    )

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect SuperAdmin username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if getattr(user, "is_active", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    if not is_superadmin_role(user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperAdmin can login here",
        )

    access_token = create_access_token(
        data={
            "sub": user.username,
            "store_id": user.store_id,
            "role": user.role,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me")
def read_me(
    current_user: dict = Depends(get_current_user),
):
    return current_user