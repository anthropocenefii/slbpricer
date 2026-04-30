"""Core bond pricing: flat yield (basic) or risk-free curve + z-spread (advanced)."""

from datetime import date

from ..models.bond import BondPriceRequest, CashFlowEntry, ScenarioResult, StepUp
from .cashflows import build_schedule, build_call_schedule, get_prev_next_coupon
from .day_count import DayCount, accrued_fraction, year_fraction


def _flat_df(
    settlement: date,
    cf_date: date,
    yield_rate: float,
    frequency: int,
    dc: DayCount,
) -> float:
    t = year_fraction(settlement, cf_date, dc)
    return (1.0 + yield_rate / frequency) ** (-frequency * t)


def _pv_flat(
    settlement: date,
    schedule: list[dict],
    yield_rate: float,
    frequency: int,
    dc: DayCount,
    use_expected: bool,
) -> float:
    total = 0.0
    for cf in schedule:
        df = _flat_df(settlement, cf["date"], yield_rate, frequency, dc)
        coupon = cf["expected_coupon"] if use_expected else cf["base_coupon"]
        total += (coupon + cf["principal"]) * df
    return total


def _scenario_price_flat(
    settlement: date,
    schedule: list[dict],
    su: StepUp,
    face_value: float,
    frequency: int,
    yield_rate: float,
    dc: DayCount,
) -> float:
    periodic_delta = face_value * su.coupon_delta / frequency
    total = 0.0
    for cf in schedule:
        df = _flat_df(settlement, cf["date"], yield_rate, frequency, dc)
        coupon = cf["base_coupon"] + (periodic_delta if su.start_date <= cf["date"] <= su.end_date else 0)
        total += (coupon + cf["principal"]) * df
    return total


def _compute_accrued(
    settlement: date,
    maturity: date,
    face_value: float,
    coupon_rate: float,
    frequency: int,
    dc: DayCount,
) -> float:
    prev, nxt = get_prev_next_coupon(settlement, maturity, frequency)
    periodic_coupon = face_value * coupon_rate / frequency
    frac = accrued_fraction(prev, settlement, nxt, dc)
    return periodic_coupon * frac


def price_bond(req: BondPriceRequest) -> dict:
    dc = DayCount(req.day_count)
    freq = req.coupon_frequency
    use_curve = req.yield_curve is not None

    schedule = build_schedule(
        req.settlement_date,
        req.maturity_date,
        req.face_value,
        req.coupon_rate,
        freq,
        req.step_ups,
    )

    accrued = _compute_accrued(
        req.settlement_date,
        req.maturity_date,
        req.face_value,
        req.coupon_rate,
        freq,
        dc,
    )

    # ── Pricing ──────────────────────────────────────────────────────────────
    curve = None
    curve_rate_map: dict[date, float] = {}
    z_input = req.z_spread or 0.0

    if use_curve:
        from .yield_curve import (
            parse_curve, interpolate_rate, curve_discount_factor,
            price_with_spread, price_scenario_with_spread, solve_zspread,
        )
        curve = parse_curve(req.yield_curve)
        for cf in schedule:
            t = year_fraction(req.settlement_date, cf["date"], dc)
            curve_rate_map[cf["date"]] = interpolate_rate(t, curve)

        base_dirty = price_with_spread(
            schedule, req.settlement_date, z_input, curve, freq, dc, use_expected=False
        )
        expected_dirty = price_with_spread(
            schedule, req.settlement_date, z_input, curve, freq, dc, use_expected=True
        )
    else:
        if req.yield_rate is None:
            raise ValueError("yield_rate is required in basic mode")
        base_dirty = _pv_flat(req.settlement_date, schedule, req.yield_rate, freq, dc, use_expected=False)
        expected_dirty = _pv_flat(req.settlement_date, schedule, req.yield_rate, freq, dc, use_expected=True)

    base_clean = base_dirty - accrued
    expected_clean = expected_dirty - accrued

    # ── Scenarios ─────────────────────────────────────────────────────────────
    scenario_rows: list[dict] = []
    for i, su in enumerate(req.step_ups):
        if use_curve:
            periodic_delta = req.face_value * su.coupon_delta / freq
            sp_certain = price_scenario_with_spread(
                schedule, su.start_date, su.end_date, periodic_delta,
                req.settlement_date, z_input, curve, freq, dc,
            )
        else:
            sp_certain = _scenario_price_flat(
                req.settlement_date, schedule, su,
                req.face_value, freq, req.yield_rate, dc,
            )

        pv_of_stepup = (sp_certain - base_dirty) * su.probability
        sp_weighted = base_dirty + pv_of_stepup
        label = (
            f"Step-{'up' if su.coupon_delta >= 0 else 'down'} {i + 1}: "
            f"{su.coupon_delta * 100:+.3f}% p.a. "
            f"({su.start_date} – {su.end_date})"
        )
        scenario_rows.append({
            "su": su,
            "sp_certain": sp_certain,
            "periodic_delta": req.face_value * su.coupon_delta / freq,
            "result": ScenarioResult(
                label=label,
                coupon_delta=su.coupon_delta,
                probability=su.probability,
                price=round(sp_weighted, 6),
                clean_price=round(sp_weighted - accrued, 6),
                pv_of_stepup=round(pv_of_stepup, 6),
                certain_clean_price=round(sp_certain - accrued, 6),
            ),
        })

    scenario_results = [row["result"] for row in scenario_rows]

    # ── Spread value of step-up features (advanced mode only) ─────────────────
    #
    # "What z-spread on the base bond would match the expected/scenario price at
    #  the input z-spread?"  The difference (z_input − z_base_match) in bps is
    #  how many bps the step-up feature is worth at the current spread level.
    #
    step_up_spread_bps = None

    if use_curve and req.step_ups:
        try:
            z_base_for_expected = solve_zspread(
                expected_dirty, schedule, req.settlement_date,
                curve, freq, dc, use_expected=False,
            )
            step_up_spread_bps = round((z_input - z_base_for_expected) * 10000, 2)
        except Exception:
            pass

        for row in scenario_rows:
            su = row["su"]
            try:
                z_base_for_scenario = solve_zspread(
                    row["result"].price, schedule, req.settlement_date,
                    curve, freq, dc, use_expected=False,
                )
                row["result"].spread_value_bps = round((z_input - z_base_for_scenario) * 10000, 2)
            except Exception:
                pass

    # ── Cash flow entries ─────────────────────────────────────────────────────
    cashflow_entries: list[CashFlowEntry] = []
    for cf in schedule:
        if use_curve:
            df = curve_discount_factor(req.settlement_date, cf["date"], z_input, curve, freq, dc)
        else:
            df = _flat_df(req.settlement_date, cf["date"], req.yield_rate, freq, dc)

        cashflow_entries.append(
            CashFlowEntry(
                date=cf["date"],
                base_coupon=round(cf["base_coupon"], 6),
                expected_coupon=round(cf["expected_coupon"], 6),
                principal=round(cf["principal"], 6),
                discount_factor=round(df, 6),
                base_coupon_pv=round(cf["base_coupon"] * df, 6),
                expected_coupon_pv=round(cf["expected_coupon"] * df, 6),
                principal_pv=round(cf["principal"] * df, 6),
                curve_rate=round(curve_rate_map[cf["date"]], 6) if cf["date"] in curve_rate_map else None,
            )
        )

    # ── Call option (basic mode only) ─────────────────────────────────────────
    price_to_call = None
    clean_price_to_call = None
    if req.call_option and not use_curve:
        co = req.call_option
        call_schedule = build_call_schedule(
            req.settlement_date,
            co.call_date,
            co.call_price,
            req.face_value,
            req.coupon_rate,
            freq,
        )
        ptc_dirty = _pv_flat(
            req.settlement_date, call_schedule, req.yield_rate, freq, dc, use_expected=False
        )
        price_to_call = round(ptc_dirty, 6)
        clean_price_to_call = round(ptc_dirty - accrued, 6)

    return dict(
        base_price=round(base_dirty, 6),
        expected_price=round(expected_dirty, 6),
        base_clean_price=round(base_clean, 6),
        expected_clean_price=round(expected_clean, 6),
        accrued_interest=round(accrued, 6),
        scenario_results=scenario_results,
        cashflow_schedule=cashflow_entries,
        price_to_call=price_to_call,
        clean_price_to_call=clean_price_to_call,
        step_up_spread_bps=step_up_spread_bps,
    )
