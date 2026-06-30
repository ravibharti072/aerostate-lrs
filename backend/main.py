import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from database import engine, Base
from core.rate_limit import limiter
from routers import (
    auth,
    users,
    stores,
    customers,
    loyalty_items,
    points,
    transactions,
    reward_entries,
    payouts,
    leaderboard,
    app_settings,
    dev,
)


# ------------------------------------------------------------------
# DATABASE INIT + TEMP MIGRATIONS
# NOTE:
# This is safe temporary migration code.
# Later, move this to Alembic migrations.
# Do not add DROP / TRUNCATE here.
# ------------------------------------------------------------------
def run_temporary_migrations():
    Base.metadata.create_all(bind=engine)

    with engine.begin() as connection:
        # -----------------------------
        # CUSTOMERS table migration
        # -----------------------------
        connection.execute(text("""
            ALTER TABLE customers
            ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR;
        """))

        connection.execute(text("""
            ALTER TABLE customers
            ADD COLUMN IF NOT EXISTS pan_number VARCHAR;
        """))

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

        # -----------------------------
        # LOYALTY ITEMS table migration
        # -----------------------------
        connection.execute(text("""
            ALTER TABLE loyalty_items
            ADD COLUMN IF NOT EXISTS unit VARCHAR DEFAULT 'pcs';
        """))

        connection.execute(text("""
            UPDATE loyalty_items
            SET unit = 'pcs'
            WHERE unit IS NULL OR unit = '';
        """))

        # -----------------------------
        # REWARD ENTRY tables
        # -----------------------------
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS reward_entries (
                id SERIAL PRIMARY KEY,
                store_id INTEGER REFERENCES stores(id),
                customer_id INTEGER NOT NULL REFERENCES customers(id),
                total_points DOUBLE PRECISION NOT NULL DEFAULT 0,
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
                total_points DOUBLE PRECISION NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))

        connection.execute(text("""
            ALTER TABLE reward_entry_items
            ADD COLUMN IF NOT EXISTS point_transaction_id INTEGER REFERENCES point_transactions(id);
        """))

        # -----------------------------
        # USERS table migration
        # -----------------------------
        connection.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        """))

        connection.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        """))

        # -----------------------------
        # STORES table migration
        # -----------------------------
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

        # -----------------------------
        # APP SETTINGS table migration
        # -----------------------------
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

        # -----------------------------
        # DECIMAL POINT MIGRATIONS
        # Keep these at the end after all tables exist.
        # -----------------------------
        connection.execute(text("""
            ALTER TABLE customers
            ALTER COLUMN points_balance TYPE DOUBLE PRECISION
            USING points_balance::DOUBLE PRECISION;
        """))

        connection.execute(text("""
            ALTER TABLE reward_entries
            ALTER COLUMN total_points TYPE DOUBLE PRECISION
            USING total_points::DOUBLE PRECISION;
        """))

        connection.execute(text("""
            ALTER TABLE reward_entry_items
            ALTER COLUMN total_points TYPE DOUBLE PRECISION
            USING total_points::DOUBLE PRECISION;
        """))

        connection.execute(text("""
            ALTER TABLE point_transactions
            ALTER COLUMN points TYPE DOUBLE PRECISION
            USING points::DOUBLE PRECISION;
        """))

        connection.execute(text("""
            ALTER TABLE payouts
            ALTER COLUMN points_redeemed TYPE DOUBLE PRECISION
            USING points_redeemed::DOUBLE PRECISION;
        """))


run_temporary_migrations()


# ------------------------------------------------------------------
# APP INIT
# ------------------------------------------------------------------
app = FastAPI(
    title="Aerostate - Loyalty Program API",
    version="2.1.0",
)


# ------------------------------------------------------------------
# RATE LIMITER
# ------------------------------------------------------------------
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
# ROUTERS
# ------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(stores.router)
app.include_router(customers.router)
app.include_router(loyalty_items.router)
app.include_router(points.router)
app.include_router(transactions.router)
app.include_router(reward_entries.router)
app.include_router(payouts.router)
app.include_router(leaderboard.router)
app.include_router(app_settings.router)
app.include_router(dev.router)


# ------------------------------------------------------------------
# ROOT / HEALTH
# ------------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "project": "Aerostate - Loyalty Program",
        "status": "online",
        "version": "2.1.0",
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
    }