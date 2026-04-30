# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**slbpricer** is a full-stack bond pricing web application. It prices fixed-coupon bonds with optional step-up/step-down coupons and embedded call options. The core output is:
- Base bond price (plain fixed coupon)
- Price under each step-up/step-down scenario
- Probability-weighted price (expected value across scenarios)
- Present value of the step-up/step-down cash flows

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Python 3.11+ + FastAPI |
| Pricing math | NumPy, SciPy |
| Styling | Tailwind CSS |
| HTTP client | Axios |
| Charts | Recharts |

## Project Structure

```
slbpricer/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, route registration
│   ├── models/
│   │   └── bond.py              # Pydantic request/response models
│   ├── pricing/
│   │   ├── cashflows.py         # Cash flow schedule generation
│   │   ├── day_count.py         # Day count conventions (Act/Act, Act/360, 30/360, Act/365)
│   │   ├── bond_price.py        # Core discounting and PV calculation
│   │   └── call_option.py       # Embedded call option (callable bond) logic
│   ├── requirements.txt
│   └── tests/
│       └── test_pricing.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BondInputForm.tsx      # Settlement, maturity, coupon, face value, day count, yield
│   │   │   ├── StepUpConfigurator.tsx # Add/remove step-up or step-down periods with probability sliders
│   │   │   ├── CallOptionPanel.tsx    # Call date + call price inputs
│   │   │   └── ResultsPanel.tsx       # Base price, scenario prices, PV of step-up table + chart
│   │   ├── api/
│   │   │   └── pricer.ts             # Typed Axios calls to /api/price
│   │   ├── types/
│   │   │   └── bond.ts               # Shared TypeScript types mirroring Pydantic models
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── CLAUDE.md
```

## Commands

### Backend

```bash
# Install dependencies
cd backend && pip install -r requirements.txt

# Run dev server (reload on change)
uvicorn main:app --reload --port 8000

# Run tests
pytest tests/

# Run a single test
pytest tests/test_pricing.py::test_plain_bond_price -v
```

### Frontend

```bash
# Install dependencies
cd frontend && npm install

# Run dev server (proxies /api to localhost:8000)
npm run dev

# Build for production
npm run build

# Type-check without emitting
npm run typecheck

# Lint
npm run lint
```

## Pricing Domain Model

### Inputs

| Field | Notes |
|-------|-------|
| `settlement_date` | Date pricing is effective from |
| `maturity_date` | Final redemption date |
| `face_value` | Par / notional (e.g. 100) |
| `coupon_rate` | Annual coupon as decimal (e.g. 0.05 = 5%) |
| `coupon_frequency` | Payments per year: 1 (annual), 2 (semi-annual), 4 (quarterly) |
| `day_count` | `"ACT/ACT"`, `"ACT/360"`, `"ACT/365"`, `"30/360"` |
| `yield_rate` | Flat discount yield as decimal |
| `step_ups` | List of step-up/step-down periods (see below) |
| `call_option` | Optional call date + call price |

### Step-up/Step-down Structure

Each entry in `step_ups` has:
- `start_date` — first coupon date the new rate applies
- `end_date` — last coupon date the new rate applies (often maturity)
- `coupon_delta` — change in coupon rate (positive = step-up, negative = step-down)
- `probability` — float 0–1, default 0.5; probability this scenario occurs

Multiple non-overlapping or overlapping step periods are supported. The pricing engine computes an expected cash flow per period as:

```
CF_expected(t) = CF_base(t) + sum_over_scenarios[ delta_CF(t, s) * P(s) ]
```

### Call Option

The embedded call is priced using the yield-to-call method: compute the price assuming the bond is called at `call_price` on `call_date`, then report both yield-to-maturity price and yield-to-call price. The callable bond price is `min(price_to_maturity, price_to_call)` from the issuer's perspective.

### Key Calculation Flow

1. `cashflows.py` generates the coupon schedule (date, base coupon, effective coupon per scenario)
2. `day_count.py` computes year fractions between dates
3. `bond_price.py` discounts each cash flow: `PV = CF / (1 + y/freq)^(freq * t)`
4. Results include base price, per-scenario price, expected price, and the PV difference (value of step-up)

## API

### `POST /api/price`

Request body: `BondPriceRequest` (Pydantic model)
Response: `BondPriceResponse` with fields:
- `base_price` — price ignoring step-ups
- `scenario_prices` — list of `{label, price, pv_of_stepup, probability}`
- `expected_price` — probability-weighted price
- `cashflow_schedule` — list of dated cash flows for the chart

## Development Notes

- The Vite dev server proxies `/api/*` to `http://localhost:8000` — no CORS issues locally.
- All dates are transmitted as ISO 8601 strings (`YYYY-MM-DD`).
- Coupon rates and yields are always decimals server-side (not percentages); the frontend handles display conversion.
- Step-up probabilities are independent — the engine does not enforce that they sum to 1; it computes an expected value using each probability independently.
