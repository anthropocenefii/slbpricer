import type { StepUp, StepType } from '../types/bond'

interface Props {
  stepUps: StepUp[]
  onChange: (stepUps: StepUp[]) => void
  settlementDate: string
  maturityDate: string
}

const inputCls =
  'rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full'

function empty(settlement: string, maturity: string): StepUp {
  // Default start = midpoint, end = maturity
  const s = new Date(settlement)
  const m = new Date(maturity)
  const mid = new Date((s.getTime() + m.getTime()) / 2)
  const midStr = mid.toISOString().slice(0, 10)
  return {
    start_date: midStr,
    end_date: maturity,
    coupon_delta: 0.0025,
    probability: 0.5,
    step_type: 'coupon_delta',
  }
}

export function StepUpConfigurator({ stepUps, onChange, settlementDate, maturityDate }: Props) {
  function add() {
    onChange([...stepUps, empty(settlementDate, maturityDate)])
  }

  function remove(i: number) {
    onChange(stepUps.filter((_, idx) => idx !== i))
  }

  function update<K extends keyof StepUp>(i: number, key: K, val: StepUp[K]) {
    onChange(stepUps.map((su, idx) => (idx === i ? { ...su, [key]: val } : su)))
  }

  return (
    <div className="flex flex-col gap-3">
      {stepUps.length === 0 && (
        <p className="text-sm text-gray-400 italic">No step-ups / step-downs added.</p>
      )}

      {stepUps.map((su, i) => (
        <div
          key={i}
          className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-indigo-700">
              Step {i + 1} — {su.coupon_delta >= 0 ? '▲ Step-up' : '▼ Step-down'}
              {su.step_type === 'principal_pct' && (
                <span className="ml-1 text-indigo-400 font-normal text-xs">(% of principal)</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>

          {/* Step type toggle */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Step-up Type
            </span>
            <div className="flex gap-4">
              {(['coupon_delta', 'principal_pct'] as StepType[]).map(type => (
                <label key={type} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={`step_type_${i}`}
                    value={type}
                    checked={su.step_type === type}
                    onChange={() => update(i, 'step_type', type)}
                    className="accent-indigo-600"
                  />
                  {type === 'coupon_delta' ? 'Coupon rate change' : '% of principal outstanding'}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Start Date
              </label>
              <input
                type="date"
                className={inputCls}
                value={su.start_date}
                min={settlementDate}
                max={maturityDate}
                onChange={e => update(i, 'start_date', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                End Date
              </label>
              <input
                type="date"
                className={inputCls}
                value={su.end_date}
                min={su.start_date}
                max={maturityDate}
                onChange={e => update(i, 'end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {su.step_type === 'principal_pct' ? 'Principal % Change (bps p.a.)' : 'Coupon Change (bps p.a.)'}
              <span className="ml-2 text-indigo-600 font-bold">
                {(su.coupon_delta * 10000).toFixed(0)} bps
                {' '}({su.coupon_delta >= 0 ? '+' : ''}{(su.coupon_delta * 100).toFixed(3)}%)
              </span>
            </label>
            <input
              type="number"
              className={inputCls}
              value={(su.coupon_delta * 10000).toFixed(0)}
              step={1}
              onChange={e =>
                update(i, 'coupon_delta', (parseFloat(e.target.value) || 0) / 10000)
              }
              placeholder="e.g. 50 for +50 bps, -25 for step-down"
            />
            <p className="text-xs text-gray-400">
              {su.step_type === 'principal_pct'
                ? 'Positive = step-up, negative = step-down. Extra cash flow = outstanding principal × rate / frequency per period.'
                : 'Positive = step-up, negative = step-down. Applies to coupons between the dates above.'}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Probability of occurrence
              <span className="ml-2 text-indigo-600 font-bold">
                {(su.probability * 100).toFixed(0)}%
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={su.probability}
              onChange={e => update(i, 'probability', parseFloat(e.target.value))}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0% (won't occur)</span>
              <span>50%</span>
              <span>100% (certain)</span>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="mt-1 rounded-md border border-dashed border-indigo-300 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
      >
        + Add Step-up / Step-down
      </button>
    </div>
  )
}
