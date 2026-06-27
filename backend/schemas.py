from pydantic import BaseModel, model_validator, Field
from typing import Optional, List, Any
from datetime import datetime


# ----------------------------------------
# AUTHENTICATION SCHEMAS
# ----------------------------------------
class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


# ----------------------------------------
# STORE SCHEMAS
# ----------------------------------------
class StoreCreate(BaseModel):
    name: str
    business_type: Optional[str] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_active: Optional[bool] = True


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    business_type: Optional[str] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_active: Optional[bool] = None


class StoreResponse(BaseModel):
    id: int
    name: str
    business_type: Optional[str] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ----------------------------------------
# USER SCHEMAS
# ----------------------------------------
class UserCreate(BaseModel):
    username: str
    password: str
    store_id: Optional[int] = None
    role: Optional[str] = None
    is_active: Optional[bool] = True


class UserListResponse(BaseModel):
    id: int
    username: str
    role: str
    store_id: Optional[int] = None
    store_name: Optional[str] = None
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    new_username: Optional[str] = None
    new_password: Optional[str] = None
    is_active: Optional[bool] = None
    superadmin_password: str


class UserDeleteRequest(BaseModel):
    superadmin_password: str


class SuperAdminCredentialUpdate(BaseModel):
    current_password: str
    new_username: Optional[str] = None
    new_password: Optional[str] = None


# ----------------------------------------
# CUSTOMER MASTER SCHEMAS
# ----------------------------------------
class CustomerCreate(BaseModel):
    name: str
    phone_number: str
    store_id: Optional[int] = None

    address: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None

    points_balance: int = 0


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None

    address: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None

    points_balance: Optional[int] = None
    is_active: Optional[bool] = None


class CustomerResponse(BaseModel):
    id: int
    store_id: Optional[int] = None

    name: str
    phone_number: str

    address: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None

    points_balance: int
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ----------------------------------------
# ITEM MASTER SCHEMAS
# ----------------------------------------
class LoyaltyItemCreate(BaseModel):
    item_name: str
    sku: Optional[str] = None

    # Frontend field
    points: int

    store_id: Optional[int] = None

    # Kept for old backend/database compatibility
    category: Optional[str] = "item"

    # Database field. Backend stores item points here.
    per_point_amount: Optional[float] = None

    @model_validator(mode="after")
    def sync_points_to_per_point_amount(self):
        if self.per_point_amount is None or self.per_point_amount <= 0:
            self.per_point_amount = float(self.points or 0)
        return self


class LoyaltyItemUpdate(BaseModel):
    item_name: Optional[str] = None
    sku: Optional[str] = None

    # Frontend field
    points: Optional[int] = None

    is_active: Optional[bool] = None

    # Kept for old backend/database compatibility
    category: Optional[str] = None
    per_point_amount: Optional[float] = None

    @model_validator(mode="after")
    def sync_points_to_per_point_amount(self):
        if self.points is not None:
            if self.per_point_amount is None or self.per_point_amount <= 0:
                self.per_point_amount = float(self.points)
        return self


class LoyaltyItemResponse(BaseModel):
    id: int
    store_id: Optional[int] = None

    item_name: str
    sku: Optional[str] = None

    # Frontend compatibility field
    points: Optional[int] = 0

    # Actual database value used as points per unit
    per_point_amount: Optional[float] = None

    category: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def add_points_from_per_point_amount(cls, data: Any):
        if isinstance(data, dict):
            if not data.get("points"):
                data["points"] = int(data.get("per_point_amount") or 0)
            return data

        per_point_amount = getattr(data, "per_point_amount", None)

        return {
            "id": getattr(data, "id", None),
            "store_id": getattr(data, "store_id", None),
            "item_name": getattr(data, "item_name", None),
            "sku": getattr(data, "sku", None),
            "points": int(per_point_amount or 0),
            "per_point_amount": per_point_amount,
            "category": getattr(data, "category", None),
            "is_active": getattr(data, "is_active", True),
            "created_at": getattr(data, "created_at", None),
        }

    class Config:
        from_attributes = True


# ----------------------------------------
# OLD POINT ASSIGNMENT SCHEMAS
# Kept for backward compatibility.
# New flow should use Reward Entry.
# ----------------------------------------
class PointAssignRequest(BaseModel):
    customer_id: int
    loyalty_item_id: int
    amount: float
    note: Optional[str] = None


class ManualPointRequest(BaseModel):
    customer_id: int
    points: int
    note: Optional[str] = None


# ----------------------------------------
# REWARD ENTRY SCHEMAS
# ----------------------------------------
class RewardEntryItemCreate(BaseModel):
    loyalty_item_id: Optional[int] = None

    # Frontend sometimes sends item_id
    item_id: Optional[int] = None

    unit: str
    quantity: float

    # Backend calculates from item master, so optional
    points_per_unit: Optional[float] = 0
    total_points: Optional[int] = 0

    @model_validator(mode="after")
    def sync_item_id(self):
        if self.loyalty_item_id is None and self.item_id is not None:
            self.loyalty_item_id = self.item_id

        if self.item_id is None and self.loyalty_item_id is not None:
            self.item_id = self.loyalty_item_id

        if self.loyalty_item_id is None:
            raise ValueError("loyalty_item_id or item_id is required")

        return self


class RewardEntryBulkCreate(BaseModel):
    customer_id: int
    items: List[RewardEntryItemCreate]

    # Backend calculates this, so optional
    total_points: Optional[int] = 0

    note: Optional[str] = None


class RewardEntryItemUpdate(BaseModel):
    loyalty_item_id: Optional[int] = None

    # Frontend may send item_id
    item_id: Optional[int] = None

    unit: str
    quantity: float
    note: Optional[str] = None

    @model_validator(mode="after")
    def sync_item_id(self):
        if self.loyalty_item_id is None and self.item_id is not None:
            self.loyalty_item_id = self.item_id

        if self.item_id is None and self.loyalty_item_id is not None:
            self.item_id = self.loyalty_item_id

        if self.loyalty_item_id is None:
            raise ValueError("loyalty_item_id or item_id is required")

        return self


class RewardEntryItemResponse(BaseModel):
    id: int
    reward_entry_id: Optional[int] = None
    loyalty_item_id: int
    point_transaction_id: Optional[int] = None

    item_name: Optional[str] = None
    unit: str
    quantity: float
    points_per_unit: float
    total_points: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RewardEntryResponse(BaseModel):
    id: int
    store_id: Optional[int] = None
    customer_id: int
    customer_name: Optional[str] = None
    total_points: int
    note: Optional[str] = None
    created_at: datetime
    items: List[RewardEntryItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class RewardEntryListRowResponse(BaseModel):
    id: int
    reward_entry_id: Optional[int] = None
    store_id: Optional[int] = None

    customer_id: int
    customer_name: Optional[str] = None

    loyalty_item_id: Optional[int] = None
    item_id: Optional[int] = None
    item_name: Optional[str] = None

    # Needed for Transaction History edit
    transaction_id: Optional[int] = None
    point_transaction_id: Optional[int] = None
    reward_entry_item_id: Optional[int] = None

    unit: Optional[str] = None
    quantity: Optional[float] = None
    points_per_unit: Optional[float] = None
    total_points: Optional[int] = None

    note: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ----------------------------------------
# TRANSACTION HISTORY SCHEMAS
# Old frontend name: Points History
# New frontend name: Transaction History
# ----------------------------------------
class PointTransactionResponse(BaseModel):
    id: int
    store_id: Optional[int] = None
    customer_id: int
    loyalty_item_id: Optional[int] = None

    # Needed for editing product / unit / quantity
    reward_entry_item_id: Optional[int] = None
    reward_entry_id: Optional[int] = None
    point_transaction_id: Optional[int] = None

    transaction_type: str

    # Frontend compatibility
    type: Optional[str] = None
    description: Optional[str] = None

    points: int
    amount: Optional[float] = None
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Kept only for old/manual transaction editing compatibility.
# New Reward Entry edit should use RewardEntryItemUpdate.
class PointTransactionUpdate(BaseModel):
    customer_id: int
    points: int

    # Frontend sends type as POINTS_CREDIT / POINTS_DEBIT
    type: Optional[str] = None

    # Backend compatibility
    transaction_type: Optional[str] = None

    note: Optional[str] = None
    description: Optional[str] = None


# ----------------------------------------
# PAYOUT / REDEMPTION SCHEMAS
# ----------------------------------------
class PayoutCreate(BaseModel):
    customer_id: int
    points_redeemed: int
    payout_value: Optional[float] = None
    note: Optional[str] = None


class PayoutResponse(BaseModel):
    id: int
    store_id: Optional[int] = None
    customer_id: int
    points_redeemed: int
    payout_value: Optional[float] = None
    status: str
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ----------------------------------------
# LEADERBOARD SCHEMAS
# ----------------------------------------
class LeaderboardResponse(BaseModel):
    customer_id: int
    name: str
    phone_number: str
    points_balance: int

    class Config:
        from_attributes = True


class LeaderboardCustomerUpdate(BaseModel):
    points_balance: int
    note: Optional[str] = None


# ----------------------------------------
# POINT VALUE / AMOUNT ASSIGNMENT SCHEMAS
# ----------------------------------------
class PointValueUpdate(BaseModel):
    point_value_rupees: float
    password: str