from datetime import date
from typing import Optional
from pydantic import BaseModel, field_validator


class StepUp(BaseModel):
    start_date: date
    end_date: date
    coupon_delta: float        # annual delta as decimal, e.g. 0.005 = +50 bps; negative = step-down
    probability: float = 0.5  # 0.0 – 1.0

    @field_validator("probability")
    @classmethod
    def prob_range(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("probability must be between 0 and 1")
        return v


class CallOption(BaseModel):
    call_date: date
    call_price: float = 100.0   # redemption price, usually par


class YieldCurvePoint(BaseModel):
    tenor: str   # "0d" | "1m" | "3m" | "6m" | "1y" | "2y" | "3y" | "5y" | "7y" | "10y" | "15y" | "20y"
    rate: float  # annual rate as decimal


class BondPriceRequest(BaseModel):
    settlement_date: date
    maturity_date: date
    face_value: float = 100.0
    coupon_rate: float
    coupon_frequency: int = 2
    day_count: str = "ACT/ACT"
    yield_rate: Optional[float] = None   # basic mode; omit in advanced mode
    step_ups: list[StepUp] = []
    call_option: Optional[CallOption] = None
    yield_curve: Optional[list[YieldCurvePoint]] = None
    z_spread: Optional[float] = 0.0     # advanced mode: constant spread added to every curve rate

    @field_validator("coupon_frequency")
    @classmethod
    def valid_frequency(cls, v: int) -> int:
        if v not in (1, 2, 4, 12):
            raise ValueError("coupon_frequency must be 1, 2, 4, or 12")
        return v


class ScenarioResult(BaseModel):
    label: str
    coupon_delta: float
    probability: float
    price: float
    clean_price: float
    pv_of_stepup: float
    certain_clean_price: Optional[float] = None  # clean price if this scenario occurs with certainty
    spread_value_bps: Optional[float] = None  # bps the step-up is worth at the input z-spread


class CashFlowEntry(BaseModel):
    date: date
    base_coupon: float
    expected_coupon: float
    principal: float
    discount_factor: float
    base_coupon_pv: float
    expected_coupon_pv: float
    principal_pv: float
    curve_rate: Optional[float] = None


class BondPriceResponse(BaseModel):
    base_price: float
    expected_price: float
    base_clean_price: float
    expected_clean_price: float
    accrued_interest: float
    scenario_results: list[ScenarioResult]
    cashflow_schedule: list[CashFlowEntry]
    price_to_call: Optional[float] = None
    clean_price_to_call: Optional[float] = None
    step_up_spread_bps: Optional[float] = None  # bps all step-ups combined are worth at input z-spread
