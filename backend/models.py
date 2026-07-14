from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database import Base


# -----------------------------
# STORE MODEL
# -----------------------------
class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    business_type = Column(String, nullable=True)

    owner_name = Column(String, nullable=True)
    owner_phone = Column(String, nullable=True)
    owner_email = Column(String, nullable=True)

    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    pincode = Column(String, nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="store")
    customers = relationship("Customer", back_populates="store")
    loyalty_items = relationship("LoyaltyItem", back_populates="store")
    reward_entries = relationship("RewardEntry", back_populates="store")
    point_transactions = relationship("PointTransaction", back_populates="store")
    payouts = relationship("Payout", back_populates="store")

    whatsapp_message_logs = relationship(
        "WhatsAppMessageLog",
        back_populates="store",
        cascade="all, delete-orphan",
    )


# -----------------------------
# USER MODEL
# -----------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)

    role = Column(String, nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="users")

    whatsapp_message_logs = relationship(
        "WhatsAppMessageLog",
        back_populates="sent_by_user",
    )


# -----------------------------
# CUSTOMER DIRECTORY
# -----------------------------
class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)

    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)

    name = Column(String, nullable=False)
    phone_number = Column(String, unique=True, nullable=False)
    address = Column(String, nullable=True)
    aadhaar_number = Column(String, nullable=True)
    pan_number = Column(String, nullable=True)
    bank_account_number = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    ifsc_code = Column(String, nullable=True)

    points_balance = Column(Float, default=0.0)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="customers")
    reward_entries = relationship("RewardEntry", back_populates="customer")
    point_transactions = relationship("PointTransaction", back_populates="customer")
    payouts = relationship("Payout", back_populates="customer")

    whatsapp_message_logs = relationship(
        "WhatsAppMessageLog",
        back_populates="customer",
        cascade="all, delete-orphan",
    )


# -----------------------------
# ITEM MASTER
# -----------------------------
class LoyaltyItem(Base):
    __tablename__ = "loyalty_items"

    id = Column(Integer, primary_key=True, index=True)

    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)

    item_name = Column(String, nullable=False)
    category = Column(String, nullable=False, default="item")

    sku = Column(String, index=True, nullable=True)

    unit = Column(String, nullable=False, default="pcs", server_default="pcs")

    # In this LRS, this is used as points per unit.
    # Example: 10.5 points per kg.
    per_point_amount = Column(Float, nullable=False, default=0.0)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="loyalty_items")
    reward_entry_items = relationship("RewardEntryItem", back_populates="loyalty_item")
    point_transactions = relationship("PointTransaction", back_populates="loyalty_item")


# -----------------------------
# REWARD ENTRY MASTER
# One reward entry can contain multiple item rows.
# -----------------------------
class RewardEntry(Base):
    __tablename__ = "reward_entries"

    id = Column(Integer, primary_key=True, index=True)

    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    total_points = Column(Float, nullable=False, default=0.0)

    note = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="reward_entries")
    customer = relationship("Customer", back_populates="reward_entries")

    items = relationship(
        "RewardEntryItem",
        back_populates="reward_entry",
        cascade="all, delete-orphan",
    )

    whatsapp_message_logs = relationship(
        "WhatsAppMessageLog",
        back_populates="reward_entry",
        cascade="all, delete-orphan",
    )


# -----------------------------
# REWARD ENTRY ITEMS
# Each selected item inside one reward entry.
# -----------------------------
class RewardEntryItem(Base):
    __tablename__ = "reward_entry_items"

    id = Column(Integer, primary_key=True, index=True)

    reward_entry_id = Column(
        Integer,
        ForeignKey("reward_entries.id", ondelete="CASCADE"),
        nullable=False,
    )

    loyalty_item_id = Column(
        Integer,
        ForeignKey("loyalty_items.id"),
        nullable=False,
    )

    point_transaction_id = Column(
        Integer,
        ForeignKey("point_transactions.id"),
        nullable=True,
    )

    unit = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)

    points_per_unit = Column(Float, nullable=False, default=0.0)
    total_points = Column(Float, nullable=False, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reward_entry = relationship("RewardEntry", back_populates="items")
    loyalty_item = relationship("LoyaltyItem", back_populates="reward_entry_items")
    point_transaction = relationship("PointTransaction", back_populates="reward_entry_items")


# -----------------------------
# POINTS HISTORY / TRANSACTIONS
# Frontend name: Transaction History
# -----------------------------
class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(Integer, primary_key=True, index=True)

    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    loyalty_item_id = Column(Integer, ForeignKey("loyalty_items.id"), nullable=True)

    # EARN, REDEEM, MANUAL_ADD, MANUAL_DEDUCT
    transaction_type = Column(String, nullable=False)

    points = Column(Float, nullable=False, default=0.0)

    amount = Column(Float, nullable=True)

    note = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="point_transactions")
    customer = relationship("Customer", back_populates="point_transactions")
    loyalty_item = relationship("LoyaltyItem", back_populates="point_transactions")

    reward_entry_items = relationship(
        "RewardEntryItem",
        back_populates="point_transaction",
    )


# -----------------------------
# PAYOUT / REDEMPTION
# -----------------------------
class Payout(Base):
    __tablename__ = "payouts"

    id = Column(Integer, primary_key=True, index=True)

    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    points_redeemed = Column(Float, nullable=False, default=0.0)

    payout_value = Column(Float, nullable=True)

    status = Column(String, default="completed")
    note = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="payouts")
    customer = relationship("Customer", back_populates="payouts")

    whatsapp_message_logs = relationship(
        "WhatsAppMessageLog",
        back_populates="payout",
        cascade="all, delete-orphan",
    )


# -----------------------------
# WHATSAPP MESSAGE LOGS
# For reward point and redemption/payout messages.
# -----------------------------
class WhatsAppMessageLog(Base):
    __tablename__ = "whatsapp_message_logs"

    id = Column(Integer, primary_key=True, index=True)

    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    # Reward message link
    reward_entry_id = Column(
        Integer,
        ForeignKey("reward_entries.id"),
        nullable=True,
    )

    # Redemption / payout message link
    payout_id = Column(
        Integer,
        ForeignKey("payouts.id"),
        nullable=True,
    )

    # reward_points / redemption_points
    message_type = Column(String, nullable=False, default="reward_points")

    # Software user who clicked Send WhatsApp
    sent_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Customer phone used for sending
    phone_number = Column(String, nullable=False)

    # WhatsApp Cloud API template details
    template_name = Column(String, nullable=True)
    template_language = Column(String, nullable=True, default="en")

    # Message preview saved for history/report.
    # Actual WhatsApp API sends approved template variables.
    message_preview = Column(Text, nullable=True)

    # Reward transaction values at sending time
    added_points = Column(Float, nullable=False, default=0.0)

    # Redemption transaction values at sending time
    redeemed_points = Column(Float, nullable=False, default=0.0)
    payout_value = Column(Float, nullable=True)

    # Customer total balance after transaction
    total_points = Column(Float, nullable=False, default=0.0)

    # WhatsApp message cost tracking.
    # For now this is estimated cost based on configured provider rate.
    # Example: 0.11 means ₹0.11 / 11 paisa per message.
    message_cost = Column(Float, nullable=False, default=0.11)
    cost_currency = Column(String, nullable=False, default="INR")
    billing_status = Column(String, nullable=False, default="estimated")

    # pending, sent, delivered, read, failed
    status = Column(String, nullable=False, default="pending")

    # WhatsApp/Meta message id after successful API call
    provider_message_id = Column(String, nullable=True)

    # Store error if API fails
    error_message = Column(Text, nullable=True)

    # Raw small provider response/error summary for debugging.
    # Do not store access token or secrets here.
    provider_response = Column(Text, nullable=True)

    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="whatsapp_message_logs")
    customer = relationship("Customer", back_populates="whatsapp_message_logs")
    reward_entry = relationship("RewardEntry", back_populates="whatsapp_message_logs")
    payout = relationship("Payout", back_populates="whatsapp_message_logs")
    sent_by_user = relationship("User", back_populates="whatsapp_message_logs")