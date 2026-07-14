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
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None

    points_balance: float = 0.0


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None

    address: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None

    points_balance: Optional[float] = None
    is_active: Optional[bool] = None


class CustomerResponse(BaseModel):
    id: int
    store_id: Optional[int] = None

    name: str
    phone_number: str

    address: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None

    points_balance: float
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

    # Frontend field: points per selected unit.
    points: float

    store_id: Optional[int] = None

    # Unit selected in Item Master.
    unit: Optional[str] = "pcs"

    # Extra compatibility aliases if frontend sends these.
    quantity_unit: Optional[str] = None
    uom: Optional[str] = None
    default_unit: Optional[str] = None

    # Kept for old backend/database compatibility.
    category: Optional[str] = "item"

    # Database field. Backend stores item points here.
    per_point_amount: Optional[float] = None

    @model_validator(mode="after")
    def sync_points_and_unit(self):
        if self.per_point_amount is None or self.per_point_amount <= 0:
            self.per_point_amount = float(self.points or 0)

        selected_unit = (
            self.unit
            or self.quantity_unit
            or self.uom
            or self.default_unit
            or "pcs"
        )

        self.unit = selected_unit
        self.quantity_unit = selected_unit
        self.uom = selected_unit
        self.default_unit = selected_unit

        return self


class LoyaltyItemUpdate(BaseModel):
    item_name: Optional[str] = None
    sku: Optional[str] = None

    # Frontend field: points per selected unit.
    points: Optional[float] = None

    # Unit selected in Item Master.
    unit: Optional[str] = None

    # Extra compatibility aliases if frontend sends these.
    quantity_unit: Optional[str] = None
    uom: Optional[str] = None
    default_unit: Optional[str] = None

    is_active: Optional[bool] = None

    # Kept for old backend/database compatibility.
    category: Optional[str] = None
    per_point_amount: Optional[float] = None

    @model_validator(mode="after")
    def sync_points_and_unit(self):
        if self.points is not None:
            if self.per_point_amount is None or self.per_point_amount <= 0:
                self.per_point_amount = float(self.points)

        selected_unit = (
            self.unit
            or self.quantity_unit
            or self.uom
            or self.default_unit
        )

        if selected_unit:
            self.unit = selected_unit
            self.quantity_unit = selected_unit
            self.uom = selected_unit
            self.default_unit = selected_unit

        return self


class LoyaltyItemResponse(BaseModel):
    id: int
    store_id: Optional[int] = None

    item_name: str
    sku: Optional[str] = None

    # Unit selected in Item Master.
    unit: Optional[str] = "pcs"

    # Frontend compatibility field.
    points: Optional[float] = 0.0

    # Actual database value used as points per unit.
    per_point_amount: Optional[float] = None

    category: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def add_points_from_per_point_amount(cls, data: Any):
        if isinstance(data, dict):
            if data.get("points") is None:
                data["points"] = float(data.get("per_point_amount") or 0)

            if not data.get("unit"):
                data["unit"] = (
                    data.get("quantity_unit")
                    or data.get("uom")
                    or data.get("default_unit")
                    or "pcs"
                )

            return data

        per_point_amount = getattr(data, "per_point_amount", None)

        return {
            "id": getattr(data, "id", None),
            "store_id": getattr(data, "store_id", None),
            "item_name": getattr(data, "item_name", None),
            "sku": getattr(data, "sku", None),
            "unit": getattr(data, "unit", "pcs") or "pcs",
            "points": float(per_point_amount or 0),
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
    points: float
    note: Optional[str] = None


# ----------------------------------------
# REWARD ENTRY SCHEMAS
# ----------------------------------------
class RewardEntryItemCreate(BaseModel):
    loyalty_item_id: Optional[int] = None

    # Frontend sometimes sends item_id.
    item_id: Optional[int] = None

    unit: str
    quantity: float

    # Backend calculates from Item Master, so optional.
    points_per_unit: Optional[float] = 0.0
    total_points: Optional[float] = 0.0

    @model_validator(mode="after")
    def sync_item_id(self):
        if self.loyalty_item_id is None and self.item_id is not None:
            self.loyalty_item_id = self.item_id

        if self.item_id is None and self.loyalty_item_id is not None:
            self.item_id = self.loyalty_item_id

        if self.loyalty_item_id is None:
            raise ValueError("loyalty_item_id or item_id is required")

        return self


class RewardEntryItemAdd(BaseModel):
    loyalty_item_id: Optional[int] = None

    # Frontend may send item_id.
    item_id: Optional[int] = None

    unit: str
    quantity: float

    points_per_unit: Optional[float] = 0.0
    total_points: Optional[float] = 0.0

    note: Optional[str] = None

    # Optional date support.
    entry_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    @model_validator(mode="after")
    def sync_item_id_and_date(self):
        if self.loyalty_item_id is None and self.item_id is not None:
            self.loyalty_item_id = self.item_id

        if self.item_id is None and self.loyalty_item_id is not None:
            self.item_id = self.loyalty_item_id

        if self.loyalty_item_id is None:
            raise ValueError("loyalty_item_id or item_id is required")

        if self.entry_date is None and self.created_at is not None:
            self.entry_date = self.created_at

        return self


class RewardEntryBulkCreate(BaseModel):
    customer_id: int
    items: List[RewardEntryItemCreate]

    # Optional manual old entry date from frontend.
    entry_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    # Backend calculates this, so optional.
    total_points: Optional[float] = 0.0

    note: Optional[str] = None

    @model_validator(mode="after")
    def sync_entry_date(self):
        if self.entry_date is None and self.created_at is not None:
            self.entry_date = self.created_at
        return self


class RewardEntryItemUpdate(BaseModel):
    loyalty_item_id: Optional[int] = None

    # Frontend may send item_id.
    item_id: Optional[int] = None

    unit: str
    quantity: float
    note: Optional[str] = None

    # Optional date edit from Transaction History.
    entry_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    @model_validator(mode="after")
    def sync_item_id_and_date(self):
        if self.loyalty_item_id is None and self.item_id is not None:
            self.loyalty_item_id = self.item_id

        if self.item_id is None and self.loyalty_item_id is not None:
            self.item_id = self.loyalty_item_id

        if self.loyalty_item_id is None:
            raise ValueError("loyalty_item_id or item_id is required")

        if self.entry_date is None and self.created_at is not None:
            self.entry_date = self.created_at

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
    total_points: float
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RewardEntryResponse(BaseModel):
    id: int
    store_id: Optional[int] = None
    customer_id: int
    customer_name: Optional[str] = None
    total_points: float
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

    # Needed for Transaction History edit.
    transaction_id: Optional[int] = None
    point_transaction_id: Optional[int] = None
    reward_entry_item_id: Optional[int] = None

    unit: Optional[str] = None
    quantity: Optional[float] = None
    points_per_unit: Optional[float] = None
    total_points: Optional[float] = None

    note: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RewardEntryGroupedItemResponse(BaseModel):
    id: int
    reward_entry_item_id: int
    transaction_id: Optional[int] = None
    point_transaction_id: Optional[int] = None

    loyalty_item_id: Optional[int] = None
    item_id: Optional[int] = None
    item_name: Optional[str] = None

    unit: Optional[str] = None
    quantity: Optional[float] = None
    points_per_unit: Optional[float] = None
    total_points: Optional[float] = None
    created_at: Optional[datetime] = None


class RewardEntryGroupedResponse(BaseModel):
    id: int
    reward_entry_id: int
    transaction_group_id: int

    store_id: Optional[int] = None
    customer_id: int
    customer_name: Optional[str] = None
    phone_number: Optional[str] = None

    type: str = "POINTS_CREDIT"
    transaction_type: str = "EARN"

    item_count: int
    total_points: float
    points: float

    note: Optional[str] = None
    created_at: Optional[datetime] = None

    items: List[RewardEntryGroupedItemResponse] = Field(default_factory=list)


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

    # Needed for editing product / unit / quantity.
    reward_entry_item_id: Optional[int] = None
    reward_entry_id: Optional[int] = None
    point_transaction_id: Optional[int] = None

    transaction_type: str

    # Frontend compatibility.
    type: Optional[str] = None
    description: Optional[str] = None

    points: float
    amount: Optional[float] = None
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Kept only for old/manual transaction editing compatibility.
# New Reward Entry edit should use RewardEntryItemUpdate.
class PointTransactionUpdate(BaseModel):
    customer_id: int
    points: float

    # Frontend sends type as POINTS_CREDIT / POINTS_DEBIT.
    type: Optional[str] = None

    # Backend compatibility.
    transaction_type: Optional[str] = None

    note: Optional[str] = None
    description: Optional[str] = None

    # Optional future date edit support for manual transactions.
    entry_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    @model_validator(mode="after")
    def sync_entry_date(self):
        if self.entry_date is None and self.created_at is not None:
            self.entry_date = self.created_at
        return self


class TransactionDeleteRequest(BaseModel):
    password: str


# ----------------------------------------
# PAYOUT / REDEMPTION SCHEMAS
# ----------------------------------------
class PayoutCreate(BaseModel):
    customer_id: int
    points_redeemed: float
    payout_value: Optional[float] = None
    note: Optional[str] = None


class PayoutResponse(BaseModel):
    id: int
    store_id: Optional[int] = None
    customer_id: int

    # Optional frontend-friendly fields.
    customer_name: Optional[str] = None
    phone_number: Optional[str] = None
    points_balance: Optional[float] = None

    points_redeemed: float
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
    points_balance: float

    class Config:
        from_attributes = True


class LeaderboardCustomerUpdate(BaseModel):
    points_balance: float
    note: Optional[str] = None


# ----------------------------------------
# POINT VALUE / AMOUNT ASSIGNMENT SCHEMAS
# ----------------------------------------
class PointValueUpdate(BaseModel):
    point_value_rupees: float
    password: str


# ----------------------------------------
# WHATSAPP MESSAGE SCHEMAS
# ----------------------------------------
class WhatsAppRewardSendRequest(BaseModel):
    # By default, block duplicate send if already sent.
    # Frontend can pass allow_resend=True only after user confirms resend.
    allow_resend: Optional[bool] = False


class WhatsAppRedemptionSendRequest(BaseModel):
    # By default, block duplicate send if already sent.
    # Frontend can pass allow_resend=True only after user confirms resend.
    allow_resend: Optional[bool] = False


class WhatsAppRewardSendResponse(BaseModel):
    success: bool
    log_id: Optional[int] = None

    message_type: str = "reward_points"

    reward_entry_id: int
    payout_id: Optional[int] = None

    customer_id: int
    customer_name: Optional[str] = None
    phone_number: Optional[str] = None

    added_points: float
    redeemed_points: float = 0.0
    payout_value: Optional[float] = None
    total_points: float

    # WhatsApp cost tracking.
    # Example: message_cost 0.11 means ₹0.11 / 11 paisa.
    message_cost: Optional[float] = 0.0
    cost_currency: Optional[str] = "INR"
    billing_status: Optional[str] = "estimated"

    status: str
    message_preview: Optional[str] = None

    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WhatsAppRedemptionSendResponse(BaseModel):
    success: bool
    log_id: Optional[int] = None

    message_type: str = "redemption_points"

    reward_entry_id: Optional[int] = None
    payout_id: int

    customer_id: int
    customer_name: Optional[str] = None
    phone_number: Optional[str] = None

    added_points: float = 0.0
    redeemed_points: float
    payout_value: Optional[float] = None
    total_points: float

    # WhatsApp cost tracking.
    # Example: message_cost 0.11 means ₹0.11 / 11 paisa.
    message_cost: Optional[float] = 0.0
    cost_currency: Optional[str] = "INR"
    billing_status: Optional[str] = "estimated"

    status: str
    message_preview: Optional[str] = None

    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WhatsAppMessageLogResponse(BaseModel):
    id: int

    store_id: Optional[int] = None
    customer_id: int

    reward_entry_id: Optional[int] = None
    payout_id: Optional[int] = None

    # reward_points / redemption_points
    message_type: Optional[str] = "reward_points"

    sent_by_user_id: Optional[int] = None

    customer_name: Optional[str] = None
    store_name: Optional[str] = None
    sent_by_username: Optional[str] = None

    phone_number: str

    template_name: Optional[str] = None
    template_language: Optional[str] = None

    message_preview: Optional[str] = None

    added_points: float = 0.0
    redeemed_points: float = 0.0
    payout_value: Optional[float] = None
    total_points: float = 0.0

    # WhatsApp cost tracking.
    # Backend should count cost mainly for sent/delivered/read messages.
    message_cost: Optional[float] = 0.0
    cost_currency: Optional[str] = "INR"
    billing_status: Optional[str] = "estimated"

    # pending, sent, delivered, read, failed
    status: str

    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None

    sent_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WhatsAppMessageLogListResponse(BaseModel):
    total: int
    logs: List[WhatsAppMessageLogResponse] = Field(default_factory=list)


class WhatsAppSpendSummaryResponse(BaseModel):
    total_logs: int = 0

    total_messages: int = 0
    sent_messages: int = 0
    delivered_messages: int = 0
    read_messages: int = 0
    failed_messages: int = 0
    pending_messages: int = 0

    reward_messages: int = 0
    redemption_messages: int = 0

    billable_messages: int = 0

    total_estimated_spend: float = 0.0
    reward_estimated_spend: float = 0.0
    redemption_estimated_spend: float = 0.0

    cost_per_message: float = 0.11
    cost_currency: str = "INR"
    billing_status: str = "estimated"