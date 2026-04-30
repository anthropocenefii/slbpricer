export interface YieldCurveEntry {
  tenor: string
  rate: number  // percentage in UI, converted to decimal before submit
}

const TENORS = ['0d', '1m', '3m', '6m', '1y', '2y', '3y', '5y', '7y', '10y', '15y', '20y']

export const DEFAULT_CURVE: YieldCurveEntry[] = TENORS.map(t => ({ tenor: t, rate: 4.0 }))

interface Props {
  curve: YieldCurveEntry[]
  onChange: (c: YieldCurveEntry[]) => void
  zSpread: number
  onZSpreadChange: (v: number) => void
}

const inputCls =
  'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right'

export function YieldCurvePanel({ curve, onChange, zSpread, onZSpreadChange }: Props) {
  function setRate(tenor: string, rate: number) {
    onChange(curve.map(p => (p.tenor === tenor ? { ...p, rate } : p)))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2.5">
        <div className="flex flex-col gap-0.5 flex-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Z-Spread (bps)
          </label>
          <span className="text-xs text-indigo-400">
            Constant spread added to every curve rate for discounting
          </span>
        </div>
        <input
          type="number"
          step={1}
          value={zSpread}
          onChange={e => onZSpreadChange(parseFloat(e.target.value) || 0)}
          className="w-24 rounded-md border border-indigo-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right bg-white"
        />
        <span className="text-xs text-indigo-400 shrink-0">bps</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {curve.map(({ tenor, rate }) => (
          <div key={tenor} className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-gray-500 w-8 shrink-0 text-right">
              {tenor}
            </span>
            <input
              type="number"
              step={0.01}
              value={rate}
              onChange={e => setRate(tenor, parseFloat(e.target.value) || 0)}
              className={inputCls}
            />
            <span className="text-xs text-gray-400 shrink-0">%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
