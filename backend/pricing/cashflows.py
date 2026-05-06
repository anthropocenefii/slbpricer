"""Cash flow schedule generation for fixed-coupon bonds with step-up/step-down coupons."""

from datetime import date
from dateutil.relativedelta import relativedelta

from ..models.bond import StepUp


def _generate_coupon_dates(settlement: date, maturity: date, frequency: int) -> list[date]:
    """
    Generate coupon dates by stepping backward from maturity.
    The first entry is the last coupon date on or before settlement (accrual period start).
    """
    months = 12 // frequency
    dates: list[date] = []
    d = maturity
    while d > settlement:
        dates.append(d)
        d = d - relativedelta(months=months)
    dates.append(d)
    dates.reverse()
    return dates


def get_prev_next_coupon(
    settlement: date, maturity: date, frequency: int
) -> tuple[date, date]:
    """Return (previous_coupon_date, next_coupon_date) relative to settlement."""
    dates = _generate_coupon_dates(settlement, maturity, frequency)
    prev = dates[0]
    nxt = dates[1] if len(dates) > 1 else maturity
    return prev, nxt


def build_schedule(
    settlement: date,
    maturity: date,
    face_value: float,
    coupon_rate: float,
    frequency: int,
    step_ups: list[StepUp],
) -> list[dict]:
    """
    Build the full cash flow schedule for each coupon date after settlement.

    Each entry:
      date                 – coupon payment date
      base_coupon          – periodic coupon with no step-up (face * rate / freq)
      expected_coupon      – base + probability-weighted coupon deltas
      principal            – base redemption: face_value at maturity, 0 otherwise
      expected_principal   – probability-weighted redemption (includes principal_pct step-ups)
      outstanding_principal– expected face value outstanding at this date (for display)
      step_up_deltas       – list of (periodic_coupon_delta, probability) tuples

    Step type semantics
    -------------------
    coupon_delta  : coupon rate changes by `coupon_delta` p.a.
                    periodic_coupon_delta = face_value * coupon_delta / frequency
    principal_pct : face value changes by `coupon_delta` fraction from start_date.
                    new_face = face_value * (1 + coupon_delta)
                    periodic_coupon_delta = base_coupon * coupon_delta
                    redemption_delta      = face_value * coupon_delta (at maturity only)
    """
    all_dates = _generate_coupon_dates(settlement, maturity, frequency)
    future_dates = [d for d in all_dates if d > settlement]

    base_coupon = face_value * coupon_rate / frequency

    schedule: list[dict] = []
    for d in future_dates:
        coupon_deltas: list[tuple[float, float]] = []   # (delta_amount, probability)
        principal_deltas: list[tuple[float, float]] = []  # (delta_amount, prob) at maturity only

        for su in step_ups:
            if su.start_date <= d <= su.end_date:
                if su.step_type == "principal_pct":
                    # Coupon proportionally increases with face value
                    coupon_deltas.append((base_coupon * su.coupon_delta, su.probability))
                    # Redemption increases at maturity
                    if d == maturity:
                        principal_deltas.append((face_value * su.coupon_delta, su.probability))
                else:
                    coupon_deltas.append((face_value * su.coupon_delta / frequency, su.probability))

        expected_extra_coupon = sum(delta * prob for delta, prob in coupon_deltas)
        expected_extra_principal = sum(delta * prob for delta, prob in principal_deltas)

        base_principal = face_value if d == maturity else 0.0

        # Expected outstanding = face + weighted face-value changes from active principal_pct steps
        outstanding_delta = sum(
            face_value * su.coupon_delta * su.probability
            for su in step_ups
            if su.step_type == "principal_pct" and su.start_date <= d <= su.end_date
        )

        schedule.append(
            {
                "date": d,
                "base_coupon": base_coupon,
                "expected_coupon": base_coupon + expected_extra_coupon,
                "principal": base_principal,
                "expected_principal": base_principal + expected_extra_principal,
                "outstanding_principal": face_value + outstanding_delta,
                "step_up_deltas": coupon_deltas,
            }
        )

    return schedule


def build_call_schedule(
    settlement: date,
    call_date: date,
    call_price: float,
    face_value: float,
    coupon_rate: float,
    frequency: int,
) -> list[dict]:
    """
    Build a truncated schedule ending at call_date with redemption = call_price.
    Step-ups are excluded from YTC calculation (assumes bond is called before they apply).
    """
    full = build_schedule(settlement, call_date, face_value, coupon_rate, frequency, [])

    # Replace principal on the last entry with call_price
    if full:
        last = full[-1]
        full[-1] = {
            **last,
            "principal": call_price,
            "expected_principal": call_price,
            "expected_coupon": last["base_coupon"],
        }

    return full
