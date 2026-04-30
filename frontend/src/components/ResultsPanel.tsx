import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { BondPriceResponse } from '../types/bond'

interface Props {
  result: BondPriceResponse
  zSpreadBps?: number
}

function fmt(n: number, dp = 4) {
  return n.toFixed(dp)
}

function fmtBps(n: number | undefined | null, dp = 1) {
  if (n == null) return '—'
  return `${n.toFixed(dp)} bps`
}

function PriceCard({
  label,
  dirty,
  clean,
  accent = false,
}: {
  label: string
  dirty: number
  clean: number
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-4 flex flex-col gap-1 shadow-sm border ${
        accent
          ? 'bg-indigo-600 text-white border-indigo-700'
          : 'bg-white text-gray-800 border-gray-200'
      }`}
    >
      <span className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-indigo-200' : 'text-gray-500'}`}>
        {label}
      </span>
      <span className="text-2xl font-bold">{fmt(clean)}</span>
      <span className={`text-xs ${accent ? 'text-indigo-200' : 'text-gray-400'}`}>
        Clean &nbsp;|&nbsp; Dirty: {fmt(dirty)}
      </span>
    </div>
  )
}

function DeltaCard({
  label,
  value,
  subtitle,
}: {
  label: string
  value: number
  subtitle?: string
}) {
  const pos = value >= 0
  return (
    <div
      className={`rounded-xl p-4 flex flex-col gap-1 shadow-sm border ${
        pos ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}
    >
      <span className={`text-xs font-semibold uppercase tracking-wide ${pos ? 'text-green-600' : 'text-red-500'}`}>
        {label}
      </span>
      <span className={`text-2xl font-bold ${pos ? 'text-green-700' : 'text-red-600'}`}>
        {pos ? '+' : ''}{fmt(value)}
      </span>
      {subtitle && (
        <span className={`text-xs ${pos ? 'text-green-500' : 'text-red-400'}`}>{subtitle}</span>
      )}
    </div>
  )
}

export function ResultsPanel({ result, zSpreadBps }: Props) {
  const hasCurve = result.cashflow_schedule.some(cf => cf.curve_rate != null)
  const hasScenarios = result.scenario_results.length > 0
  const scenarioHasSpread = hasScenarios && result.scenario_results[0].spread_value_bps != null
  const stepUpValuePrice = result.expected_clean_price - result.base_clean_price

  const chartData = result.cashflow_schedule.map(cf => ({
    date: cf.date.slice(0, 7),
    'Base coupon': parseFloat(cf.base_coupon.toFixed(4)),
    'Exp. coupon': parseFloat(cf.expected_coupon.toFixed(4)),
    'Principal': cf.principal > 0 ? parseFloat(cf.principal.toFixed(4)) : null,
  }))

  return (
    <div className="flex flex-col gap-6">

      {/* Summary cards: base | expected | step-up value in price */}
      <div className="grid grid-cols-3 gap-3">
        <PriceCard
          label="Base (No Step-up)"
          dirty={result.base_price}
          clean={result.base_clean_price}
        />
        <PriceCard
          label="Expected (w/ Step-ups)"
          dirty={result.expected_price}
          clean={result.expected_clean_price}
          accent
        />
        <DeltaCard
          label="Step-up Value"
          value={stepUpValuePrice}
          subtitle="Expected − Base (clean)"
        />
      </div>

      {/* Z-spread comparison (advanced mode with step-ups) */}
      {hasCurve && result.step_up_spread_bps != null && zSpreadBps != null && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Base Z-spread
            </span>
            <span className="text-2xl font-bold text-emerald-700">
              {fmtBps(zSpreadBps - result.step_up_spread_bps)}
            </span>
            <span className="text-xs text-emerald-500">Without step-up coupons</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Input Z-spread
            </span>
            <span className="text-2xl font-bold text-emerald-700">
              {fmtBps(zSpreadBps)}
            </span>
            <span className="text-xs text-emerald-500">With expected step-ups</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Step-up Value
            </span>
            <span className={`text-2xl font-bold ${result.step_up_spread_bps >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {result.step_up_spread_bps >= 0 ? '+' : ''}{fmtBps(result.step_up_spread_bps)}
            </span>
            <span className="text-xs text-emerald-500">Input − Base spread</span>
          </div>
        </div>
      )}

      {/* Accrued interest */}
      <div className="rounded-lg bg-white border border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-500">Accrued Interest</span>
        <span className="font-semibold text-gray-800">{fmt(result.accrued_interest)}</span>
      </div>

      {/* Call option */}
      {result.price_to_call !== null && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
            Callable Bond (YTC basis)
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Dirty price to call</span>
            <span className="font-semibold">{fmt(result.price_to_call)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Clean price to call</span>
            <span className="font-semibold">{fmt(result.clean_price_to_call ?? 0)}</span>
          </div>
        </div>
      )}

      {/* Scenario breakdown */}
      {hasScenarios && (
        <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Step-up / Step-down Scenarios</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Scenario clean price vs base, assuming each scenario occurs with certainty.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left">Scenario</th>
                  <th className="px-4 py-2 text-right">Prob.</th>
                  <th className="px-4 py-2 text-right">Base Clean</th>
                  <th className="px-4 py-2 text-right">Expected Clean</th>
                  <th className="px-4 py-2 text-right">Step-up Value (Price)</th>
                  {scenarioHasSpread && (
                    <th className="px-4 py-2 text-right">Step-up Value (bps)</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.scenario_results.map((sr, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700 max-w-xs truncate" title={sr.label}>
                      {sr.label}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {(sr.probability * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-600">
                      {fmt(result.base_clean_price)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-indigo-700">
                      {fmt(sr.clean_price)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-mono font-semibold ${
                        sr.pv_of_stepup >= 0 ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {sr.pv_of_stepup >= 0 ? '+' : ''}{fmt(sr.pv_of_stepup)}
                    </td>
                    {scenarioHasSpread && (
                      <td
                        className={`px-4 py-2 text-right font-mono font-semibold ${
                          (sr.spread_value_bps ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {sr.spread_value_bps != null
                          ? `${sr.spread_value_bps >= 0 ? '+' : ''}${sr.spread_value_bps.toFixed(1)}`
                          : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cash flow chart */}
      <div className="rounded-lg bg-white border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Cash Flows by Date</h3>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 50, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis yAxisId="coupon" tick={{ fontSize: 10 }} width={50} />
            <YAxis yAxisId="principal" orientation="right" tick={{ fontSize: 10 }} width={50} />
            <Tooltip formatter={(v: number) => v.toFixed(3)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="coupon" dataKey="Base coupon" fill="#a5b4fc" />
            <Bar yAxisId="coupon" dataKey="Exp. coupon" fill="#6366f1" />
            <Bar yAxisId="principal" dataKey="Principal" fill="#fbbf24" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Cash flow schedule table */}
      <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Cash Flow Schedule</h3>
        </div>
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-xs font-mono">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-right">Base Coupon</th>
                <th className="px-3 py-2 text-right">Exp. Coupon</th>
                <th className="px-3 py-2 text-right">Principal</th>
                {hasCurve && <th className="px-3 py-2 text-right text-emerald-600">RF Rate (%)</th>}
                <th className="px-3 py-2 text-right">Disc. Factor</th>
                <th className="px-3 py-2 text-right">Base Coupon PV</th>
                <th className="px-3 py-2 text-right">Exp. Coupon PV</th>
                <th className="px-3 py-2 text-right">Principal PV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.cashflow_schedule.map((cf, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 text-gray-700">{cf.date}</td>
                  <td className="px-3 py-1.5 text-right">{cf.base_coupon.toFixed(4)}</td>
                  <td className="px-3 py-1.5 text-right">{cf.expected_coupon.toFixed(4)}</td>
                  <td className="px-3 py-1.5 text-right">{cf.principal.toFixed(2)}</td>
                  {hasCurve && (
                    <td className="px-3 py-1.5 text-right text-emerald-600">
                      {cf.curve_rate != null ? (cf.curve_rate * 100).toFixed(3) : '—'}
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-right">{cf.discount_factor.toFixed(3)}</td>
                  <td className="px-3 py-1.5 text-right">{cf.base_coupon_pv.toFixed(3)}</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-indigo-700">
                    {cf.expected_coupon_pv.toFixed(3)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-amber-600">
                    {cf.principal_pv > 0 ? cf.principal_pv.toFixed(3) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
