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
    messages,
    dev,
)


# ------------------------------------------------------------------
# DATABASE INIT + TEMP MIGRATIONS
# NOTE:
# This creates missing tables and adds missing columns safely.
# It does NOT delete old data.
# Later, move this to Alembic migrations.
# Do not add DROP / TRUNCATE here.
# ------------------------------------------------------------------
def run_temporary_migrations():
    Base.metadata.create_all(bind=engine)

    with engine.begin() as connection:
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
        # POINT TRANSACTIONS table safety migration
        # -----------------------------
        connection.execute(text("""
            ALTER TABLE point_transactions
            ADD COLUMN IF NOT EXISTS amount DOUBLE PRECISION;
        """))

        connection.execute(text("""
            ALTER TABLE point_transactions
            ADD COLUMN IF NOT EXISTS note VARCHAR;
        """))

        connection.execute(text("""
            ALTER TABLE point_transactions
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
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
        # PAYOUTS table safety migration
        # -----------------------------
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS payouts (
                id SERIAL PRIMARY KEY,
                store_id INTEGER REFERENCES stores(id),
                customer_id INTEGER NOT NULL REFERENCES customers(id),
                points_redeemed DOUBLE PRECISION NOT NULL DEFAULT 0,
                payout_value DOUBLE PRECISION,
                status VARCHAR DEFAULT 'completed',
                note VARCHAR,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))

        connection.execute(text("""
            ALTER TABLE payouts
            ADD COLUMN IF NOT EXISTS payout_value DOUBLE PRECISION;
        """))

        connection.execute(text("""
            ALTER TABLE payouts
            ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'completed';
        """))

        connection.execute(text("""
            ALTER TABLE payouts
            ADD COLUMN IF NOT EXISTS note VARCHAR;
        """))

        connection.execute(text("""
            ALTER TABLE payouts
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
        # WHATSAPP MESSAGE LOGS table migration
        # This table only stores send attempt logs.
        # No secrets or access tokens should be stored here.
        # -----------------------------
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
                id SERIAL PRIMARY KEY,

                store_id INTEGER REFERENCES stores(id),
                customer_id INTEGER NOT NULL REFERENCES customers(id),

                reward_entry_id INTEGER REFERENCES reward_entries(id),
                payout_id INTEGER REFERENCES payouts(id),

                message_type VARCHAR NOT NULL DEFAULT 'reward_points',

                sent_by_user_id INTEGER REFERENCES users(id),

                phone_number VARCHAR NOT NULL,

                template_name VARCHAR,
                template_language VARCHAR DEFAULT 'en',

                message_preview TEXT,

                added_points DOUBLE PRECISION NOT NULL DEFAULT 0,
                redeemed_points DOUBLE PRECISION NOT NULL DEFAULT 0,
                payout_value DOUBLE PRECISION,
                total_points DOUBLE PRECISION NOT NULL DEFAULT 0,

                status VARCHAR NOT NULL DEFAULT 'pending',

                provider_message_id VARCHAR,
                error_message TEXT,
                provider_response TEXT,

                sent_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))

        connection.execute(text("""
            ALTER TABLE whatsapp_message_logs
            ADD COLUMN IF NOT EXISTS payout_id INTEGER;
        """))

        connection.execute(text("""
            ALTER TABLE whatsapp_message_logs
            ADD COLUMN IF NOT EXISTS message_type VARCHAR DEFAULT 'reward_points';
        """))

        connection.execute(text("""
            ALTER TABLE whatsapp_message_logs
            ADD COLUMN IF NOT EXISTS redeemed_points DOUBLE PRECISION DEFAULT 0.0;
        """))

        connection.execute(text("""
            ALTER TABLE whatsapp_message_logs
            ADD COLUMN IF NOT EXISTS payout_value DOUBLE PRECISION;
        """))

        connection.execute(text("""
            UPDATE whatsapp_message_logs
            SET message_type = 'reward_points'
            WHERE message_type IS NULL;
        """))

        connection.execute(text("""
            UPDATE whatsapp_message_logs
            SET redeemed_points = 0.0
            WHERE redeemed_points IS NULL;
        """))

        connection.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'fk_whatsapp_message_logs_payout_id'
                ) THEN
                    ALTER TABLE whatsapp_message_logs
                    ADD CONSTRAINT fk_whatsapp_message_logs_payout_id
                    FOREIGN KEY (payout_id) REFERENCES payouts(id);
                END IF;
            END $$;
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
            ALTER COLUMN quantity TYPE DOUBLE PRECISION
            USING quantity::DOUBLE PRECISION;
        """))

        connection.execute(text("""
            ALTER TABLE reward_entry_items
            ALTER COLUMN points_per_unit TYPE DOUBLE PRECISION
            USING points_per_unit::DOUBLE PRECISION;
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
    version="2.2.0",
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
app.include_router(messages.router)
app.include_router(dev.router)


# ------------------------------------------------------------------
# ROOT / HEALTH
# ------------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "project": "Aerostate - Loyalty Program",
        "status": "online",
        "version": "2.2.0",
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
    }