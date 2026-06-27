from sqlalchemy.orm import Session
from database import SessionLocal, Base, engine
from models import User, Store
from passlib.context import CryptContext

# Create tables if they do not exist
Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db: Session = SessionLocal()

SUPERADMIN_USERNAME = "asladmin"
SUPERADMIN_PASSWORD = "Admin@123"

# Optional: create a default store for local testing
store = db.query(Store).filter(Store.name == "Default Store").first()

if not store:
    store = Store(
        name="Default Store",
        business_type="Retail"
    )
    db.add(store)
    db.commit()
    db.refresh(store)
    print("Default store created successfully.")

hashed_password = pwd_context.hash(SUPERADMIN_PASSWORD)

user = db.query(User).filter(User.username == SUPERADMIN_USERNAME).first()

if user:
    user.password_hash = hashed_password
    user.role = "SuperAdmin"
    user.store_id = store.id
    print("Super admin password reset successfully.")
else:
    user = User(
        username=SUPERADMIN_USERNAME,
        password_hash=hashed_password,
        role="SuperAdmin",
        store_id=store.id
    )
    db.add(user)
    print("Super admin created successfully.")

db.commit()
db.close()

print("Login with:")
print("Username:", SUPERADMIN_USERNAME)
print("Password:", SUPERADMIN_PASSWORD)