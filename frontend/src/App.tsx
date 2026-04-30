import { useState } from 'react'
import { BondInputForm } from './components/BondInputForm'
import type { BondBasicInputs } from './components/BondInputForm'
import { StepUpConfigurator } from './components/StepUpConfigurator'
import { CallOptionPanel } from './components/CallOptionPanel'
import { ResultsPanel } from './components/ResultsPanel'
import { YieldCurvePanel, DEFAULT_CURVE } from './components/YieldCurvePanel'
import type { YieldCurveEntry } from './components/YieldCurvePanel'
import { priceBond } from './api/pricer'
import type { BondPriceResponse, CallOption, StepUp } from './types/bond'

const DEFAULT_BOND: BondBasicInputs = {
  settlement_date: '2024-01-01',
  maturity_date: '2029-01-01',
  face_value: 100,
  coupon_rate: 5,
  coupon_frequency: 2,
  day_count: 'ACT/ACT',
  yield_rate: 5,
}

const DEFAULT_CALL: CallOption = {
  call_date: '2027-01-01',
  call_price: 100,
}

export default function App() {
  const [bond, setBond] = useState<BondBasicInputs>(DEFAULT_BOND)
  const [stepUps, setStepUps] = useState<StepUp[]>([])
  const [callEnabled, setCallEnabled] = useState(false)
  const [callOption, setCallOption] = useState<CallOption>(DEFAULT_CALL)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [yieldCurve, setYieldCurve] = useState<YieldCurveEntry[]>(DEFAULT_CURVE)
  const [zSpread, setZSpread] = useState(0)
  const [result, setResult] = useState<BondPriceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await priceBond({
        settlement_date: bond.settlement_date,
        maturity_date: bond.maturity_date,
        face_value: bond.face_value,
        coupon_rate: bond.coupon_rate / 100,
        coupon_frequency: bond.coupon_frequency,
        day_count: bond.day_count,
        yield_rate: advancedMode ? undefined : bond.yield_rate / 100,
        step_ups: stepUps,
        call_option: callEnabled ? callOption : null,
        yield_curve: advancedMode
          ? yieldCurve.map(p => ({ tenor: p.tenor, rate: p.rate / 100 }))
          : undefined,
        z_spread: advancedMode ? zSpread / 10000 : undefined,
      })
      setResult(res)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { detail?: string } } }
        setError(axErr.response?.data?.detail ?? 'Pricing failed.')
      } else {
        setError('Could not reach the pricing server. Is the backend running?')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-6 py-4 shadow-md">
        <h1 className="text-xl font-bold tracking-tight">SLB Bond Pricer</h1>
        <p className="text-indigo-200 text-sm mt-0.5">
          Fixed-coupon bonds with step-up / step-down coupons and embedded call options
        </p>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-6 flex gap-6 items-start">
        <form onSubmit={handleSubmit} className="w-96 shrink-0 flex flex-col gap-5">

          {/* Bond basics */}
          <section className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Bond Details</h2>
              <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setAdvancedMode(false)}
                  className={`px-3 py-1 transition-colors ${
                    !advancedMode
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Basic
                </button>
                <button
                  type="button"
                  onClick={() => setAdvancedMode(true)}
                  className={`px-3 py-1 transition-colors border-l border-gray-200 ${
                    advancedMode
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Advanced
                </button>
              </div>
            </div>
            <BondInputForm value={bond} onChange={setBond} hideYieldRate={advancedMode} />
          </section>

          {/* Risk-free curve (advanced only) */}
          {advancedMode && (
            <section className="rounded-xl bg-white border border-indigo-100 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">
                Risk-Free Yield Curve
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Rates used to interpolate discount factors. Z-spread is the constant spread over
                these rates that matches the market yield.
              </p>
              <YieldCurvePanel
                curve={yieldCurve}
                onChange={setYieldCurve}
                zSpread={zSpread}
                onZSpreadChange={setZSpread}
              />
            </section>
          )}

          {/* Step-ups */}
          <section className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Step-up / Step-down Coupons
            </h2>
            <StepUpConfigurator
              stepUps={stepUps}
              onChange={setStepUps}
              settlementDate={bond.settlement_date}
              maturityDate={bond.maturity_date}
            />
          </section>

          {/* Call option */}
          <section className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Call Option</h2>
            <CallOptionPanel
              enabled={callEnabled}
              value={callOption}
              onToggle={setCallEnabled}
              onChange={setCallOption}
              settlementDate={bond.settlement_date}
              maturityDate={bond.maturity_date}
            />
          </section>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow transition-colors"
          >
            {loading ? 'Calculating…' : 'Price Bond'}
          </button>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>

        {/* Results panel */}
        <div className="flex-1 min-w-0">
          {result ? (
            <ResultsPanel result={result} zSpreadBps={advancedMode ? zSpread : undefined} />
          ) : (
            <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
              <p className="text-sm">Fill in the bond details and click "Price Bond"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
