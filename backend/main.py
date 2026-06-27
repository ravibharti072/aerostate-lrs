import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from passlib.context import CryptContext
from jose import JWTError, jwt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel

from database import engine, Base, get_db
import models
import schemas


# ------------------------------------------------------------------
# DATABASE INIT + TEMP MIGRATIONS
# ------------------------------------------------------------------
Base.metadata.create_all(bind=engine)

with engine.begin() as connection:

    # REWARD ENTRY table migration
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS reward_entries (
            id SERIAL PRIMARY KEY,
            store_id INTEGER REFERENCES stores(id),
            customer_id INTEGER NOT NULL REFERENCES customers(id),
            total_points INTEGER NOT NULL DEFAULT 0,
            note VARCHAR,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """))

    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS reward_entry_items (
            id SERIAL PRIMARY KEY,
            reward_entry_id INTEGER NOT NULL REFERENCES reward_entries(id) ON DELETE CASCADE,
            loyalty_item_id INTEGER NOT NULL REFERENCES loyalty_items(id),
            unit VARCHAR NOT NULL,
            quantity DOUBLE PRECISION NOT NULL,
            points_per_unit DOUBLE PRECISION NOT NULL DEFAULT 0,
            total_points INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """))

    connection.execute(text("""
        ALTER TABLE reward_entry_items
        ADD COLUMN IF NOT EXISTS point_transaction_id INTEGER REFERENCES point_transactions(id);
    """))

    # USERS table migration
    connection.execute(text("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    """))

    connection.execute(text("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    """))

    # STORES table migration for client/shop details
    connection.execute(text("""
        ALTER TABLE stores
        ADD COLUMN IF NOT EXISTS owner_name VARCHAR;
    """))

    connection.execute(text("""
        ALTER TABLE stores
        ADD COLUMN IF NOT EXISTS owner_phone VARCHAR;
    """))

    connection.execute(text("""
        ALTER TABLE stores
        ADD COLUMN IF NOT EXISTS owner_email VARCHAR;
    """))

    connection.execute(text("""
        ALTER TABLE stores
        ADD COLUMN IF NOT EXISTS address VARCHAR;
    """))

    connection.execute(text("""
        ALTER TABLE stores
        ADD COLUMN IF NOT EXISTS city VARCHAR;
    """))

    connection.execute(text("""
        ALTER TABLE stores
        ADD COLUMN IF NOT EXISTS state VARCHAR;
    """))

    connection.execute(text("""
        ALTER TABLE stores
        ADD COLUMN IF NOT EXISTS pincode VARCHAR;
    """))

    connection.execute(text("""
        ALTER TABLE stores
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    """))

    connection.execute(text("""
        ALTER TABLE stores
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    """))

    # CUSTOMERS table migration
    connection.execute(text("""
        ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS address VARCHAR;
    """))

    connection.execute(text("""
        ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR;
    """))

    connection.execute(text("""
        ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS bank_name VARCHAR;
    """))

    connection.execute(text("""
        ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR;
    """))

    connection.execute(text("""
        ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    """))

    connection.execute(text("""
        ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    """))

    # APP SETTINGS table migration
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS app_settings (
            id SERIAL PRIMARY KEY,
            store_id INTEGER REFERENCES stores(id),
            setting_key VARCHAR NOT NULL,
            setting_value VARCHAR NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """))


# ------------------------------------------------------------------
# APP INIT
# ------------------------------------------------------------------
app = FastAPI(title="Aerostate - Loyalty Program API")


# ------------------------------------------------------------------
# RATE LIMITER
# ------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ------------------------------------------------------------------
# CORS
# ------------------------------------------------------------------
ALLOWED_ORIGINS_ENV = os.getenv("ALLOWED_ORIGINS", "").strip()

if not ALLOWED_ORIGINS_ENV:
    raise RuntimeError(
        "ALLOWED_ORIGINS is missing. Please set your frontend domain in environment variables."
    )

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in ALLOWED_ORIGINS_ENV.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------
# SECURITY CONFIGURATION
# ------------------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is required")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# ------------------------------------------------------------------
# SECURITY HELPERS
# ------------------------------------------------------------------
def normalize_role(role: Optional[str]) -> str:
    if not role:
        return ""

    return str(role).lower().replace("-", "").replace("_", "").replace(" ", "")


def is_superadmin_role(role: Optional[str]) -> bool:
    return normalize_role(role) == "superadmin"


def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer"
        },
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
            "store_id": store_id
        }

    except JWTError:
        raise credentials_exception


def require_roles(current_user: dict, allowed_roles: list[str]):
    current_role = normalize_role(current_user.get("role"))
    allowed_roles_normalized = [normalize_role(role) for role in allowed_roles]

    if current_role not in allowed_roles_normalized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )


def get_current_db_user(db: Session, current_user: dict):
    user = db.query(models.User).filter(
        models.User.username == current_user["username"]
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current user not found"
        )

    return user


def get_tenant_scope(
    current_user: dict,
    store_id_override: Optional[int] = None
):
    if is_superadmin_role(current_user.get("role")):
        return store_id_override

    return current_user["store_id"]


def resolve_store_id(
    requested_store_id: Optional[int],
    current_user: dict,
    db: Session
):
    if is_superadmin_role(current_user.get("role")):
        store_id = requested_store_id
    else:
        store_id = current_user["store_id"]

    if store_id is None:
        raise HTTPException(
            status_code=400,
            detail="Store ID is required"
        )

    store = db.query(models.Store).filter(
        models.Store.id == store_id
    ).first()

    if not store:
        raise HTTPException(
            status_code=404,
            detail="Store not found"
        )

    return store_id


def check_store_access(current_user: dict, object_store_id: Optional[int]):
    if is_superadmin_role(current_user.get("role")):
        return

    if object_store_id != current_user["store_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )


def set_if_model_has_attr(model_object, field_name: str, value):
    if hasattr(model_object, field_name):
        setattr(model_object, field_name, value)


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


def get_customer_or_404(
    customer_id: int,
    db: Session,
    current_user: dict,
    for_update: bool = False
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
            detail="Customer not found"
        )

    check_store_access(current_user, customer.store_id)

    return customer


def get_loyalty_item_or_404(
    item_id: int,
    db: Session,
    current_user: dict
):
    item = db.query(models.LoyaltyItem).filter(
        models.LoyaltyItem.id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Loyalty item not found"
        )

    check_store_access(current_user, item.store_id)

    return item


# ------------------------------------------------------------------
# ROOT / HEALTH
# ------------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "project": "Aerostate - Loyalty Program",
        "status": "online",
        "version": "2.1.0"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }


# ------------------------------------------------------------------
# AUTHENTICATION
# ------------------------------------------------------------------
@app.post("/token", response_model=schemas.Token)
@limiter.limit("5/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.username == form_data.username
    ).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if getattr(user, "is_active", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    if is_superadmin_role(user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin cannot login from normal login page"
        )

    access_token = create_access_token(
        data={
            "sub": user.username,
            "store_id": user.store_id,
            "role": user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.post("/superadmin/token", response_model=schemas.Token)
@limiter.limit("5/minute")
def superadmin_login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.username == form_data.username
    ).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect SuperAdmin username or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if getattr(user, "is_active", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    if not is_superadmin_role(user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperAdmin can login here"
        )

    access_token = create_access_token(
        data={
            "sub": user.username,
            "store_id": user.store_id,
            "role": user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.get("/me")
def read_me(
    current_user: dict = Depends(get_current_user)
):
    return current_user


# ------------------------------------------------------------------
# CURRENT USER SETTINGS / PROFILE
# IMPORTANT: keep /users/me before /users/{user_id}
# ------------------------------------------------------------------
class UserSelfUpdate(BaseModel):
    username: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


@app.get("/users/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_user = get_current_db_user(db, current_user)

    return serialize_user(db_user, db)


@app.put("/users/me")
def update_my_profile(
    payload: UserSelfUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_user = get_current_db_user(db, current_user)

    if getattr(db_user, "is_active", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    if payload.username is not None:
        clean_username = payload.username.strip()

        if not clean_username:
            raise HTTPException(
                status_code=400,
                detail="Username cannot be empty"
            )

        existing_user = db.query(models.User).filter(
            models.User.username == clean_username,
            models.User.id != db_user.id
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="This username is already used by another user"
            )

        db_user.username = clean_username

    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(
                status_code=400,
                detail="Current password is required"
            )

        if not verify_password(payload.current_password, db_user.password_hash):
            raise HTTPException(
                status_code=400,
                detail="Current password is incorrect"
            )

        if len(payload.new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="New password must be at least 6 characters"
            )

        db_user.password_hash = get_password_hash(payload.new_password)

    db.commit()
    db.refresh(db_user)

    return {
        "message": "Profile updated successfully. Please login again if username was changed.",
        "user": serialize_user(db_user, db)
    }


# ------------------------------------------------------------------
# USER & ROLE MANAGEMENT
# ------------------------------------------------------------------
@app.post("/superadmin/create-client/")
def create_client(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin"])

    if user.store_id is None:
        raise HTTPException(
            status_code=400,
            detail="Store ID is required"
        )

    store = db.query(models.Store).filter(
        models.Store.id == user.store_id
    ).first()

    if not store:
        raise HTTPException(
            status_code=404,
            detail="Store not found"
        )

    existing_user = db.query(models.User).filter(
        models.User.username == user.username
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    db_user = models.User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        role="Admin",
        store_id=user.store_id
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


@app.get("/superadmin/users")
@app.get("/users/all/")
@app.get("/users/")
@app.get("/users")
def get_all_users_for_superadmin(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin"])

    users = db.query(models.User).order_by(models.User.id.desc()).all()

    return [
        serialize_user(user, db)
        for user in users
    ]


@app.put("/superadmin/users/{user_id}")
@app.put("/users/{user_id}")
def update_admin_user_by_superadmin(
    user_id: int,
    update_data: schemas.UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin"])

    superadmin = get_current_db_user(db, current_user)

    if not verify_password(update_data.superadmin_password, superadmin.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect SuperAdmin password"
        )

    target_user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if target_user.id == superadmin.id or is_superadmin_role(target_user.role):
        raise HTTPException(
            status_code=400,
            detail="Use SuperAdmin credential update section for SuperAdmin account"
        )

    if update_data.new_username:
        existing = db.query(models.User).filter(
            models.User.username == update_data.new_username,
            models.User.id != target_user.id
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Username already taken"
            )

        target_user.username = update_data.new_username

    if update_data.new_password:
        if len(update_data.new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="New password must be at least 6 characters"
            )

        target_user.password_hash = get_password_hash(update_data.new_password)

    if hasattr(update_data, "is_active") and update_data.is_active is not None:
        if hasattr(target_user, "is_active"):
            target_user.is_active = update_data.is_active

    db.commit()
    db.refresh(target_user)

    return {
        "message": "Admin user updated successfully",
        "user": serialize_user(target_user, db)
    }


@app.delete("/superadmin/users/{user_id}")
@app.delete("/users/{user_id}")
def delete_admin_user_by_superadmin(
    user_id: int,
    delete_data: schemas.UserDeleteRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin"])

    superadmin = get_current_db_user(db, current_user)

    if not verify_password(delete_data.superadmin_password, superadmin.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect SuperAdmin password"
        )

    target_user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if target_user.id == superadmin.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account"
        )


    db.delete(target_user)
    db.commit()

    return {
        "message": f"User '{target_user.username}' deleted successfully"
    }


@app.put("/superadmin/update-credentials")
def update_superadmin_credentials(
    data: schemas.SuperAdminCredentialUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin"])

    superadmin = get_current_db_user(db, current_user)

    if not verify_password(data.current_password, superadmin.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    if data.new_username:
        existing_user = db.query(models.User).filter(
            models.User.username == data.new_username,
            models.User.id != superadmin.id
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Username already exists"
            )

        superadmin.username = data.new_username

    if data.new_password:
        if len(data.new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="New password must be at least 6 characters"
            )

        superadmin.password_hash = get_password_hash(data.new_password)

    db.commit()
    db.refresh(superadmin)

    return {
        "message": "SuperAdmin credentials updated successfully. Please login again.",
        "username": superadmin.username,
        "role": superadmin.role,
    }


@app.post("/admin/create-staff/")
def create_staff(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["Admin"])

    staff_count = db.query(models.User).filter(
        models.User.store_id == current_user["store_id"],
        models.User.role == "Staff"
    ).count()

    if staff_count >= 2:
        raise HTTPException(
            status_code=400,
            detail="Staff limit reached. You can only assign 2 staff members to your store."
        )

    existing_user = db.query(models.User).filter(
        models.User.username == user.username
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    db_user = models.User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        role="Staff",
        store_id=current_user["store_id"]
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


# ------------------------------------------------------------------
# STORE ROUTES
# ------------------------------------------------------------------
@app.post("/stores/", response_model=schemas.StoreResponse)
def create_store(
    store: schemas.StoreCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin"])

    store_data = store.model_dump(exclude_unset=True)

    db_store = models.Store(
        name=store_data.get("name"),
        business_type=store_data.get("business_type")
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


@app.get("/stores/", response_model=list[schemas.StoreResponse])
def read_stores(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.Store)

    if tenant_id is not None:
        query = query.filter(models.Store.id == tenant_id)

    return query.order_by(
        models.Store.id.desc()
    ).offset(skip).limit(limit).all()


@app.get("/stores/{store_id}", response_model=schemas.StoreResponse)
def read_store_by_id(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin"])

    store = db.query(models.Store).filter(
        models.Store.id == store_id
    ).first()

    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    return store


@app.put("/stores/{store_id}", response_model=schemas.StoreResponse)
def update_store(
    store_id: int,
    store_data: schemas.StoreUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin"])

    store = db.query(models.Store).filter(
        models.Store.id == store_id
    ).first()

    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    update_data = store_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        if hasattr(store, key):
            setattr(store, key, value)

    db.commit()
    db.refresh(store)

    return store


# ------------------------------------------------------------------
# CUSTOMER DIRECTORY ROUTES
# ------------------------------------------------------------------
@app.post("/customers/", response_model=schemas.CustomerResponse)
def create_customer(
    customer: schemas.CustomerCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    store_id = resolve_store_id(customer.store_id, current_user, db)

    existing_customer = db.query(models.Customer).filter(
        models.Customer.phone_number == customer.phone_number
    ).first()

    if existing_customer:
        raise HTTPException(
            status_code=400,
            detail="Customer with this phone number already exists"
        )

    db_customer = models.Customer(
        store_id=store_id,
        name=customer.name,
        phone_number=customer.phone_number,
        points_balance=customer.points_balance
    )

    optional_customer_fields = [
        "address",
        "bank_account_number",
        "bank_name",
        "ifsc_code",
        "is_active",
    ]

    for field in optional_customer_fields:
        if field == "ifsc_code":
            value = customer.ifsc_code.upper() if customer.ifsc_code else None
        elif field == "is_active":
            value = True
        else:
            value = getattr(customer, field, None)

        set_if_model_has_attr(db_customer, field, value)

    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)

    return db_customer


@app.get("/customers/", response_model=list[schemas.CustomerResponse])
def read_customers(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    active_only: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
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


@app.get("/customers/{customer_id}", response_model=schemas.CustomerResponse)
def read_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    customer = get_customer_or_404(customer_id, db, current_user)

    return customer


@app.put("/customers/{customer_id}", response_model=schemas.CustomerResponse)
def update_customer(
    customer_id: int,
    customer_data: schemas.CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    customer = get_customer_or_404(customer_id, db, current_user)

    update_data = customer_data.model_dump(exclude_unset=True)

    if "phone_number" in update_data:
        existing_customer = db.query(models.Customer).filter(
            models.Customer.phone_number == update_data["phone_number"],
            models.Customer.id != customer_id
        ).first()

        if existing_customer:
            raise HTTPException(
                status_code=400,
                detail="Another customer already uses this phone number"
            )

    for key, value in update_data.items():
        setattr(customer, key, value)

    db.commit()
    db.refresh(customer)

    return customer


@app.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
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
        "message": "Customer deleted successfully"
    }


# ------------------------------------------------------------------
# LOYALTY ITEM MASTER ROUTES
# ------------------------------------------------------------------
@app.post("/loyalty/items", response_model=schemas.LoyaltyItemResponse)
def create_loyalty_item(
    item: schemas.LoyaltyItemCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    store_id = resolve_store_id(item.store_id, current_user, db)

    if item.per_point_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Per point amount must be greater than zero"
        )

    db_item = models.LoyaltyItem(
        store_id=store_id,
        item_name=item.item_name,
        category=item.category,
        sku=item.sku,
        per_point_amount=item.per_point_amount,
        is_active=True
    )

    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return db_item


@app.get("/loyalty/items", response_model=list[schemas.LoyaltyItemResponse])
def read_loyalty_items(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    active_only: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
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


@app.get("/loyalty/items/{item_id}", response_model=schemas.LoyaltyItemResponse)
def read_loyalty_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    item = get_loyalty_item_or_404(item_id, db, current_user)

    return item


@app.put("/loyalty/items/{item_id}", response_model=schemas.LoyaltyItemResponse)
def update_loyalty_item(
    item_id: int,
    item_data: schemas.LoyaltyItemUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    item = get_loyalty_item_or_404(item_id, db, current_user)

    update_data = item_data.model_dump(exclude_unset=True)

    if "per_point_amount" in update_data and update_data["per_point_amount"] is not None:
        if update_data["per_point_amount"] <= 0:
            raise HTTPException(
                status_code=400,
                detail="Per point amount must be greater than zero"
            )

    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)

    return item


@app.delete("/loyalty/items/{item_id}")
def delete_loyalty_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    item = get_loyalty_item_or_404(item_id, db, current_user)

    item.is_active = False

    db.commit()

    return {
        "message": "Loyalty item deleted successfully"
    }


# ------------------------------------------------------------------
# POINT ASSIGNMENT ROUTES
# ------------------------------------------------------------------
@app.post("/points/assign", response_model=schemas.PointTransactionResponse)
def assign_points_from_item(
    request: schemas.PointAssignRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    if request.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Amount must be greater than zero"
        )

    customer = get_customer_or_404(
        request.customer_id,
        db,
        current_user,
        for_update=True
    )

    item = get_loyalty_item_or_404(
        request.loyalty_item_id,
        db,
        current_user
    )

    if getattr(customer, "is_active", True) is False:
        raise HTTPException(
            status_code=400,
            detail="Customer is inactive"
        )

    if item.is_active is False:
        raise HTTPException(
            status_code=400,
            detail="Loyalty item is inactive"
        )

    if customer.store_id != item.store_id:
        raise HTTPException(
            status_code=400,
            detail="Customer and loyalty item must belong to the same store"
        )

    if item.per_point_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid per point amount for this item"
        )

    points = int(request.amount // item.per_point_amount)

    if points <= 0:
        raise HTTPException(
            status_code=400,
            detail="Calculated points is zero. Increase amount or reduce per point amount."
        )

    customer.points_balance += points

    db_transaction = models.PointTransaction(
        store_id=customer.store_id,
        customer_id=customer.id,
        loyalty_item_id=item.id,
        transaction_type="EARN",
        points=points,
        amount=request.amount,
        note=request.note
    )

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return db_transaction


@app.post("/points/manual-add", response_model=schemas.PointTransactionResponse)
def manual_add_points(
    request: schemas.ManualPointRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    if request.points <= 0:
        raise HTTPException(
            status_code=400,
            detail="Points must be greater than zero"
        )

    customer = get_customer_or_404(
        request.customer_id,
        db,
        current_user,
        for_update=True
    )

    if getattr(customer, "is_active", True) is False:
        raise HTTPException(
            status_code=400,
            detail="Customer is inactive"
        )

    customer.points_balance += request.points

    db_transaction = models.PointTransaction(
        store_id=customer.store_id,
        customer_id=customer.id,
        loyalty_item_id=None,
        transaction_type="MANUAL_ADD",
        points=request.points,
        amount=None,
        note=request.note
    )

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return db_transaction


@app.post("/points/manual-deduct", response_model=schemas.PointTransactionResponse)
def manual_deduct_points(
    request: schemas.ManualPointRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    if request.points <= 0:
        raise HTTPException(
            status_code=400,
            detail="Points must be greater than zero"
        )

    customer = get_customer_or_404(
        request.customer_id,
        db,
        current_user,
        for_update=True
    )

    if customer.points_balance < request.points:
        raise HTTPException(
            status_code=400,
            detail="Customer does not have enough points"
        )

    customer.points_balance -= request.points

    db_transaction = models.PointTransaction(
        store_id=customer.store_id,
        customer_id=customer.id,
        loyalty_item_id=None,
        transaction_type="MANUAL_DEDUCT",
        points=request.points,
        amount=None,
        note=request.note
    )

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return db_transaction


@app.get("/points/history", response_model=list[schemas.PointTransactionResponse])
def read_points_history(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.PointTransaction).join(
        models.Customer,
        models.PointTransaction.customer_id == models.Customer.id
    )

    if tenant_id is not None:
        query = query.filter(models.PointTransaction.store_id == tenant_id)

    if customer_id is not None:
        query = query.filter(models.PointTransaction.customer_id == customer_id)

    return query.order_by(
        models.PointTransaction.created_at.desc()
    ).offset(skip).limit(limit).all()


# ------------------------------------------------------------------
# TRANSACTION HISTORY ROUTES
# Old frontend name: Points History
# New frontend name: Transaction History
# ------------------------------------------------------------------
@app.get("/transactions/")
@app.get("/transactions")
def read_transactions_alias(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.PointTransaction)

    if tenant_id is not None:
        query = query.filter(models.PointTransaction.store_id == tenant_id)

    if customer_id is not None:
        query = query.filter(models.PointTransaction.customer_id == customer_id)

    transactions = query.order_by(
        models.PointTransaction.created_at.desc()
    ).offset(skip).limit(limit).all()

    response = []

    for txn in transactions:
        raw_type = str(txn.transaction_type or "").upper()

        if raw_type in ["EARN", "MANUAL_ADD", "POINTS_CREDIT", "CREDIT"]:
            frontend_type = "POINTS_CREDIT"
        elif raw_type in ["REDEEM", "MANUAL_DEDUCT", "POINTS_DEBIT", "DEBIT"]:
            frontend_type = "POINTS_DEBIT"
        else:
            frontend_type = raw_type

        customer = db.query(models.Customer).filter(
            models.Customer.id == txn.customer_id
        ).first()

        reward_item = db.query(models.RewardEntryItem).filter(
            models.RewardEntryItem.point_transaction_id == txn.id
        ).first()

        reward_entry = None
        loyalty_item = None

        if reward_item:
            reward_entry = db.query(models.RewardEntry).filter(
                models.RewardEntry.id == reward_item.reward_entry_id
            ).first()

            loyalty_item = db.query(models.LoyaltyItem).filter(
                models.LoyaltyItem.id == reward_item.loyalty_item_id
            ).first()

        elif txn.loyalty_item_id:
            loyalty_item = db.query(models.LoyaltyItem).filter(
                models.LoyaltyItem.id == txn.loyalty_item_id
            ).first()

        response.append({
            "id": txn.id,
            "transaction_id": txn.id,
            "point_transaction_id": txn.id,

            "store_id": txn.store_id,
            "customer_id": txn.customer_id,
            "customer_name": customer.name if customer else None,
            "phone_number": customer.phone_number if customer else None,

            "reward_entry_id": reward_entry.id if reward_entry else None,
            "reward_entry_item_id": reward_item.id if reward_item else None,

            "loyalty_item_id": reward_item.loyalty_item_id if reward_item else txn.loyalty_item_id,
            "item_id": reward_item.loyalty_item_id if reward_item else txn.loyalty_item_id,
            "item_name": loyalty_item.item_name if loyalty_item else None,

            "unit": reward_item.unit if reward_item else None,
            "quantity": reward_item.quantity if reward_item else None,
            "points_per_unit": reward_item.points_per_unit if reward_item else None,

            "transaction_type": txn.transaction_type,
            "type": frontend_type,

            "points": txn.points,
            "total_points": txn.points,
            "amount": txn.amount,
            "note": txn.note,
            "description": txn.note,
            "created_at": txn.created_at,
        })

    return response


@app.put("/transactions/reward-entry-items/{reward_entry_item_id}")
def update_reward_entry_item_transaction(
    reward_entry_item_id: int,
    update_data: schemas.RewardEntryItemUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    reward_item = db.query(models.RewardEntryItem).filter(
        models.RewardEntryItem.id == reward_entry_item_id
    ).first()

    if not reward_item:
        raise HTTPException(
            status_code=404,
            detail="Reward entry item not found"
        )

    reward_entry = db.query(models.RewardEntry).filter(
        models.RewardEntry.id == reward_item.reward_entry_id
    ).first()

    if not reward_entry:
        raise HTTPException(
            status_code=404,
            detail="Reward entry not found"
        )

    check_store_access(current_user, reward_entry.store_id)

    customer = get_customer_or_404(
        reward_entry.customer_id,
        db,
        current_user,
        for_update=True
    )

    loyalty_item = get_loyalty_item_or_404(
        update_data.loyalty_item_id,
        db,
        current_user
    )

    if customer.store_id != loyalty_item.store_id:
        raise HTTPException(
            status_code=400,
            detail="Customer and item must belong to the same store"
        )

    if update_data.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero"
        )

    points_per_unit = float(loyalty_item.per_point_amount or 0)

    if points_per_unit <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid points for item '{loyalty_item.item_name}'"
        )

    old_points = int(reward_item.total_points or 0)
    old_loyalty_item_id = reward_item.loyalty_item_id

    new_points = int(round(points_per_unit * update_data.quantity))
    points_difference = new_points - old_points

    new_customer_balance = int(customer.points_balance or 0) + points_difference

    if new_customer_balance < 0:
        raise HTTPException(
            status_code=400,
            detail="This edit will make customer point balance negative"
        )

    transaction = None

    if getattr(reward_item, "point_transaction_id", None):
        transaction = db.query(models.PointTransaction).filter(
            models.PointTransaction.id == reward_item.point_transaction_id
        ).first()

    if not transaction:
        transaction = db.query(models.PointTransaction).filter(
            models.PointTransaction.customer_id == customer.id,
            models.PointTransaction.loyalty_item_id == old_loyalty_item_id,
            models.PointTransaction.transaction_type == "EARN",
            models.PointTransaction.points == old_points
        ).order_by(
            models.PointTransaction.created_at.desc()
        ).first()

    reward_item.loyalty_item_id = loyalty_item.id
    reward_item.unit = update_data.unit
    reward_item.quantity = update_data.quantity
    reward_item.points_per_unit = points_per_unit
    reward_item.total_points = new_points

    customer.points_balance = new_customer_balance

    reward_entry.total_points = sum(
        int(item.total_points or 0)
        for item in reward_entry.items
    )

    note = (
        update_data.note
        or f"Reward Entry - {loyalty_item.item_name} ({update_data.quantity} {update_data.unit})"
    )

    if transaction:
        transaction.store_id = customer.store_id
        transaction.customer_id = customer.id
        transaction.loyalty_item_id = loyalty_item.id
        transaction.transaction_type = "EARN"
        transaction.points = new_points
        transaction.amount = None
        transaction.note = note

        reward_item.point_transaction_id = transaction.id
    else:
        new_transaction = models.PointTransaction(
            store_id=customer.store_id,
            customer_id=customer.id,
            loyalty_item_id=loyalty_item.id,
            transaction_type="EARN",
            points=new_points,
            amount=None,
            note=note
        )

        db.add(new_transaction)
        db.flush()

        reward_item.point_transaction_id = new_transaction.id

    db.commit()
    db.refresh(reward_item)

    return {
        "message": "Transaction updated successfully",
        "reward_entry_item_id": reward_item.id,
        "reward_entry_id": reward_entry.id,
        "customer_id": customer.id,
        "customer_name": customer.name,
        "loyalty_item_id": loyalty_item.id,
        "item_name": loyalty_item.item_name,
        "unit": reward_item.unit,
        "quantity": reward_item.quantity,
        "points_per_unit": reward_item.points_per_unit,
        "total_points": reward_item.total_points,
        "customer_points_balance": customer.points_balance,
    }


@app.put("/transactions/{transaction_id}")
def update_point_transaction(
    transaction_id: int,
    transaction_data: schemas.PointTransactionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    transaction = db.query(models.PointTransaction).filter(
        models.PointTransaction.id == transaction_id
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Point transaction not found"
        )

    reward_item = db.query(models.RewardEntryItem).filter(
        models.RewardEntryItem.point_transaction_id == transaction.id
    ).first()

    if reward_item:
        raise HTTPException(
            status_code=400,
            detail="Reward Entry transactions must be edited by product, unit, and quantity."
        )

    check_store_access(current_user, transaction.store_id)

    old_customer = get_customer_or_404(
        transaction.customer_id,
        db,
        current_user,
        for_update=True
    )

    old_type = str(transaction.transaction_type or "").upper()
    old_points = int(transaction.points or 0)

    if old_type in ["EARN", "MANUAL_ADD", "POINTS_CREDIT", "CREDIT"]:
        old_customer.points_balance = int(old_customer.points_balance or 0) - old_points
    elif old_type in ["REDEEM", "MANUAL_DEDUCT", "POINTS_DEBIT", "DEBIT"]:
        old_customer.points_balance = int(old_customer.points_balance or 0) + old_points

    new_customer = get_customer_or_404(
        transaction_data.customer_id,
        db,
        current_user,
        for_update=True
    )

    if transaction.store_id != new_customer.store_id:
        raise HTTPException(
            status_code=400,
            detail="Transaction and customer must belong to the same store"
        )

    new_points = int(transaction_data.points or 0)

    if new_points <= 0:
        raise HTTPException(
            status_code=400,
            detail="Points must be greater than zero"
        )

    incoming_type = str(
        transaction_data.type or transaction_data.transaction_type or ""
    ).upper()

    if incoming_type in ["POINTS_CREDIT", "CREDIT", "EARN", "MANUAL_ADD"]:
        new_transaction_type = "EARN"
        new_customer.points_balance = int(new_customer.points_balance or 0) + new_points

    elif incoming_type in ["POINTS_DEBIT", "DEBIT", "REDEEM", "MANUAL_DEDUCT"]:
        new_transaction_type = "REDEEM"

        if int(new_customer.points_balance or 0) < new_points:
            if old_type in ["EARN", "MANUAL_ADD", "POINTS_CREDIT", "CREDIT"]:
                old_customer.points_balance = int(old_customer.points_balance or 0) + old_points
            elif old_type in ["REDEEM", "MANUAL_DEDUCT", "POINTS_DEBIT", "DEBIT"]:
                old_customer.points_balance = int(old_customer.points_balance or 0) - old_points

            raise HTTPException(
                status_code=400,
                detail="Customer does not have enough points"
            )

        new_customer.points_balance = int(new_customer.points_balance or 0) - new_points

    else:
        if old_type in ["EARN", "MANUAL_ADD", "POINTS_CREDIT", "CREDIT"]:
            old_customer.points_balance = int(old_customer.points_balance or 0) + old_points
        elif old_type in ["REDEEM", "MANUAL_DEDUCT", "POINTS_DEBIT", "DEBIT"]:
            old_customer.points_balance = int(old_customer.points_balance or 0) - old_points

        raise HTTPException(
            status_code=400,
            detail="Invalid transaction type"
        )

    transaction.customer_id = new_customer.id
    transaction.store_id = new_customer.store_id
    transaction.transaction_type = new_transaction_type
    transaction.points = new_points

    if transaction_data.description is not None:
        transaction.note = transaction_data.description

    if transaction_data.note is not None:
        transaction.note = transaction_data.note

    db.commit()
    db.refresh(transaction)

    return {
        "message": "Point transaction updated successfully",
        "id": transaction.id,
        "customer_id": transaction.customer_id,
        "transaction_type": transaction.transaction_type,
        "type": "POINTS_CREDIT" if transaction.transaction_type == "EARN" else "POINTS_DEBIT",
        "points": transaction.points,
        "note": transaction.note,
        "description": transaction.note,
        "created_at": transaction.created_at,
    }


# ------------------------------------------------------------------
# REWARD ENTRY ROUTES
# ------------------------------------------------------------------
@app.post("/reward-entries/bulk")
@app.post("/reward-entries/bulk/")
def create_bulk_reward_entry(
    reward_data: schemas.RewardEntryBulkCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    customer = get_customer_or_404(
        reward_data.customer_id,
        db,
        current_user,
        for_update=True
    )

    if getattr(customer, "is_active", True) is False:
        raise HTTPException(
            status_code=400,
            detail="Customer is inactive"
        )

    if not reward_data.items or len(reward_data.items) == 0:
        raise HTTPException(
            status_code=400,
            detail="At least one item is required"
        )

    store_id = customer.store_id
    calculated_total_points = 0

    new_reward_entry = models.RewardEntry(
        store_id=store_id,
        customer_id=customer.id,
        total_points=0,
        note=reward_data.note
    )

    db.add(new_reward_entry)
    db.flush()

    for row in reward_data.items:
        loyalty_item = get_loyalty_item_or_404(
            row.loyalty_item_id,
            db,
            current_user
        )

        if getattr(loyalty_item, "is_active", True) is False:
            raise HTTPException(
                status_code=400,
                detail=f"Item '{loyalty_item.item_name}' is inactive"
            )

        if customer.store_id != loyalty_item.store_id:
            raise HTTPException(
                status_code=400,
                detail="Customer and item must belong to the same store"
            )

        if row.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be greater than zero"
            )

        points_per_unit = float(
            loyalty_item.per_point_amount or row.points_per_unit or 0
        )

        if points_per_unit <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid points for item '{loyalty_item.item_name}'"
            )

        total_points = int(round(points_per_unit * row.quantity))

        if total_points <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Calculated points is zero for item '{loyalty_item.item_name}'"
            )

        calculated_total_points += total_points

        reward_entry_item = models.RewardEntryItem(
            reward_entry_id=new_reward_entry.id,
            loyalty_item_id=loyalty_item.id,
            unit=row.unit,
            quantity=row.quantity,
            points_per_unit=points_per_unit,
            total_points=total_points
        )

        db.add(reward_entry_item)
        db.flush()

        point_transaction = models.PointTransaction(
            store_id=store_id,
            customer_id=customer.id,
            loyalty_item_id=loyalty_item.id,
            transaction_type="EARN",
            points=total_points,
            amount=None,
            note=f"Reward Entry - {loyalty_item.item_name} ({row.quantity} {row.unit})"
        )

        db.add(point_transaction)
        db.flush()

        reward_entry_item.point_transaction_id = point_transaction.id

    new_reward_entry.total_points = calculated_total_points
    customer.points_balance = int(customer.points_balance or 0) + calculated_total_points

    db.commit()
    db.refresh(new_reward_entry)

    return {
        "message": "Reward entry saved successfully",
        "reward_entry_id": new_reward_entry.id,
        "customer_id": customer.id,
        "customer_name": customer.name,
        "total_points": calculated_total_points,
        "new_points_balance": customer.points_balance,
    }


@app.get("/reward-entries")
@app.get("/reward-entries/")
def read_reward_entries(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.RewardEntry)

    if tenant_id is not None:
        query = query.filter(models.RewardEntry.store_id == tenant_id)

    if customer_id is not None:
        query = query.filter(models.RewardEntry.customer_id == customer_id)

    reward_entries = query.order_by(
        models.RewardEntry.created_at.desc()
    ).offset(skip).limit(limit).all()

    response = []

    for entry in reward_entries:
        customer_name = entry.customer.name if entry.customer else None

        for item in entry.items:
            response.append(
                {
                    "id": item.id,
                    "reward_entry_item_id": item.id,
                    "reward_entry_id": entry.id,

                    "transaction_id": item.point_transaction_id,
                    "point_transaction_id": item.point_transaction_id,

                    "store_id": entry.store_id,
                    "customer_id": entry.customer_id,
                    "customer_name": customer_name,

                    "loyalty_item_id": item.loyalty_item_id,
                    "item_id": item.loyalty_item_id,
                    "item_name": item.loyalty_item.item_name if item.loyalty_item else None,

                    "unit": item.unit,
                    "quantity": item.quantity,
                    "points_per_unit": item.points_per_unit,
                    "total_points": item.total_points,

                    "note": entry.note,
                    "created_at": entry.created_at,
                }
            )

    return response


# ------------------------------------------------------------------
# PAYOUT / REDEMPTION ROUTES
# ------------------------------------------------------------------
@app.post("/payouts", response_model=schemas.PayoutResponse)
def create_payout(
    payout: schemas.PayoutCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    if payout.points_redeemed <= 0:
        raise HTTPException(
            status_code=400,
            detail="Points redeemed must be greater than zero"
        )

    customer = get_customer_or_404(
        payout.customer_id,
        db,
        current_user,
        for_update=True
    )

    if customer.points_balance < payout.points_redeemed:
        raise HTTPException(
            status_code=400,
            detail="Customer does not have enough points"
        )

    customer.points_balance -= payout.points_redeemed

    db_payout = models.Payout(
        store_id=customer.store_id,
        customer_id=customer.id,
        points_redeemed=payout.points_redeemed,
        payout_value=payout.payout_value,
        status="completed",
        note=payout.note
    )

    db_transaction = models.PointTransaction(
        store_id=customer.store_id,
        customer_id=customer.id,
        loyalty_item_id=None,
        transaction_type="REDEEM",
        points=payout.points_redeemed,
        amount=payout.payout_value,
        note=payout.note
    )

    db.add(db_payout)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_payout)

    return db_payout


@app.get("/payouts", response_model=list[schemas.PayoutResponse])
def read_payouts(
    skip: int = 0,
    limit: int = 100,
    store_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.Payout)

    if tenant_id is not None:
        query = query.filter(models.Payout.store_id == tenant_id)

    if customer_id is not None:
        query = query.filter(models.Payout.customer_id == customer_id)

    return query.order_by(
        models.Payout.created_at.desc()
    ).offset(skip).limit(limit).all()


# ------------------------------------------------------------------
# LEADERBOARD ROUTE
# ------------------------------------------------------------------
@app.get("/leaderboard", response_model=list[schemas.LeaderboardResponse])
def read_leaderboard(
    skip: int = 0,
    limit: int = 20,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin", "Staff"])

    tenant_id = get_tenant_scope(current_user, store_id)

    query = db.query(models.Customer)

    if hasattr(models.Customer, "is_active"):
        query = query.filter(models.Customer.is_active == True)

    if tenant_id is not None:
        query = query.filter(models.Customer.store_id == tenant_id)

    customers = query.order_by(
        models.Customer.points_balance.desc()
    ).offset(skip).limit(limit).all()

    return [
        {
            "customer_id": customer.id,
            "name": customer.name,
            "phone_number": customer.phone_number,
            "points_balance": customer.points_balance
        }
        for customer in customers
    ]


@app.put("/leaderboard/customers/{customer_id}")
def update_leaderboard_customer_points(
    customer_id: int,
    data: schemas.LeaderboardCustomerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    customer = get_customer_or_404(
        customer_id,
        db,
        current_user,
        for_update=True
    )

    new_balance = int(data.points_balance or 0)

    if new_balance < 0:
        raise HTTPException(
            status_code=400,
            detail="Points balance cannot be negative"
        )

    old_balance = int(customer.points_balance or 0)
    difference = new_balance - old_balance

    customer.points_balance = new_balance

    if difference != 0:
        db_transaction = models.PointTransaction(
            store_id=customer.store_id,
            customer_id=customer.id,
            loyalty_item_id=None,
            transaction_type="MANUAL_ADD" if difference > 0 else "MANUAL_DEDUCT",
            points=abs(difference),
            amount=None,
            note=data.note or "Leaderboard points balance edited"
        )

        db.add(db_transaction)

    db.commit()
    db.refresh(customer)

    return {
        "message": "Leaderboard customer points updated successfully",
        "customer_id": customer.id,
        "name": customer.name,
        "phone_number": customer.phone_number,
        "points_balance": customer.points_balance,
    }


# ------------------------------------------------------------------
# AMOUNT ASSIGNMENT / POINT VALUE ROUTES
# ------------------------------------------------------------------
@app.get("/settings/point-value")
def get_point_value(
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
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
        {"store_id": tenant_id}
    ).fetchone()

    point_value = float(setting[0]) if setting else 1.0

    return {
        "point_value_rupees": point_value,
        "message": f"1 point = ₹{point_value}"
    }


@app.put("/settings/point-value")
def update_point_value(
    data: schemas.PointValueUpdate,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    require_roles(current_user, ["SuperAdmin", "Admin"])

    if data.point_value_rupees <= 0:
        raise HTTPException(
            status_code=400,
            detail="Point value must be greater than zero"
        )

    db_user = get_current_db_user(db, current_user)

    if not verify_password(data.password, db_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect password"
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
        {"store_id": tenant_id}
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
            }
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
            }
        )

    db.commit()

    return {
        "message": "Point value updated successfully",
        "point_value_rupees": data.point_value_rupees,
        "display": f"1 point = ₹{data.point_value_rupees}"
    }


# ------------------------------------------------------------------
# PROTECTED DEV ROUTE
# ------------------------------------------------------------------
@app.post("/dev/create-superadmin/")
def create_initial_superadmin(
    username: str,
    password: str,
    db: Session = Depends(get_db)
):
    enable_dev_superadmin = os.getenv("ENABLE_DEV_SUPERADMIN", "false").lower()

    if enable_dev_superadmin != "true":
        raise HTTPException(
            status_code=403,
            detail="This development route is disabled."
        )

    existing = db.query(models.User).filter(
        models.User.username == username
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )

    db_user = models.User(
        username=username,
        password_hash=get_password_hash(password),
        role="SuperAdmin",
        store_id=None
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