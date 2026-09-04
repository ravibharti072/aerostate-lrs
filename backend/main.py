import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    dashboard,
)


# ------------------------------------------------------------------
# DATABASE INIT
# ------------------------------------------------------------------
def run_db_init():
    Base.metadata.create_all(bind=engine)

run_db_init()


# ------------------------------------------------------------------
# APP INIT
# ------------------------------------------------------------------
app = FastAPI(
    title="Aerostate - Loyalty Program API",
    version="2.3.0",
)


# ------------------------------------------------------------------
# RATE LIMITER
# ------------------------------------------------------------------
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ------------------------------------------------------------------
# CORS (Safely supports both localhost and 127.0.0.1 to block CORS errors)
# ------------------------------------------------------------------
ALLOWED_ORIGINS_ENV = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").strip()

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
app.include_router.dev(dev.router) if hasattr(app.include_router, "dev") else app.include_router(dev.router)
app.include_router(dashboard.router)


# ------------------------------------------------------------------
# ROOT / HEALTH
# ------------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "project": "Aerostate - Loyalty Program",
        "status": "online",
        "version": "2.3.0",
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
    }