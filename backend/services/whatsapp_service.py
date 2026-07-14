import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict, Optional


def _env_true(value: Optional[str]) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def whatsapp_enabled() -> bool:
    return _env_true(os.getenv("WHATSAPP_ENABLED", "false"))


def whatsapp_mock_enabled() -> bool:
    # Useful for local testing without real Meta API credentials.
    return _env_true(os.getenv("WHATSAPP_MOCK", "false"))


def get_whatsapp_cost_per_message() -> float:
    """
    Estimated cost per successful WhatsApp message.

    For your current plan:
    0.11 = ₹0.11 = 11 paisa per message.

    Put this in backend .env:
    WHATSAPP_COST_PER_MESSAGE=0.11
    """
    try:
        value = float(os.getenv("WHATSAPP_COST_PER_MESSAGE", "0.11") or 0.11)
    except (TypeError, ValueError):
        value = 0.11

    if value < 0:
        return 0.0

    return value


def get_whatsapp_cost_currency() -> str:
    return os.getenv("WHATSAPP_COST_CURRENCY", "INR").strip() or "INR"


def _billable_cost_for_result(success: bool, is_mock: bool = False) -> float:
    if is_mock:
        return 0.0

    if not success:
        return 0.0

    return get_whatsapp_cost_per_message()


def _billing_status_for_result(success: bool, is_mock: bool = False) -> str:
    if is_mock:
        return "mock"

    if success:
        return "estimated"

    return "not_billable_failed"


def format_points(value: Any) -> str:
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        return "0"

    if number.is_integer():
        return str(int(number))

    return f"{number:g}"


def format_money(value: Any) -> str:
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        number = 0.0

    return f"{number:.2f}"


def normalize_indian_phone(phone_number: str) -> str:
    """
    WhatsApp Cloud API expects country code without +.

    Examples:
    9876543210     -> 919876543210
    09876543210    -> 919876543210
    +91 9876543210 -> 919876543210
    """
    digits = "".join(ch for ch in str(phone_number or "") if ch.isdigit())

    if len(digits) == 10:
        return f"91{digits}"

    if len(digits) == 11 and digits.startswith("0"):
        return f"91{digits[1:]}"

    return digits


def build_reward_points_preview(
    customer_name: str,
    added_points: float,
    store_name: str,
    total_points: float,
) -> str:
    return (
        f"Dear {customer_name}, "
        f"{format_points(added_points)} reward points have been added to your account "
        f"at {store_name}. "
        f"Your total balance is {format_points(total_points)} points. "
        f"Thank you."
    )


def build_redemption_points_preview(
    customer_name: str,
    redeemed_points: float,
    store_name: str,
    total_points: float,
    payout_value: Optional[float] = None,
) -> str:
    return (
        f"Dear {customer_name}, "
        f"{format_points(redeemed_points)} reward points have been redeemed from your account "
        f"at {store_name}. "
        f"Your total balance is {format_points(total_points)} points. "
        f"Payout amount is ₹{format_money(payout_value)}. "
        f"Thank you."
    )


def _safe_json_text(data: Any, max_length: int = 2000) -> str:
    try:
        text = json.dumps(data, ensure_ascii=False)
    except Exception:
        text = str(data)

    if len(text) > max_length:
        return text[:max_length] + "...[truncated]"

    return text


def _extract_provider_message_id(response_data: Any) -> Optional[str]:
    if not isinstance(response_data, dict):
        return None

    messages = response_data.get("messages")

    if isinstance(messages, list) and messages:
        first_message = messages[0]

        if isinstance(first_message, dict):
            return first_message.get("id")

    return None


def _extract_whatsapp_error_message(error_data: Any, fallback: str) -> str:
    if not isinstance(error_data, dict):
        return fallback

    error = error_data.get("error")

    if isinstance(error, dict):
        message = error.get("message")
        error_type = error.get("type")
        error_code = error.get("code")
        error_subcode = error.get("error_subcode")

        parts = []

        if message:
            parts.append(str(message))

        if error_type:
            parts.append(f"type={error_type}")

        if error_code:
            parts.append(f"code={error_code}")

        if error_subcode:
            parts.append(f"subcode={error_subcode}")

        if parts:
            return " | ".join(parts)

    return fallback


def _base_response(
    *,
    success: bool,
    status: str,
    error_message: Optional[str],
    provider_message_id: Optional[str],
    provider_response: Any,
    template_name: str,
    template_language: str,
    normalized_phone: str,
    is_mock: bool = False,
) -> Dict[str, Any]:
    return {
        "success": success,
        "status": status,
        "error_message": error_message,
        "provider_message_id": provider_message_id,
        "provider_response": provider_response,
        "template_name": template_name,
        "template_language": template_language,
        "normalized_phone": normalized_phone,
        "message_cost": _billable_cost_for_result(success, is_mock=is_mock),
        "cost_currency": get_whatsapp_cost_currency(),
        "billing_status": _billing_status_for_result(success, is_mock=is_mock),
    }


def _send_whatsapp_template(
    *,
    to_phone_number: str,
    template_name: str,
    template_language: str,
    template_parameters: list[dict],
) -> Dict[str, Any]:
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()

    normalized_phone = normalize_indian_phone(to_phone_number)

    if not normalized_phone:
        return _base_response(
            success=False,
            status="failed",
            error_message="Customer phone number is missing",
            provider_message_id=None,
            provider_response=None,
            template_name=template_name,
            template_language=template_language,
            normalized_phone=normalized_phone,
        )

    if whatsapp_mock_enabled():
        return _base_response(
            success=True,
            status="sent",
            error_message=None,
            provider_message_id=f"mock_{template_name}_{normalized_phone}",
            provider_response={
                "mock": True,
                "to": normalized_phone,
                "template": template_name,
                "language": template_language,
                "parameters": template_parameters,
                "message_cost": 0.0,
                "cost_currency": get_whatsapp_cost_currency(),
                "billing_status": "mock",
            },
            template_name=template_name,
            template_language=template_language,
            normalized_phone=normalized_phone,
            is_mock=True,
        )

    if not whatsapp_enabled():
        return _base_response(
            success=False,
            status="failed",
            error_message=(
                "WhatsApp sending is disabled. "
                "Set WHATSAPP_ENABLED=true and WHATSAPP_MOCK=false in backend .env."
            ),
            provider_message_id=None,
            provider_response=None,
            template_name=template_name,
            template_language=template_language,
            normalized_phone=normalized_phone,
        )

    if not phone_number_id:
        return _base_response(
            success=False,
            status="failed",
            error_message="WHATSAPP_PHONE_NUMBER_ID is missing in backend .env.",
            provider_message_id=None,
            provider_response=None,
            template_name=template_name,
            template_language=template_language,
            normalized_phone=normalized_phone,
        )

    if not access_token:
        return _base_response(
            success=False,
            status="failed",
            error_message="WHATSAPP_ACCESS_TOKEN is missing in backend .env.",
            provider_message_id=None,
            provider_response=None,
            template_name=template_name,
            template_language=template_language,
            normalized_phone=normalized_phone,
        )

    graph_api_version = os.getenv("WHATSAPP_GRAPH_API_VERSION", "v20.0").strip()
    url = f"https://graph.facebook.com/{graph_api_version}/{phone_number_id}/messages"

    payload = {
        "messaging_product": "whatsapp",
        "to": normalized_phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {
                "code": template_language,
            },
            "components": [
                {
                    "type": "body",
                    "parameters": template_parameters,
                }
            ],
        },
    }

    request = urllib.request.Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw_body = response.read().decode("utf-8")
            response_data = json.loads(raw_body) if raw_body else {}

        return _base_response(
            success=True,
            status="sent",
            error_message=None,
            provider_message_id=_extract_provider_message_id(response_data),
            provider_response=response_data,
            template_name=template_name,
            template_language=template_language,
            normalized_phone=normalized_phone,
        )

    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")

        try:
            error_data = json.loads(error_body)
        except Exception:
            error_data = {"raw_error": error_body}

        return _base_response(
            success=False,
            status="failed",
            error_message=_extract_whatsapp_error_message(
                error_data,
                f"WhatsApp API error {exc.code}",
            ),
            provider_message_id=None,
            provider_response=error_data,
            template_name=template_name,
            template_language=template_language,
            normalized_phone=normalized_phone,
        )

    except Exception as exc:
        return _base_response(
            success=False,
            status="failed",
            error_message=str(exc),
            provider_message_id=None,
            provider_response=None,
            template_name=template_name,
            template_language=template_language,
            normalized_phone=normalized_phone,
        )


def send_reward_points_whatsapp(
    *,
    to_phone_number: str,
    customer_name: str,
    added_points: float,
    store_name: str,
    total_points: float,
) -> Dict[str, Any]:
    """
    Sends approved reward-points WhatsApp utility template from one central number.

    Required live .env:
    WHATSAPP_ENABLED=true
    WHATSAPP_MOCK=false
    WHATSAPP_ACCESS_TOKEN=...
    WHATSAPP_PHONE_NUMBER_ID=...
    WHATSAPP_TEMPLATE_REWARD_POINTS=reward_points_update
    WHATSAPP_TEMPLATE_LANGUAGE=en
    WHATSAPP_COST_PER_MESSAGE=0.11

    Local testing:
    WHATSAPP_MOCK=true
    """

    template_name = os.getenv(
        "WHATSAPP_TEMPLATE_REWARD_POINTS",
        os.getenv("WHATSAPP_REWARD_TEMPLATE", "reward_points_update"),
    ).strip()

    template_language = os.getenv(
        "WHATSAPP_TEMPLATE_LANGUAGE",
        "en",
    ).strip()

    template_parameters = [
        {
            "type": "text",
            "text": str(customer_name or "Customer"),
        },
        {
            "type": "text",
            "text": format_points(added_points),
        },
        {
            "type": "text",
            "text": str(store_name or "AeroState Rewards"),
        },
        {
            "type": "text",
            "text": format_points(total_points),
        },
    ]

    return _send_whatsapp_template(
        to_phone_number=to_phone_number,
        template_name=template_name,
        template_language=template_language,
        template_parameters=template_parameters,
    )


def send_redemption_points_whatsapp(
    *,
    to_phone_number: str,
    customer_name: str,
    redeemed_points: float,
    store_name: str,
    total_points: float,
    payout_value: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Sends approved redemption/payout WhatsApp utility template from one central number.

    Required live .env:
    WHATSAPP_ENABLED=true
    WHATSAPP_MOCK=false
    WHATSAPP_ACCESS_TOKEN=...
    WHATSAPP_PHONE_NUMBER_ID=...
    WHATSAPP_TEMPLATE_REDEMPTION_POINTS=redemption_points_update
    WHATSAPP_TEMPLATE_LANGUAGE=en
    WHATSAPP_COST_PER_MESSAGE=0.11

    Template body should match 5 variables:
    {{1}} Customer Name
    {{2}} Redeemed Points
    {{3}} Store Name
    {{4}} Total Points
    {{5}} Payout Amount
    """

    template_name = os.getenv(
        "WHATSAPP_TEMPLATE_REDEMPTION_POINTS",
        os.getenv(
            "WHATSAPP_REDEMPTION_TEMPLATE",
            os.getenv("WHATSAPP_TEMPLATE_PAYOUT_POINTS", "redemption_points_update"),
        ),
    ).strip()

    template_language = os.getenv(
        "WHATSAPP_TEMPLATE_LANGUAGE",
        "en",
    ).strip()

    template_parameters = [
        {
            "type": "text",
            "text": str(customer_name or "Customer"),
        },
        {
            "type": "text",
            "text": format_points(redeemed_points),
        },
        {
            "type": "text",
            "text": str(store_name or "AeroState Rewards"),
        },
        {
            "type": "text",
            "text": format_points(total_points),
        },
        {
            "type": "text",
            "text": format_money(payout_value),
        },
    ]

    return _send_whatsapp_template(
        to_phone_number=to_phone_number,
        template_name=template_name,
        template_language=template_language,
        template_parameters=template_parameters,
    )


def safe_provider_response_text(provider_response: Any) -> str:
    # Never include access token or secret here.
    return _safe_json_text(provider_response, max_length=2000)