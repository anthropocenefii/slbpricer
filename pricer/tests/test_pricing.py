"""Tests for the bond pricing engine."""

import pytest
from datetime import date

from pricer.bond_models import BondPriceRequest, StepUp, CallOption
from pricer.pricing.bond_price import price_bond
from pricer.pricing.day_count import DayCount, year_fraction, accrued_fraction


# ---------------------------------------------------------------------------
# Day count
# ---------------------------------------------------------------------------

class TestYearFraction:
    def test_act_360(self):
        yf = year_fraction(date(2024, 1, 1), date(2024, 7, 1), DayCount.ACT_360)
        assert abs(yf - 182 / 360) < 1e-10

    def test_act_365(self):
        yf = year_fraction(date(2024, 1, 1), date(2024, 7, 1), DayCount.ACT_365)
        assert abs(yf - 182 / 365) < 1e-10

    def test_30_360_full_year(self):
        yf = year_fraction(date(2024, 1, 1), date(2025, 1, 1), DayCount.DC_30_360)
        assert abs(yf - 1.0) < 1e-10

    def test_act_act_non_leap(self):
        yf = year_fraction(date(2023, 1, 1), date(2024, 1, 1), DayCount.ACT_ACT)
        assert abs(yf - 1.0) < 1e-10

    def test_same_date_zero(self):
        yf = year_fraction(date(2024, 6, 1), date(2024, 6, 1), DayCount.ACT_ACT)
        assert yf == 0.0


# ---------------------------------------------------------------------------
# Plain bond — at-par check
# ---------------------------------------------------------------------------

class TestPlainBond:
    """A bond priced at its coupon rate yield should be close to par."""

    def _par_request(self, day_count="ACT/ACT", frequency=2):
        return BondPriceRequest(
            settlement_date=date(2024, 1, 1),
            maturity_date=date(2029, 1, 1),
            face_value=100.0,
            coupon_rate=0.05,
            coupon_frequency=frequency,
            day_count=day_count,
            yield_rate=0.05,
            step_ups=[],
        )

    def test_par_price_semiannual(self):
        result = price_bond(self._par_request(frequency=2))
        assert abs(result["base_clean_price"] - 100.0) < 0.01

    def test_par_price_annual(self):
        result = price_bond(self._par_request(frequency=1))
        assert abs(result["base_clean_price"] - 100.0) < 0.01

    def test_higher_yield_below_par(self):
        req = self._par_request()
        req.yield_rate = 0.06
        result = price_bond(req)
        assert result["base_clean_price"] < 100.0

    def test_lower_yield_above_par(self):
        req = self._par_request()
        req.yield_rate = 0.04
        result = price_bond(req)
        assert result["base_clean_price"] > 100.0

    def test_no_step_ups_expected_equals_base(self):
        req = self._par_request()
        result = price_bond(req)
        assert result["base_price"] == result["expected_price"]


# ---------------------------------------------------------------------------
# Step-up / step-down
# ---------------------------------------------------------------------------

class TestStepUp:
    def _base_req(self):
        return BondPriceRequest(
            settlement_date=date(2024, 1, 1),
            maturity_date=date(2029, 1, 1),
            face_value=100.0,
            coupon_rate=0.05,
            coupon_frequency=2,
            day_count="ACT/ACT",
            yield_rate=0.05,
            step_ups=[],
        )

    def test_stepup_increases_expected_price(self):
        req = self._base_req()
        req.step_ups = [
            StepUp(start_date=date(2026, 1, 1), end_date=date(2029, 1, 1),
                   coupon_delta=0.01, probability=1.0)
        ]
        result = price_bond(req)
        assert result["expected_price"] > result["base_price"]

    def test_stepdown_decreases_expected_price(self):
        req = self._base_req()
        req.step_ups = [
            StepUp(start_date=date(2026, 1, 1), end_date=date(2029, 1, 1),
                   coupon_delta=-0.01, probability=1.0)
        ]
        result = price_bond(req)
        assert result["expected_price"] < result["base_price"]

    def test_probability_zero_no_effect(self):
        req = self._base_req()
        req.step_ups = [
            StepUp(start_date=date(2026, 1, 1), end_date=date(2029, 1, 1),
                   coupon_delta=0.02, probability=0.0)
        ]
        result = price_bond(req)
        assert abs(result["expected_price"] - result["base_price"]) < 1e-8

    def test_probability_half_midpoint(self):
        req_full = self._base_req()
        req_full.step_ups = [
            StepUp(start_date=date(2026, 1, 1), end_date=date(2029, 1, 1),
                   coupon_delta=0.01, probability=1.0)
        ]
        req_half = self._base_req()
        req_half.step_ups = [
            StepUp(start_date=date(2026, 1, 1), end_date=date(2029, 1, 1),
                   coupon_delta=0.01, probability=0.5)
        ]
        base = price_bond(self._base_req())["base_price"]
        full = price_bond(req_full)["expected_price"]
        half = price_bond(req_half)["expected_price"]
        assert abs(half - (base + full) / 2) < 1e-5

    def test_scenario_pv_matches_diff(self):
        req = self._base_req()
        req.step_ups = [
            StepUp(start_date=date(2026, 1, 1), end_date=date(2029, 1, 1),
                   coupon_delta=0.01, probability=0.5)
        ]
        result = price_bond(req)
        sr = result["scenario_results"][0]
        assert abs(sr.pv_of_stepup - (sr.price - result["base_price"])) < 1e-5


# ---------------------------------------------------------------------------
# Call option
# ---------------------------------------------------------------------------

class TestCallOption:
    def test_call_price_returned(self):
        req = BondPriceRequest(
            settlement_date=date(2024, 1, 1),
            maturity_date=date(2029, 1, 1),
            face_value=100.0,
            coupon_rate=0.05,
            coupon_frequency=2,
            day_count="ACT/ACT",
            yield_rate=0.05,
            step_ups=[],
            call_option=CallOption(call_date=date(2026, 7, 1), call_price=100.0),
        )
        result = price_bond(req)
        assert result["price_to_call"] is not None
        assert result["price_to_call"] > 0
