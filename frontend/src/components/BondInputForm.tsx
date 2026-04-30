import React from 'react'
import type { DayCount, Frequency } from '../types/bond'

export interface BondBasicInputs {
  settlement_date: string
  maturity_date: string
  face_value: number
  coupon_rate: number   // percentage in UI, converted to decimal before submit
  coupon_frequency: Frequency
  day_count: DayCount
  yield_rate: number    // percentage in UI
}

interface Props {
  value: BondBasicInputs
  onChange: (v: BondBasicInputs) => void
  hideYieldRate?: boolean
}

const DAY_COUNTS: DayCount[] = ['ACT/ACT', 'ACT/360', 'ACT/365', '30/360']
const FREQUENCIES: { label: string; value: Frequency }[] = [
  { label: 'Annual', value: 1 },
  { label: 'Semi-annual', value: 2 },
  { label: 'Quarterly', value: 4 },
  { label: 'Monthly', value: 12 },
]

function Field({
  label,
  tip,
  dim,
  children,
}: {
  label: string
  tip?: string
  dim?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <label className={`text-xs font-semibold uppercase tracking-wide ${dim ? 'text-gray-400' : 'text-gray-500'}`}>
          {label}
        </label>
        {tip && (
          <div className="relative group">
            <span className="cursor-help text-gray-400 hover:text-gray-600 text-xs select-none">ⓘ</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-md bg-gray-900 text-white text-xs px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20 leading-relaxed">
              {tip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

const inputCls =
  'rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

const dimInputCls =
  'rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300'

export function BondInputForm({ value, onChange, hideYieldRate = false }: Props) {
  function set<K extends keyof BondBasicInputs>(key: K, v: BondBasicInputs[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Settlement Date" tip="The pricing date. Only cash flows after this date are discounted. Accrued interest is calculated from the last coupon date up to this date.">
        <input
          type="date"
          className={inputCls}
          value={value.settlement_date}
          onChange={e => set('settlement_date', e.target.value)}
        />
      </Field>

      <Field label="Maturity Date" tip="The bond's final redemption date. The face value is repaid here and coupon dates are stepped back from this date at the given frequency.">
        <input
          type="date"
          className={inputCls}
          value={value.maturity_date}
          min={value.settlement_date}
          onChange={e => set('maturity_date', e.target.value)}
        />
      </Field>

      <Field label="Coupon Rate (% p.a.)" tip="Annual coupon as a percentage of face value. E.g. 5 means 5% p.a. Divided by coupon frequency for each periodic payment.">
        <input
          type="number"
          className={inputCls}
          value={value.coupon_rate}
          min={0}
          step={0.01}
          onChange={e => set('coupon_rate', parseFloat(e.target.value) || 0)}
        />
      </Field>

      <Field label="Coupon Frequency" tip="Number of coupon payments per year. Semi-annual (2) is most common for corporate and government bonds.">
        <select
          className={inputCls}
          value={value.coupon_frequency}
          onChange={e => set('coupon_frequency', parseInt(e.target.value) as Frequency)}
        >
          {FREQUENCIES.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Day Count" tip="Convention for converting date intervals to year fractions. ACT/ACT uses actual days and is standard for government bonds; 30/360 is common for corporate bonds.">
        <select
          className={inputCls}
          value={value.day_count}
          onChange={e => set('day_count', e.target.value as DayCount)}
        >
          {DAY_COUNTS.map(dc => (
            <option key={dc} value={dc}>
              {dc}
            </option>
          ))}
        </select>
      </Field>

      {!hideYieldRate && (
        <Field label="Discount Yield (% p.a.)" tip="The flat annual yield used to discount all cash flows to their present value. Also known as yield-to-maturity (YTM) when solving for price.">
          <input
            type="number"
            className={inputCls}
            value={value.yield_rate}
            min={0}
            step={0.01}
            onChange={e => set('yield_rate', parseFloat(e.target.value) || 0)}
          />
        </Field>
      )}

      <Field label="Face Value" tip="The par / notional amount redeemed at maturity. Coupon payments are a percentage of this. Rarely needs changing from 100." dim>
        <input
          type="number"
          className={dimInputCls}
          value={value.face_value}
          min={1}
          step={1}
          onChange={e => set('face_value', parseFloat(e.target.value) || 100)}
        />
      </Field>
    </div>
  )
}
