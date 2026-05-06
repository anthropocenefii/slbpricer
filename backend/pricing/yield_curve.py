"""Yield curve interpolation and z-spread solving."""

from datetime import date

from scipy.optimize import brentq

from .day_count import DayCount, year_fraction


def _tenor_to_years(tenor: str) -> float:
    t = tenor.strip().lower()
    if t == '0d':
        return 0.0
    if t.endswith('d'):
        return int(t[:-1]) / 365.0
    if t.endswith('m'):
        return int(t[:-1]) / 12.0
    if t.endswith('y'):
        return float(t[:-1])
    raise ValueError(f"Unrecognised tenor: '{tenor}'")


def parse_curve(points: list) -> list[tuple[float, float]]:
    """Convert YieldCurvePoint list to sorted [(tenor_years, rate)] pairs."""
    parsed = [(_tenor_to_years(p.tenor), p.rate) for p in points]
    return sorted(parsed, key=lambda x: x[0])


def interpolate_rate(tenor_years: float, curve: list[tuple[float, float]]) -> float:
    """Linear interpolation between knots; flat extrapolation beyond endpoints."""
    if tenor_years <= curve[0][0]:
        return curve[0][1]
    if tenor_years >= curve[-1][0]:
        return curve[-1][1]
    for i in range(len(curve) - 1):
        t0, r0 = curve[i]
        t1, r1 = curve[i + 1]
        if t0 <= tenor_years <= t1:
            w = (tenor_years - t0) / (t1 - t0)
            return r0 + w * (r1 - r0)
    return curve[-1][1]


def curve_discount_factor(
    settlement: date,
    cf_date: date,
    spread: float,
    curve: list[tuple[float, float]],
    frequency: int,
    dc: DayCount,
) -> float:
    t = year_fraction(settlement, cf_date, dc)
    if t <= 0:
        return 1.0
    rf = interpolate_rate(t, curve)
    return (1.0 + (rf + spread) / frequency) ** (-frequency * t)


def price_with_spread(
    schedule: list[dict],
    settlement: date,
    spread: float,
    curve: list[tuple[float, float]],
    frequency: int,
    dc: DayCount,
    use_expected: bool,
) -> float:
    total = 0.0
    for cf in schedule:
        df = curve_discount_factor(settlement, cf["date"], spread, curve, frequency, dc)
        coupon = cf["expected_coupon"] if use_expected else cf["base_coupon"]
        # Use expected_principal (includes principal_pct step-up effects) when pricing expected
        principal = cf.get("expected_principal", cf["principal"]) if use_expected else cf["principal"]
        total += (coupon + principal) * df
    return total


def price_scenario_with_spread(
    schedule: list[dict],
    su_start: date,
    su_end: date,
    periodic_delta: float,
    settlement: date,
    spread: float,
    curve: list[tuple[float, float]],
    frequency: int,
    dc: DayCount,
    principal_delta: float = 0.0,
) -> float:
    total = 0.0
    for cf in schedule:
        df = curve_discount_factor(settlement, cf["date"], spread, curve, frequency, dc)
        in_step = su_start <= cf["date"] <= su_end
        coupon = cf["base_coupon"] + (periodic_delta if in_step else 0)
        # principal_delta applies at the maturity date (where base principal > 0)
        principal = cf["principal"] + (principal_delta if (in_step and cf["principal"] > 0) else 0)
        total += (coupon + principal) * df
    return total


def solve_zspread(
    target: float,
    schedule: list[dict],
    settlement: date,
    curve: list[tuple[float, float]],
    frequency: int,
    dc: DayCount,
    use_expected: bool = True,
) -> float:
    def f(s):
        return price_with_spread(schedule, settlement, s, curve, frequency, dc, use_expected) - target
    return brentq(f, -0.5, 2.0, xtol=1e-9)


def solve_zspread_scenario(
    target: float,
    schedule: list[dict],
    su_start: date,
    su_end: date,
    periodic_delta: float,
    settlement: date,
    curve: list[tuple[float, float]],
    frequency: int,
    dc: DayCount,
) -> float:
    def f(s):
        return price_scenario_with_spread(
            schedule, su_start, su_end, periodic_delta, settlement, s, curve, frequency, dc
        ) - target
    return brentq(f, -0.5, 2.0, xtol=1e-9)
