import type { CallOption } from '../types/bond'

interface Props {
  enabled: boolean
  value: CallOption
  onToggle: (enabled: boolean) => void
  onChange: (v: CallOption) => void
  settlementDate: string
  maturityDate: string
}

const inputCls =
  'rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full'

export function CallOptionPanel({
  enabled,
  value,
  onToggle,
  onChange,
  settlementDate,
  maturityDate,
}: Props) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <input
          type="checkbox"
          id="call-toggle"
          checked={enabled}
          onChange={e => onToggle(e.target.checked)}
          className="h-4 w-4 rounded accent-indigo-600"
        />
        <label htmlFor="call-toggle" className="text-sm font-semibold text-gray-700 cursor-pointer">
          Embedded Call Option
        </label>
      </div>

      {enabled && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Call Date
            </label>
            <input
              type="date"
              className={inputCls}
              value={value.call_date}
              min={settlementDate}
              max={maturityDate}
              onChange={e => onChange({ ...value, call_date: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Call Price
            </label>
            <input
              type="number"
              className={inputCls}
              value={value.call_price}
              min={0}
              step={0.01}
              onChange={e => onChange({ ...value, call_price: parseFloat(e.target.value) || 100 })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
