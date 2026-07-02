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
        return {
            "success": False,
            "status": "failed",
            "error_message": "Customer phone number is missing",
            "provider_message_id": None,
            "provider_response": None,
            "template_name": template_name,
            "template_language": template_language,
            "normalized_phone": normalized_phone,
        }

    if whatsapp_mock_enabled():
        return {
            "success": True,
            "status": "sent",
            "error_message": None,
            "provider_message_id": f"mock_{template_name}_{normalized_phone}",
            "provider_response": {
                "mock": True,
                "to": normalized_phone,
                "template": template_name,
                "language": template_language,
                "parameters": template_parameters,
            },
            "template_name": template_name,
            "template_language": template_language,
            "normalized_phone": normalized_phone,
        }

    if not whatsapp_enabled():
        return {
            "success": False,
            "status": "failed",
            "error_message": "WhatsApp sending is disabled. Set WHATSAPP_ENABLED=true in backend .env.",
            "provider_message_id": None,
            "provider_response": None,
            "template_name": template_name,
            "template_language": template_language,
            "normalized_phone": normalized_phone,
        }

    if not phone_number_id:
        return {
            "success": False,
            "status": "failed",
            "error_message": "WHATSAPP_PHONE_NUMBER_ID is missing in backend .env.",
            "provider_message_id": None,
            "provider_response": None,
            "template_name": template_name,
            "template_language": template_language,
            "normalized_phone": normalized_phone,
        }

    if not access_token:
        return {
            "success": False,
            "status": "failed",
            "error_message": "WHATSAPP_ACCESS_TOKEN is missing in backend .env.",
            "provider_message_id": None,
            "provider_response": None,
            "template_name": template_name,
            "template_language": template_language,
            "normalized_phone": normalized_phone,
        }

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

        return {
            "success": True,
            "status": "sent",
            "error_message": None,
            "provider_message_id": _extract_provider_message_id(response_data),
            "provider_response": response_data,
            "template_name": template_name,
            "template_language": template_language,
            "normalized_phone": normalized_phone,
        }

    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")

        try:
            error_data = json.loads(error_body)
        except Exception:
            error_data = {"raw_error": error_body}

        return {
            "success": False,
            "status": "failed",
            "error_message": f"WhatsApp API error {exc.code}",
            "provider_message_id": None,
            "provider_response": error_data,
            "template_name": template_name,
            "template_language": template_language,
            "normalized_phone": normalized_phone,
        }

    except Exception as exc:
        return {
            "success": False,
            "status": "failed",
            "error_message": str(exc),
            "provider_message_id": None,
            "provider_response": None,
            "template_name": template_name,
            "template_language": template_language,
            "normalized_phone": normalized_phone,
        }


def send_reward_points_whatsapp(
    *,
    to_phone_number: str,
    customer_name: str,
    added_points: float,
    store_name: str,
    total_points: float,
) -> Dict[str, Any]:
    """
    Sends approved reward-points WhatsApp utility template.

    Required live .env:
    WHATSAPP_ENABLED=true
    WHATSAPP_ACCESS_TOKEN=...
    WHATSAPP_PHONE_NUMBER_ID=...
    WHATSAPP_TEMPLATE_REWARD_POINTS=reward_points_update
    WHATSAPP_TEMPLATE_LANGUAGE=en

    Local testing:
    WHATSAPP_MOCK=true
    """

    template_name = os.getenv(
        "WHATSAPP_TEMPLATE_REWARD_POINTS",
        "reward_points_update",
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
    Sends approved redemption/payout WhatsApp utility template.

    Recommended live .env:
    WHATSAPP_ENABLED=true
    WHATSAPP_ACCESS_TOKEN=...
    WHATSAPP_PHONE_NUMBER_ID=...
    WHATSAPP_TEMPLATE_REDEMPTION_POINTS=redemption_points_update
    WHATSAPP_TEMPLATE_LANGUAGE=en

    Template body should match 5 variables:
    {{1}} Customer Name
    {{2}} Redeemed Points
    {{3}} Store Name
    {{4}} Total Points
    {{5}} Payout Amount
    """

    template_name = os.getenv(
        "WHATSAPP_TEMPLATE_REDEMPTION_POINTS",
        os.getenv("WHATSAPP_TEMPLATE_PAYOUT_POINTS", "redemption_points_update"),
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