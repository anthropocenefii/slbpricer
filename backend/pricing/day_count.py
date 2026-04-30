"""Day count convention utilities."""

from datetime import date
from enum import Enum


class DayCount(str, Enum):
    ACT_ACT = "ACT/ACT"
    ACT_360 = "ACT/360"
    ACT_365 = "ACT/365"
    DC_30_360 = "30/360"


def _is_leap(year: int) -> bool:
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def _days_30_360(start: date, end: date) -> float:
    """US 30/360 day count (NASD)."""
    d1, m1, y1 = start.day, start.month, start.year
    d2, m2, y2 = end.day, end.month, end.year
    d1 = min(d1, 30)
    if d1 == 30:
        d2 = min(d2, 30)
    return float((y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1))


def year_fraction(start: date, end: date, convention: DayCount) -> float:
    """Compute the year fraction between two dates under a given convention."""
    if start >= end:
        return 0.0

    if convention == DayCount.ACT_360:
        return (end - start).days / 360.0

    if convention == DayCount.ACT_365:
        return (end - start).days / 365.0

    if convention == DayCount.DC_30_360:
        return _days_30_360(start, end) / 360.0

    # ACT/ACT ISDA: sum per-year fractions weighted by actual year length
    total = 0.0
    for y in range(start.year, end.year + 1):
        ys = date(y, 1, 1)
        ye = date(y + 1, 1, 1)
        s = max(start, ys)
        e = min(end, ye)
        if s < e:
            basis = 366.0 if _is_leap(y) else 365.0
            total += (e - s).days / basis
    return total


def accrued_fraction(
    prev_coupon: date,
    settlement: date,
    next_coupon: date,
    convention: DayCount,
) -> float:
    """
    Return the fraction of a coupon period that has accrued from prev_coupon to settlement.
    Used to compute accrued interest = periodic_coupon * accrued_fraction.
    """
    if convention == DayCount.ACT_ACT:
        period_days = (next_coupon - prev_coupon).days
        if period_days == 0:
            return 0.0
        return (settlement - prev_coupon).days / period_days

    if convention == DayCount.ACT_360:
        period_days_basis = (next_coupon - prev_coupon).days  # actual period length
        # Use actual/actual-of-period to stay consistent with coupon calculation
        # but ACT/360 accrual: days(prev, sett) / days(prev, next) stays consistent
        # Standard: accrual = actual_days / 360 * frequency, normalised to period fraction
        # Simplest: same as ACT/ACT for within-period fraction
        if period_days_basis == 0:
            return 0.0
        return (settlement - prev_coupon).days / period_days_basis

    if convention == DayCount.ACT_365:
        period_days_basis = (next_coupon - prev_coupon).days
        if period_days_basis == 0:
            return 0.0
        return (settlement - prev_coupon).days / period_days_basis

    # 30/360
    period_30 = _days_30_360(prev_coupon, next_coupon)
    if period_30 == 0:
        return 0.0
    return _days_30_360(prev_coupon, settlement) / period_30
