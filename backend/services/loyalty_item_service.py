from fastapi import HTTPException
from sqlalchemy.orm import Session

import models
from core.security import check_store_access


def get_loyalty_item_or_404(
    item_id: int,
    db: Session,
    current_user: dict,
):
    item = db.query(models.LoyaltyItem).filter(
        models.LoyaltyItem.id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Loyalty item not found",
        )

    check_store_access(current_user, item.store_id)

    return item