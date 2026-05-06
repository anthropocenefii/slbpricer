"""Cash flow schedule generation for fixed-coupon bonds with step-up/step-down coupons."""

from datetime import date
from dateutil.relativedelta import relativedelta

from ..bond_models import StepUp


def _generate_coupon_dates(settlement: date, maturity: date, frequency: int) -> list[date]:
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
    all_dates = _generate_coupon_dates(settlement, maturity, frequency)
    future_dates = [d for d in all_dates if d > settlement]

    base_coupon = face_value * coupon_rate / frequency

    schedule: list[dict] = []
    for d in future_dates:
        coupon_deltas: list[tuple[float, float]] = []
        principal_deltas: list[tuple[float, float]] = []

        for su in step_ups:
            if su.start_date <= d <= su.end_date:
                if su.step_type == "principal_pct":
                    coupon_deltas.append((base_coupon * su.coupon_delta, su.probability))
                    if d == maturity:
                        principal_deltas.append((face_value * su.coupon_delta, su.probability))
                else:
                    coupon_deltas.append((face_value * su.coupon_delta / frequency, su.probability))

        expected_extra_coupon = sum(delta * prob for delta, prob in coupon_deltas)
        expected_extra_principal = sum(delta * prob for delta, prob in principal_deltas)

        base_principal = face_value if d == maturity else 0.0

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
    full = build_schedule(settlement, call_date, face_value, coupon_rate, frequency, [])

    if full:
        last = full[-1]
        full[-1] = {
            **last,
            "principal": call_price,
            "expected_principal": call_price,
            "expected_coupon": last["base_coupon"],
        }

    return full
