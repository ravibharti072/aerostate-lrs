from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from core.security import (
    check_store_access,
    get_current_db_user,
    get_current_user,
    is_superadmin_role,
)
from services.whatsapp_service import (
    build_redemption_points_preview,
    build_reward_points_preview,
    get_whatsapp_cost_currency,
    get_whatsapp_cost_per_message,
    normalize_indian_phone,
    safe_provider_response_text,
    send_redemption_points_whatsapp,
    send_reward_points_whatsapp,
)


router = APIRouter(
    prefix="/messages",
    tags=["Messages"],
)


BILLABLE_STATUSES = {"sent", "delivered", "read"}


def _safe_float(value, default: float = 0.0) -> float:
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        return default

    return number


def _get_log_message_cost(log: models.WhatsAppMessageLog) -> float:
    return _safe_float(getattr(log, "message_cost", 0.0), 0.0)


def _get_log_cost_currency(log: models.WhatsAppMessageLog) -> str:
    return getattr(log, "cost_currency", None) or get_whatsapp_cost_currency()


def _get_log_billing_status(log: models.WhatsAppMessageLog) -> str:
    return getattr(log, "billing_status", None) or "estimated"


def _is_billable_log(log: models.WhatsAppMessageLog) -> bool:
    return str(log.status or "").strip().lower() in BILLABLE_STATUSES


def _apply_send_result_to_log(
    *,
    log: models.WhatsAppMessageLog,
    result: dict,
) -> None:
    success = bool(result.get("success"))

    log.template_name = result.get("template_name")
    log.template_language = result.get("template_language")
    log.phone_number = result.get("normalized_phone") or log.phone_number
    log.provider_message_id = result.get("provider_message_id")
    log.provider_response = safe_provider_response_text(result.get("provider_response"))

    log.message_cost = _safe_float(result.get("message_cost"), 0.0)
    log.cost_currency = result.get("cost_currency") or get_whatsapp_cost_currency()
    log.billing_status = result.get(
        "billing_status",
        "estimated" if success else "not_billable_failed",
    )

    if success:
        log.status = "sent"
        log.error_message = None
        log.sent_at = datetime.now(timezone.utc)
    else:
        log.status = "failed"
        log.error_message = result.get("error_message") or "WhatsApp message failed"
        log.sent_at = None
        log.message_cost = 0.0
        log.billing_status = "not_billable_failed"


def _log_to_response(log: models.WhatsAppMessageLog) -> schemas.WhatsAppMessageLogResponse:
    return schemas.WhatsAppMessageLogResponse(
        id=log.id,
        store_id=log.store_id,
        customer_id=log.customer_id,
        reward_entry_id=log.reward_entry_id,
        payout_id=getattr(log, "payout_id", None),
        message_type=getattr(log, "message_type", None) or "reward_points",
        sent_by_user_id=log.sent_by_user_id,
        customer_name=getattr(log.customer, "name", None),
        store_name=getattr(log.store, "name", None),
        sent_by_username=getattr(log.sent_by_user, "username", None),
        phone_number=log.phone_number,
        template_name=log.template_name,
        template_language=log.template_language,
        message_preview=log.message_preview,
        added_points=_safe_float(getattr(log, "added_points", 0.0), 0.0),
        redeemed_points=_safe_float(getattr(log, "redeemed_points", 0.0), 0.0),
        payout_value=getattr(log, "payout_value", None),
        total_points=_safe_float(log.total_points, 0.0),
        message_cost=_get_log_message_cost(log),
        cost_currency=_get_log_cost_currency(log),
        billing_status=_get_log_billing_status(log),
        status=log.status,
        provider_message_id=log.provider_message_id,
        error_message=log.error_message,
        sent_at=log.sent_at,
        created_at=log.created_at,
    )


def _reward_send_response(
    *,
    log: models.WhatsAppMessageLog,
    reward_entry: models.RewardEntry,
    customer: models.Customer,
    success: bool,
) -> schemas.WhatsAppRewardSendResponse:
    return schemas.WhatsAppRewardSendResponse(
        success=success,
        log_id=log.id,
        message_type="reward_points",
        reward_entry_id=reward_entry.id,
        payout_id=None,
        customer_id=customer.id,
        customer_name=customer.name,
        phone_number=log.phone_number,
        added_points=_safe_float(log.added_points, 0.0),
        redeemed_points=0.0,
        payout_value=None,
        total_points=_safe_float(log.total_points, 0.0),
        message_cost=_get_log_message_cost(log),
        cost_currency=_get_log_cost_currency(log),
        billing_status=_get_log_billing_status(log),
        status=log.status,
        message_preview=log.message_preview,
        provider_message_id=log.provider_message_id,
        error_message=log.error_message,
        sent_at=log.sent_at,
    )


def _redemption_send_response(
    *,
    log: models.WhatsAppMessageLog,
    payout: models.Payout,
    customer: models.Customer,
    success: bool,
) -> schemas.WhatsAppRedemptionSendResponse:
    return schemas.WhatsAppRedemptionSendResponse(
        success=success,
        log_id=log.id,
        message_type="redemption_points",
        reward_entry_id=None,
        payout_id=payout.id,
        customer_id=customer.id,
        customer_name=customer.name,
        phone_number=log.phone_number,
        added_points=0.0,
        redeemed_points=_safe_float(log.redeemed_points, 0.0),
        payout_value=_safe_float(log.payout_value, 0.0),
        total_points=_safe_float(log.total_points, 0.0),
        message_cost=_get_log_message_cost(log),
        cost_currency=_get_log_cost_currency(log),
        billing_status=_get_log_billing_status(log),
        status=log.status,
        message_preview=log.message_preview,
        provider_message_id=log.provider_message_id,
        error_message=log.error_message,
        sent_at=log.sent_at,
    )


def _base_log_query_for_user(
    *,
    db: Session,
    current_user: dict,
    store_id: Optional[int] = None,
):
    query = db.query(models.WhatsAppMessageLog)

    if is_superadmin_role(current_user.get("role")):
        if store_id is not None:
            query = query.filter(models.WhatsAppMessageLog.store_id == store_id)
    else:
        query = query.filter(
            models.WhatsAppMessageLog.store_id == current_user.get("store_id")
        )

    return query


def send_reward_entry_whatsapp_core(
    *,
    reward_entry_id: int,
    allow_resend: bool,
    db: Session,
    current_user: dict,
) -> schemas.WhatsAppRewardSendResponse:
    db_user = get_current_db_user(db, current_user)

    reward_entry = db.query(models.RewardEntry).filter(
        models.RewardEntry.id == reward_entry_id
    ).first()

    if not reward_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reward entry not found",
        )

    check_store_access(current_user, reward_entry.store_id)

    customer = db.query(models.Customer).filter(
        models.Customer.id == reward_entry.customer_id
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    check_store_access(current_user, customer.store_id)

    if not customer.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer phone number is missing",
        )

    store = None

    if reward_entry.store_id is not None:
        store = db.query(models.Store).filter(
            models.Store.id == reward_entry.store_id
        ).first()

    store_name = getattr(store, "name", None) or "AeroState Rewards"

    existing_sent_log = db.query(models.WhatsAppMessageLog).filter(
        models.WhatsAppMessageLog.reward_entry_id == reward_entry.id,
        models.WhatsAppMessageLog.status.in_(["sent", "delivered", "read"]),
    ).order_by(
        desc(models.WhatsAppMessageLog.created_at)
    ).first()

    if existing_sent_log and not allow_resend:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "WhatsApp message already sent for this reward entry. "
                "Confirm resend to send again."
            ),
        )

    added_points = _safe_float(reward_entry.total_points, 0.0)
    total_points = _safe_float(customer.points_balance, 0.0)
    normalized_phone = normalize_indian_phone(customer.phone_number)

    message_preview = build_reward_points_preview(
        customer_name=customer.name,
        added_points=added_points,
        store_name=store_name,
        total_points=total_points,
    )

    log = models.WhatsAppMessageLog(
        store_id=reward_entry.store_id,
        customer_id=customer.id,
        reward_entry_id=reward_entry.id,
        payout_id=None,
        message_type="reward_points",
        sent_by_user_id=db_user.id,
        phone_number=normalized_phone,
        template_name=None,
        template_language=None,
        message_preview=message_preview,
        added_points=added_points,
        redeemed_points=0.0,
        payout_value=None,
        total_points=total_points,
        message_cost=0.0,
        cost_currency=get_whatsapp_cost_currency(),
        billing_status="pending",
        status="pending",
        provider_message_id=None,
        error_message=None,
        provider_response=None,
        sent_at=None,
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    result = send_reward_points_whatsapp(
        to_phone_number=customer.phone_number,
        customer_name=customer.name,
        added_points=added_points,
        store_name=store_name,
        total_points=total_points,
    )

    _apply_send_result_to_log(log=log, result=result)

    db.commit()
    db.refresh(log)

    return _reward_send_response(
        log=log,
        reward_entry=reward_entry,
        customer=customer,
        success=bool(result.get("success")),
    )


def send_payout_whatsapp_core(
    *,
    payout_id: int,
    allow_resend: bool,
    db: Session,
    current_user: dict,
) -> schemas.WhatsAppRedemptionSendResponse:
    db_user = get_current_db_user(db, current_user)

    payout = db.query(models.Payout).filter(
        models.Payout.id == payout_id
    ).first()

    if not payout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payout not found",
        )

    check_store_access(current_user, payout.store_id)

    customer = db.query(models.Customer).filter(
        models.Customer.id == payout.customer_id
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    check_store_access(current_user, customer.store_id)

    if not customer.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer phone number is missing",
        )

    store = None

    if payout.store_id is not None:
        store = db.query(models.Store).filter(
            models.Store.id == payout.store_id
        ).first()

    store_name = getattr(store, "name", None) or "AeroState Rewards"

    existing_sent_log = db.query(models.WhatsAppMessageLog).filter(
        models.WhatsAppMessageLog.payout_id == payout.id,
        models.WhatsAppMessageLog.message_type == "redemption_points",
        models.WhatsAppMessageLog.status.in_(["sent", "delivered", "read"]),
    ).order_by(
        desc(models.WhatsAppMessageLog.created_at)
    ).first()

    if existing_sent_log and not allow_resend:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "WhatsApp message already sent for this payout. "
                "Confirm resend to send again."
            ),
        )

    redeemed_points = _safe_float(payout.points_redeemed, 0.0)
    payout_value = _safe_float(payout.payout_value, 0.0)
    total_points = _safe_float(customer.points_balance, 0.0)
    normalized_phone = normalize_indian_phone(customer.phone_number)

    message_preview = build_redemption_points_preview(
        customer_name=customer.name,
        redeemed_points=redeemed_points,
        store_name=store_name,
        total_points=total_points,
        payout_value=payout_value,
    )

    log = models.WhatsAppMessageLog(
        store_id=payout.store_id,
        customer_id=customer.id,
        reward_entry_id=None,
        payout_id=payout.id,
        message_type="redemption_points",
        sent_by_user_id=db_user.id,
        phone_number=normalized_phone,
        template_name=None,
        template_language=None,
        message_preview=message_preview,
        added_points=0.0,
        redeemed_points=redeemed_points,
        payout_value=payout_value,
        total_points=total_points,
        message_cost=0.0,
        cost_currency=get_whatsapp_cost_currency(),
        billing_status="pending",
        status="pending",
        provider_message_id=None,
        error_message=None,
        provider_response=None,
        sent_at=None,
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    result = send_redemption_points_whatsapp(
        to_phone_number=customer.phone_number,
        customer_name=customer.name,
        redeemed_points=redeemed_points,
        store_name=store_name,
        total_points=total_points,
        payout_value=payout_value,
    )

    _apply_send_result_to_log(log=log, result=result)

    db.commit()
    db.refresh(log)

    return _redemption_send_response(
        log=log,
        payout=payout,
        customer=customer,
        success=bool(result.get("success")),
    )


@router.post(
    "/reward-entry/{reward_entry_id}/whatsapp/send",
    response_model=schemas.WhatsAppRewardSendResponse,
)
def send_reward_entry_whatsapp_message(
    reward_entry_id: int,
    request_data: Optional[schemas.WhatsAppRewardSendRequest] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    allow_resend = bool(getattr(request_data, "allow_resend", False))

    return send_reward_entry_whatsapp_core(
        reward_entry_id=reward_entry_id,
        allow_resend=allow_resend,
        db=db,
        current_user=current_user,
    )


@router.post(
    "/payout/{payout_id}/whatsapp/send",
    response_model=schemas.WhatsAppRedemptionSendResponse,
)
def send_payout_whatsapp_message(
    payout_id: int,
    request_data: Optional[schemas.WhatsAppRedemptionSendRequest] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    allow_resend = bool(getattr(request_data, "allow_resend", False))

    return send_payout_whatsapp_core(
        payout_id=payout_id,
        allow_resend=allow_resend,
        db=db,
        current_user=current_user,
    )


@router.get(
    "/logs",
    response_model=schemas.WhatsAppMessageLogListResponse,
)
def list_whatsapp_message_logs(
    store_id: Optional[int] = Query(default=None),
    customer_id: Optional[int] = Query(default=None),
    reward_entry_id: Optional[int] = Query(default=None),
    payout_id: Optional[int] = Query(default=None),
    message_type: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = _base_log_query_for_user(
        db=db,
        current_user=current_user,
        store_id=store_id,
    )

    if customer_id is not None:
        query = query.filter(models.WhatsAppMessageLog.customer_id == customer_id)

    if reward_entry_id is not None:
        query = query.filter(
            models.WhatsAppMessageLog.reward_entry_id == reward_entry_id
        )

    if payout_id is not None:
        query = query.filter(models.WhatsAppMessageLog.payout_id == payout_id)

    if message_type:
        query = query.filter(models.WhatsAppMessageLog.message_type == message_type)

    if status_filter:
        query = query.filter(models.WhatsAppMessageLog.status == status_filter)

    total = query.count()

    logs = query.order_by(
        desc(models.WhatsAppMessageLog.created_at)
    ).offset(skip).limit(limit).all()

    return schemas.WhatsAppMessageLogListResponse(
        total=total,
        logs=[_log_to_response(log) for log in logs],
    )


@router.get(
    "/spend-summary",
    response_model=schemas.WhatsAppSpendSummaryResponse,
)
def get_whatsapp_spend_summary(
    store_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = _base_log_query_for_user(
        db=db,
        current_user=current_user,
        store_id=store_id,
    )

    logs = query.all()

    summary = {
        "total_logs": 0,
        "total_messages": 0,
        "sent_messages": 0,
        "delivered_messages": 0,
        "read_messages": 0,
        "failed_messages": 0,
        "pending_messages": 0,
        "reward_messages": 0,
        "redemption_messages": 0,
        "billable_messages": 0,
        "total_estimated_spend": 0.0,
        "reward_estimated_spend": 0.0,
        "redemption_estimated_spend": 0.0,
        "cost_per_message": get_whatsapp_cost_per_message(),
        "cost_currency": get_whatsapp_cost_currency(),
        "billing_status": "estimated",
    }

    for log in logs:
        status_value = str(log.status or "pending").strip().lower()
        message_type = str(
            getattr(log, "message_type", None) or "reward_points"
        ).strip().lower()

        cost = _get_log_message_cost(log)

        summary["total_logs"] += 1
        summary["total_messages"] += 1

        if status_value == "sent":
            summary["sent_messages"] += 1
        elif status_value == "delivered":
            summary["delivered_messages"] += 1
        elif status_value == "read":
            summary["read_messages"] += 1
        elif status_value == "failed":
            summary["failed_messages"] += 1
        else:
            summary["pending_messages"] += 1

        if "redemption" in message_type or "payout" in message_type:
            summary["redemption_messages"] += 1
        else:
            summary["reward_messages"] += 1

        if status_value in BILLABLE_STATUSES:
            summary["billable_messages"] += 1
            summary["total_estimated_spend"] += cost

            if "redemption" in message_type or "payout" in message_type:
                summary["redemption_estimated_spend"] += cost
            else:
                summary["reward_estimated_spend"] += cost

    summary["total_estimated_spend"] = round(
        summary["total_estimated_spend"],
        2,
    )
    summary["reward_estimated_spend"] = round(
        summary["reward_estimated_spend"],
        2,
    )
    summary["redemption_estimated_spend"] = round(
        summary["redemption_estimated_spend"],
        2,
    )

    return schemas.WhatsAppSpendSummaryResponse(**summary)


@router.get(
    "/customer/{customer_id}",
    response_model=schemas.WhatsAppMessageLogListResponse,
)
def list_customer_whatsapp_message_logs(
    customer_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    check_store_access(current_user, customer.store_id)

    query = db.query(models.WhatsAppMessageLog).filter(
        models.WhatsAppMessageLog.customer_id == customer_id
    )

    total = query.count()

    logs = query.order_by(
        desc(models.WhatsAppMessageLog.created_at)
    ).offset(skip).limit(limit).all()

    return schemas.WhatsAppMessageLogListResponse(
        total=total,
        logs=[_log_to_response(log) for log in logs],
    )