from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Boolean
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

    # Decimal point balance supported.
    points_balance = Column(Float, default=0.0)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="customers")
    reward_entries = relationship("RewardEntry", back_populates="customer")
    point_transactions = relationship("PointTransaction", back_populates="customer")
    payouts = relationship("Payout", back_populates="customer")


# -----------------------------
# ITEM MASTER
# -----------------------------
class LoyaltyItem(Base):
    __tablename__ = "loyalty_items"

    id = Column(Integer, primary_key=True, index=True)

    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)

    item_name = Column(String, nullable=False)

    # For new Item Master, default category is "item".
    category = Column(String, nullable=False, default="item")

    # Optional SKU
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

    # Decimal total points supported.
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

    # This links each reward entry item row to its point transaction.
    # Needed for Transaction History edit:
    # edit product/unit/quantity -> auto update point transaction.
    point_transaction_id = Column(
        Integer,
        ForeignKey("point_transactions.id"),
        nullable=True,
    )

    unit = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)

    # Decimal points supported.
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

    # Optional item link from item master
    loyalty_item_id = Column(Integer, ForeignKey("loyalty_items.id"), nullable=True)

    # EARN, REDEEM, MANUAL_ADD, MANUAL_DEDUCT
    transaction_type = Column(String, nullable=False)

    # Decimal transaction points supported.
    points = Column(Float, nullable=False, default=0.0)

    # Optional amount used for old/manual point calculation
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

    # Decimal redeem points supported.
    points_redeemed = Column(Float, nullable=False, default=0.0)

    payout_value = Column(Float, nullable=True)

    status = Column(String, default="completed")
    note = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="payouts")
    customer = relationship("Customer", back_populates="payouts")