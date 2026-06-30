import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import models


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")


SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is required")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="superadmin/token")


def normalize_role(role: Optional[str]) -> str:
    if not role:
        return ""

    return str(role).lower().replace("-", "").replace("_", "").replace(" ", "")


def is_superadmin_role(role: Optional[str]) -> bool:
    return normalize_role(role) == "superadmin"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        username = payload.get("sub")
        role = payload.get("role")
        store_id = payload.get("store_id")

        if username is None or role is None:
            raise credentials_exception

        return {
            "username": username,
            "role": role,
            "store_id": store_id,
        }

    except JWTError:
        raise credentials_exception


def require_roles(current_user: dict, allowed_roles: list[str]) -> None:
    current_role = normalize_role(current_user.get("role"))
    allowed_roles_normalized = [normalize_role(role) for role in allowed_roles]

    if current_role not in allowed_roles_normalized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )


def get_current_db_user(db: Session, current_user: dict):
    user = db.query(models.User).filter(
        models.User.username == current_user["username"]
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current user not found",
        )

    return user


def get_tenant_scope(
    current_user: dict,
    store_id_override: Optional[int] = None,
):
    if is_superadmin_role(current_user.get("role")):
        return store_id_override

    return current_user["store_id"]


def resolve_store_id(
    requested_store_id: Optional[int],
    current_user: dict,
    db: Session,
):
    if is_superadmin_role(current_user.get("role")):
        store_id = requested_store_id
    else:
        store_id = current_user["store_id"]

    if store_id is None:
        raise HTTPException(
            status_code=400,
            detail="Store ID is required",
        )

    store = db.query(models.Store).filter(
        models.Store.id == store_id
    ).first()

    if not store:
        raise HTTPException(
            status_code=404,
            detail="Store not found",
        )

    return store_id


def check_store_access(current_user: dict, object_store_id: Optional[int]) -> None:
    if is_superadmin_role(current_user.get("role")):
        return

    if object_store_id != current_user["store_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )