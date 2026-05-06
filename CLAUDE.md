# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**slbpricer** is a full-stack bond pricing web application structured as a Django applet, matching the conventions of the parent `portfolio_app`. It prices fixed-coupon bonds with optional step-up/step-down coupons and embedded call options.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + JavaScript + Vite |
| State | Zustand |
| Backend | Python 3.10+ + Django 5 |
| Pricing math | NumPy, SciPy, Pydantic |
| Styling | SCSS (global BEM, portfolio_app colour scheme) |
| HTTP client | Axios |
| Charts | Recharts |

## Project Structure

```
slbpricer/
├── manage.py
├── requirements.txt
├── slbpricer_project/           # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── pricer/                      # Django app
│   ├── views.py                 # index + /api/price + /api/health
│   ├── urls.py
│   ├── bond_models.py           # Pydantic request/response models
│   ├── pricing/
│   │   ├── bond_price.py        # Core discounting and PV calculation
│   │   ├── cashflows.py         # Cash flow schedule generation
│   │   ├── day_count.py         # Day count conventions
│   │   └── yield_curve.py       # Curve interpolation and z-spread solving
│   └── templates/pricer/
│       └── index.html           # Django template mounting React app
├── static/                      # Vite build output (gitignored)
├── frontend/
│   ├── vite.config.mjs          # Multi-entry Vite config (mirrors portfolio_app)
│   ├── package.json             # JS only — zustand, sass, react 19, recharts
│   ├── applets/slb_pricer/src/
│   │   ├── main.jsx             # createRoot → #slb-pricer-app, exposes window.initialiseSLBPricer
│   │   ├── App.jsx              # Layout, form submission, reads from Zustand
│   │   ├── api/pricer.js        # axios.post('/api/price', req)
│   │   ├── store/useBondStore.js # All state + actions (Zustand)
│   │   └── components/
│   │       ├── BondInputForm.jsx
│   │       ├── StepUpConfigurator.jsx
│   │       ├── CallOptionPanel.jsx
│   │       ├── YieldCurvePanel.jsx
│   │       └── ResultsPanel.jsx
│   └── css/
│       ├── main.scss            # @use "components"
│       ├── styles.js            # Vite entry for SCSS bundle
│       └── components/
│           ├── _index.scss
│           └── _slb-pricer.scss # All BEM styles for the applet
└── backend/                     # LEGACY FastAPI — superseded by pricer/ Django app
```

## Commands

### Backend (Django)

```bash
# Install dependencies
pip install -r requirements.txt

# Run dev server
python manage.py runserver 8000

# System check
python manage.py check
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run Vite dev server (proxies /api → Django :8000)
npm run dev

# Production build (outputs to ../static/)
npm run build
```

### Development workflow

Run both servers simultaneously:
- Django: `python manage.py runserver 8000`
- Vite: `cd frontend && npm run dev`

Navigate to `http://localhost:8000` (Django serves the page). Vite dev server on :5173 handles HMR and proxies `/api/` to Django. When `frontend/vite-dev.json` exists, Django's `views._get_vite_assets()` switches to dev mode and loads assets from :5173.

## Styling conventions (match portfolio_app)

- Colour palette: `#024059` primary, `#f7a918` accent, `#3f7e97` border
- BEM naming: `.slb-pricer__header`, `.slb-card--active`
- No CSS Modules — all styles global in `_slb-pricer.scss`
- Font: Source Sans 3

## Vite aliases

| Alias | Path |
|-------|------|
| `@slb` | `applets/slb_pricer/src` |
| `@slb_components` | `applets/slb_pricer/src/components` |
| `@slb_store` | `applets/slb_pricer/src/store` |
| `@scss` | `css` |

## API

### `POST /api/price`

Request body: `BondPriceRequest` (Pydantic model in `pricer/bond_models.py`)
Response: `BondPriceResponse` with fields:
- `base_price`, `base_clean_price` — price ignoring step-ups
- `expected_price`, `expected_clean_price` — probability-weighted price
- `scenario_results` — per-scenario breakdown
- `cashflow_schedule` — dated cash flows for the chart
- `accrued_interest`, `price_to_call`, `step_up_yield_bps`, `step_up_spread_bps`

## Development Notes

- All dates transmitted as ISO 8601 strings (`YYYY-MM-DD`).
- Coupon rates and yields are always decimals server-side; the frontend divides/multiplies by 100 for display.
- Step-up probabilities are independent — the engine computes an expected value using each probability independently.
- The `backend/` folder contains the superseded FastAPI implementation and can be deleted.
