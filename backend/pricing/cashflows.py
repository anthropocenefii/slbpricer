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
      date            – coupon payment date
      base_coupon     – periodic coupon with no step-up (face * rate / freq)
      expected_coupon – base + Σ(delta_i * prob_i) for each applicable step-up
      principal       – face_value on maturity date, 0 otherwise
      step_up_deltas  – list of (periodic_delta_amount, probability) tuples
    """
    all_dates = _generate_coupon_dates(settlement, maturity, frequency)
    future_dates = [d for d in all_dates if d > settlement]

    periodic_coupon = face_value * coupon_rate / frequency

    schedule: list[dict] = []
    for d in future_dates:
        deltas: list[tuple[float, float]] = []
        for su in step_ups:
            if su.start_date <= d <= su.end_date:
                periodic_delta = face_value * su.coupon_delta / frequency
                deltas.append((periodic_delta, su.probability))

        expected_extra = sum(delta * prob for delta, prob in deltas)

        schedule.append(
            {
                "date": d,
                "base_coupon": periodic_coupon,
                "expected_coupon": periodic_coupon + expected_extra,
                "principal": face_value if d == maturity else 0.0,
                "step_up_deltas": deltas,
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
        full[-1] = {**last, "principal": call_price, "expected_coupon": last["base_coupon"]}

    return full
