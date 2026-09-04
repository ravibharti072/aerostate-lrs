from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, not_, cast, Date, text
from datetime import datetime, timedelta

from database import get_db
from models import (
    Customer,
    LoyaltyItem,
    RewardEntry,
    RewardEntryItem,
    Payout,
    PointTransaction,
    WhatsAppMessageLog,
)
from core.security import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

SUCCESS_WA_STATUSES = ["sent", "delivered", "read"]
COMPLETED_WA_STATUSES = ["sent", "delivered", "read", "failed"]


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    today = datetime.now().date()
    thirty_days_ago = datetime.now() - timedelta(days=30)
    sixty_days_ago = datetime.now() - timedelta(days=60)

    store_id = current_user.get("store_id")

    # --- 1. Fetch Core Dashboard Stats ---
    q_customers = db.query(Customer)
    q_items = db.query(LoyaltyItem)

    if store_id:
        q_customers = q_customers.filter(Customer.store_id == store_id)
        q_items = q_items.filter(LoyaltyItem.store_id == store_id)

    total_customers = q_customers.count()
    total_items = q_items.count()

    q_points = db.query(func.sum(Customer.points_balance))
    if store_id:
        q_points = q_points.filter(Customer.store_id == store_id)
    total_points = q_points.scalar() or 0.0

    q_tx = db.query(PointTransaction)
    if store_id:
        q_tx = q_tx.filter(PointTransaction.store_id == store_id)

    all_txs = q_tx.all()

    total_issued = 0.0
    total_payouts = 0.0
    last_30_points = 0.0
    prev_30_points = 0.0

    for tx in all_txs:
        t_type = str(tx.transaction_type or "").upper()
        pts = abs(float(tx.points or 0.0))
        is_debit = "DEBIT" in t_type or "REDEEM" in t_type

        if is_debit:
            total_payouts += pts
        else:
            total_issued += pts
            if tx.created_at:
                tx_dt = tx.created_at.replace(tzinfo=None) if hasattr(tx.created_at, "replace") else tx.created_at
                if tx_dt >= thirty_days_ago:
                    last_30_points += pts
                elif sixty_days_ago <= tx_dt < thirty_days_ago:
                    prev_30_points += pts

    q_today_entries = db.query(RewardEntry).filter(func.date(RewardEntry.created_at) == today)
    q_today_points = db.query(func.sum(PointTransaction.points)).filter(
        func.date(PointTransaction.created_at) == today,
        not_(PointTransaction.transaction_type.ilike("%DEBIT%")),
        not_(PointTransaction.transaction_type.ilike("%REDEEM%"))
    )

    if store_id:
        q_today_entries = q_today_entries.filter(RewardEntry.store_id == store_id)
        q_today_points = q_today_points.filter(PointTransaction.store_id == store_id)

    today_entries = q_today_entries.count()
    today_points = q_today_points.scalar() or 0.0

    # --- 2. Top Customer ---
    q_top_customer = (
        db.query(Customer.name, func.sum(RewardEntry.total_points).label("total"))
        .join(RewardEntry, Customer.id == RewardEntry.customer_id)
        .filter(func.date(RewardEntry.created_at) == today)
    )
    if store_id:
        q_top_customer = q_top_customer.filter(RewardEntry.store_id == store_id)

    top_customer_record = q_top_customer.group_by(Customer.id, Customer.name).order_by(desc("total")).first()
    top_customer = top_customer_record.name if top_customer_record else "No Activity"

    # --- 3. Top Item ---
    q_top_item = (
        db.query(LoyaltyItem.item_name, func.sum(RewardEntryItem.quantity).label("qty"))
        .join(RewardEntryItem, LoyaltyItem.id == RewardEntryItem.loyalty_item_id)
        .join(RewardEntry, RewardEntry.id == RewardEntryItem.reward_entry_id)
        .filter(func.date(RewardEntry.created_at) == today)
    )
    if store_id:
        q_top_item = q_top_item.filter(RewardEntry.store_id == store_id)

    top_item_record = q_top_item.group_by(LoyaltyItem.id, LoyaltyItem.item_name).order_by(desc("qty")).first()
    top_item = top_item_record.item_name if top_item_record else "No Activity"

    issued_growth_percent = 0
    if prev_30_points > 0:
        issued_growth_percent = round(((last_30_points - prev_30_points) / prev_30_points) * 100)
    elif last_30_points > 0:
        issued_growth_percent = 100
    if issued_growth_percent > 999:
        issued_growth_percent = 999

    # --- 4. TOP CUSTOMERS LIST ---
    top_customers_list = []
    try:
        q_top_4_cust = db.query(Customer).order_by(desc(Customer.points_balance))
        if store_id:
            q_top_4_cust = q_top_4_cust.filter(Customer.store_id == store_id)

        for c in q_top_4_cust.limit(4).all():
            top_customers_list.append({
                "name": c.name or "Unknown",
                "subtext": c.phone_number or "No Phone",
                "value": float(c.points_balance or 0.0)
            })
    except Exception:
        pass

    # --- 5. TOP ITEM PERFORMANCE ---
    top_items_list = []
    try:
        q_top_4_items = (
            db.query(
                LoyaltyItem.item_name,
                func.sum(RewardEntryItem.quantity).label("total_qty")
            )
            .join(RewardEntryItem, LoyaltyItem.id == RewardEntryItem.loyalty_item_id)
            .join(RewardEntry, RewardEntry.id == RewardEntryItem.reward_entry_id)
        )

        if store_id:
            q_top_4_items = q_top_4_items.filter(RewardEntry.store_id == store_id)

        q_top_4_items = q_top_4_items.group_by(LoyaltyItem.id, LoyaltyItem.item_name).order_by(desc("total_qty"))

        for row in q_top_4_items.limit(4).all():
            top_items_list.append({
                "name": row.item_name or "Unknown Item",
                "subtext": "Most Rewarded",
                "value": float(row.total_qty or 0.0)
            })
    except Exception:
        pass

    # --- 6. DYNAMIC TOTAL VALUE EQUIVALENT ---
    setting = db.execute(
        text("""
            SELECT setting_value FROM app_settings
            WHERE setting_key = 'point_value_rupees'
            AND ((:store_id IS NULL AND store_id IS NULL) OR store_id = :store_id)
            ORDER BY id DESC LIMIT 1
        """),
        {"store_id": store_id},
    ).fetchone()

    point_value = float(setting[0]) if setting else 1.0

    total_amount_value = float(total_issued) * point_value
    total_redeemed_value = float(total_payouts) * point_value
    total_remaining_value = float(total_points) * point_value

    # --- 7. WHATSAPP MESSAGE CENTER DATA (SYNCED WITH MESSAGES.PY) ---
    whatsapp_pending = []
    whatsapp_sent = []
    wa_pending_count = 0
    wa_sent_count = 0
    wa_total_spend = 0.0

    try:
        q_wa = db.query(WhatsAppMessageLog)
        if store_id:
            q_wa = q_wa.filter(WhatsAppMessageLog.store_id == store_id)

        all_wa_logs = q_wa.all()

        # Identify strictly verified sent messages
        valid_sent_logs = []
        for l in all_wa_logs:
            st = str(l.status or "").strip().lower()
            has_id = bool(getattr(l, "provider_message_id", None))
            has_sent_at = bool(getattr(l, "sent_at", None))
            
            # Accepted statuses: sent/delivered/read or verified by provider response
            if st in SUCCESS_WA_STATUSES or (st != "failed" and (has_id or has_sent_at)):
                valid_sent_logs.append(l)

        wa_sent_count = len(valid_sent_logs)

        # Calculate actual spend directly from logs with standard rate fallback
        computed_spend = 0.0
        for l in valid_sent_logs:
            cost = float(getattr(l, "message_cost", 0.0) or 0.0)
            if cost <= 0.0:
                cost = 0.88  # Official Cloud API rate per verified conversation
            computed_spend += cost

        wa_total_spend = round(computed_spend, 2)

        # Unsent pending rewards & payouts
        sent_reward_ids = [
            l.reward_entry_id for l in valid_sent_logs if l.reward_entry_id is not None
        ]
        sent_payout_ids = [
            l.payout_id for l in valid_sent_logs if l.payout_id is not None
        ]

        q_pending_rewards = db.query(RewardEntry)
        if store_id:
            q_pending_rewards = q_pending_rewards.filter(RewardEntry.store_id == store_id)
        if sent_reward_ids:
            q_pending_rewards = q_pending_rewards.filter(~RewardEntry.id.in_(sent_reward_ids))

        q_pending_payouts = db.query(Payout)
        if store_id:
            q_pending_payouts = q_pending_payouts.filter(Payout.store_id == store_id)
        if sent_payout_ids:
            q_pending_payouts = q_pending_payouts.filter(~Payout.id.in_(sent_payout_ids))

        wa_pending_count = q_pending_rewards.count() + q_pending_payouts.count()

        unsent_rewards = q_pending_rewards.order_by(desc(RewardEntry.created_at)).limit(3).all()
        unsent_payouts = q_pending_payouts.order_by(desc(Payout.created_at)).limit(3).all()

        all_pending_items = []
        for pr in unsent_rewards:
            cust_name = pr.customer.name if pr.customer else "Unknown"
            dt = pr.created_at
            time_str = dt.strftime("%d %b, %I:%M %p") if dt else "Queued"
            all_pending_items.append({
                "name": cust_name,
                "type": "Reward Points",
                "time": time_str,
                "status": "pending",
                "dt": dt
            })

        for pp in unsent_payouts:
            cust_name = pp.customer.name if pp.customer else "Unknown"
            dt = pp.created_at
            time_str = dt.strftime("%d %b, %I:%M %p") if dt else "Queued"
            all_pending_items.append({
                "name": cust_name,
                "type": "Redemption Points",
                "time": time_str,
                "status": "pending",
                "dt": dt
            })

        all_pending_items.sort(key=lambda x: x["dt"] if x["dt"] else datetime.min, reverse=True)
        for item in all_pending_items[:3]:
            whatsapp_pending.append({
                "name": item["name"],
                "type": item["type"],
                "time": item["time"],
                "status": item["status"]
            })

        # Latest sent records list
        valid_sent_logs.sort(key=lambda x: x.created_at if x.created_at else datetime.min, reverse=True)
        for wa in valid_sent_logs[:3]:
            cust_name = "Unknown"
            if wa.customer_id:
                cust = db.query(Customer).filter(Customer.id == wa.customer_id).first()
                if cust:
                    cust_name = cust.name

            time_str = ""
            if wa.created_at:
                try:
                    time_str = wa.created_at.strftime("%d %b, %I:%M %p")
                except AttributeError:
                    time_str = str(wa.created_at)[:16]

            msg_type = str(wa.message_type).replace("_", " ").title() if wa.message_type else "Notification"

            whatsapp_sent.append({
                "name": cust_name,
                "type": msg_type,
                "time": time_str,
                "status": wa.status
            })

    except Exception as e:
        print(f"[Warning] Failed to fetch WhatsApp logs: {e}")

    # --- 8. RECENT REDEMPTIONS ---
    recent_redemptions = []
    try:
        q_payouts = db.query(Payout)
        if store_id:
            q_payouts = q_payouts.filter(Payout.store_id == store_id)

        latest_payouts = q_payouts.order_by(desc(Payout.created_at)).limit(3).all()
        for p in latest_payouts:
            cust_name = "Unknown"
            if p.customer_id:
                cust = db.query(Customer).filter(Customer.id == p.customer_id).first()
                if cust:
                    cust_name = cust.name

            time_str = ""
            if p.created_at:
                try:
                    time_str = p.created_at.strftime("%d %b, %I:%M %p")
                except AttributeError:
                    time_str = str(p.created_at)[:16]

            recent_redemptions.append({
                "id": p.id,
                "name": cust_name,
                "points": float(p.points_redeemed or 0.0),
                "value": float(p.payout_value or 0.0),
                "time": time_str
            })
    except Exception as e:
        print(f"[Warning] Failed to fetch recent redemptions: {e}")

    return {
        "totalCustomers": total_customers,
        "totalItems": total_items,
        "totalPoints": float(total_points),
        "totalPayouts": float(total_payouts),
        "totalIssued": float(total_issued),
        "issuedGrowthPercent": issued_growth_percent,
        "todayPoints": float(today_points),
        "todayEntries": today_entries,
        "topCustomer": top_customer,
        "topItem": top_item,
        "topCustomersList": top_customers_list,
        "topItemsList": top_items_list,
        "totalAmountValue": total_amount_value,
        "totalRedeemedValue": total_redeemed_value,
        "totalRemainingValue": total_remaining_value,
        "whatsappPending": whatsapp_pending,
        "whatsappSent": whatsapp_sent,
        "whatsappPendingCount": wa_pending_count,
        "whatsappSentCount": wa_sent_count,
        "whatsappSpend": wa_total_spend,
        "whatsappSpendRate": 0.88,
        "recentRedemptions": recent_redemptions
    }


@router.get("/daily-points-chart")
def get_daily_points_chart(
    period: str = "daily",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    store_id = current_user.get("store_id")
    today = datetime.now().date()
    chart_data = []

    if period == "weekly":
        start_date = today - timedelta(weeks=11)
        q = db.query(
            cast(PointTransaction.created_at, Date).label("tx_date"),
            PointTransaction.points,
            PointTransaction.transaction_type
        ).filter(
            cast(PointTransaction.created_at, Date) >= start_date,
            not_(PointTransaction.transaction_type.ilike("%DEBIT%")),
            not_(PointTransaction.transaction_type.ilike("%REDEEM%"))
        )
        if store_id:
            q = q.filter(PointTransaction.store_id == store_id)

        all_rows = q.all()

        weekly_map = {}
        for row in all_rows:
            if row.tx_date:
                week_start = row.tx_date - timedelta(days=row.tx_date.weekday())
                weekly_map[week_start] = weekly_map.get(week_start, 0.0) + float(row.points or 0.0)

        for i in range(11, -1, -1):
            current_week_start = today - timedelta(days=today.weekday())
            w_date = current_week_start - timedelta(weeks=i)
            date_str = f"W{w_date.isocalendar()[1]} ({w_date.strftime('%b')})"
            chart_data.append({
                "date": date_str,
                "points": weekly_map.get(w_date, 0.0)
            })

    elif period == "monthly":
        for i in range(11, -1, -1):
            target_year = today.year
            target_month = today.month - i
            while target_month <= 0:
                target_month += 12
                target_year -= 1
            while target_month > 12:
                target_month -= 12
                target_year += 1

            month_start = datetime(target_year, target_month, 1).date()
            if target_month == 12:
                next_month = datetime(target_year + 1, 1, 1).date()
            else:
                next_month = datetime(target_year, target_month + 1, 1).date()

            q = db.query(func.sum(PointTransaction.points)).filter(
                cast(PointTransaction.created_at, Date) >= month_start,
                cast(PointTransaction.created_at, Date) < next_month,
                not_(PointTransaction.transaction_type.ilike("%DEBIT%")),
                not_(PointTransaction.transaction_type.ilike("%REDEEM%"))
            )
            if store_id:
                q = q.filter(PointTransaction.store_id == store_id)
            total_pts = q.scalar() or 0.0
            chart_data.append({
                "date": month_start.strftime("%b %Y"),
                "points": float(total_pts)
            })

    else:
        thirty_days_ago = today - timedelta(days=29)
        q = db.query(
            cast(PointTransaction.created_at, Date).label("tx_date"),
            func.sum(PointTransaction.points).label("total_points")
        ).filter(
            cast(PointTransaction.created_at, Date) >= thirty_days_ago,
            not_(PointTransaction.transaction_type.ilike("%DEBIT%")),
            not_(PointTransaction.transaction_type.ilike("%REDEEM%"))
        )

        if store_id:
            q = q.filter(PointTransaction.store_id == store_id)

        results = q.group_by(cast(PointTransaction.created_at, Date)).all()
        points_map = {row.tx_date: float(row.total_points or 0.0) for row in results}

        for i in range(29, -1, -1):
            d = today - timedelta(days=i)
            date_str = d.strftime("%b %d")
            chart_data.append({
                "date": date_str,
                "points": points_map.get(d, 0.0)
            })

    return chart_data


@router.get("/recent-activity")
def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        store_id = current_user.get("store_id")

        q = db.query(PointTransaction).order_by(desc(PointTransaction.created_at))

        if store_id:
            q = q.filter(PointTransaction.store_id == store_id)

        q = q.limit(5)

        results = []
        for tx in q.all():
            customer_name = "Unknown"
            if getattr(tx, "customer_id", None):
                customer = db.query(Customer).filter(Customer.id == tx.customer_id).first()
                if customer:
                    customer_name = customer.name

            tx_type = str(getattr(tx, "transaction_type", "")).upper()
            is_debit = "REDEEM" in tx_type or "DEBIT" in tx_type

            item_str = "Points Redeemed" if is_debit else "Points Earned"

            if not is_debit and getattr(tx, "reward_entry_id", None):
                r_items = db.query(RewardEntryItem).filter(RewardEntryItem.reward_entry_id == tx.reward_entry_id).all()
                item_names = []
                for ri in r_items:
                    l_item = db.query(LoyaltyItem).filter(LoyaltyItem.id == ri.loyalty_item_id).first()
                    if l_item and getattr(l_item, "item_name", None):
                        item_names.append(l_item.item_name)
                if item_names:
                    item_str = ", ".join(item_names)

            time_str = ""
            if tx.created_at:
                if isinstance(tx.created_at, str):
                    try:
                        dt = datetime.strptime(tx.created_at[:19], "%Y-%m-%d %H:%M:%S")
                        time_str = dt.strftime("%I:%M %p")
                    except Exception:
                        time_str = tx.created_at[11:16]
                else:
                    time_str = tx.created_at.strftime("%I:%M %p")

            pts = abs(float(getattr(tx, "points", 0.0)))
            pts_display = int(pts) if pts.is_integer() else pts
            final_points_str = f"-{pts_display}" if is_debit else f"+{pts_display}"

            results.append({
                "id": getattr(tx, "id", None) or str(pts_display),
                "customer": customer_name,
                "item": item_str,
                "points": final_points_str,
                "time": time_str,
                "is_debit": is_debit
            })

        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        return []