export type DayCount = 'ACT/ACT' | 'ACT/360' | 'ACT/365' | '30/360'
export type Frequency = 1 | 2 | 4 | 12
export type StepType = 'coupon_delta' | 'principal_pct'

export interface StepUp {
  start_date: string   // ISO 8601 YYYY-MM-DD
  end_date: string
  coupon_delta: number // annual decimal; meaning depends on step_type
  probability: number  // 0–1
  step_type: StepType  // 'coupon_delta' = bps change to coupon rate; 'principal_pct' = % of outstanding principal
}

export interface CallOption {
  call_date: string
  call_price: number
}

export interface YieldCurvePoint {
  tenor: string  // "0d" | "1m" | "3m" | "6m" | "1y" | "2y" | "3y" | "5y" | "7y" | "10y" | "15y" | "20y"
  rate: number   // decimal
}

export interface BondPriceRequest {
  settlement_date: string
  maturity_date: string
  face_value: number
  coupon_rate: number       // decimal
  coupon_frequency: Frequency
  day_count: DayCount
  yield_rate?: number       // decimal; omitted in advanced (curve) mode
  step_ups: StepUp[]
  call_option?: CallOption | null
  yield_curve?: YieldCurvePoint[]
  z_spread?: number         // decimal; advanced mode only (e.g. 0.01 = 100 bps)
}

// ---- Response types ----

export interface ScenarioResult {
  label: string
  coupon_delta: number
  probability: number
  price: number
  clean_price: number
  pv_of_stepup: number
  certain_clean_price?: number
  spread_value_bps?: number
  yield_value_bps?: number
}

export interface CashFlowEntry {
  date: string
  base_coupon: number
  expected_coupon: number
  principal: number
  outstanding_principal: number
  discount_factor: number
  base_coupon_pv: number
  expected_coupon_pv: number
  principal_pv: number
  curve_rate?: number
}

export interface BondPriceResponse {
  base_price: number
  expected_price: number
  base_clean_price: number
  expected_clean_price: number
  accrued_interest: number
  scenario_results: ScenarioResult[]
  cashflow_schedule: CashFlowEntry[]
  has_principal_pct_steps?: boolean
  price_to_call: number | null
  clean_price_to_call: number | null
  step_up_spread_bps?: number
  step_up_yield_bps?: number
}
