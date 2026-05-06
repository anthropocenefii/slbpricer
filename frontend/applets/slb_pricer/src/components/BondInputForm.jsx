const DAY_COUNTS = ["ACT/ACT", "ACT/360", "ACT/365", "30/360"];
const FREQUENCIES = [
  { label: "Annual", value: 1 },
  { label: "Semi-annual", value: 2 },
  { label: "Quarterly", value: 4 },
  { label: "Monthly", value: 12 },
];

function Field({ label, tip, dim, children }) {
  return (
    <div className="slb-field">
      <div className={`slb-field__label${dim ? " slb-field__label--dim" : ""}`}>
        <span>{label}</span>
        {tip && (
          <div className="slb-field__tooltip-wrapper">
            <span className="slb-field__tip-icon">ⓘ</span>
            <div className="slb-field__tooltip">{tip}</div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export default function BondInputForm({ bond, onChange, hideYieldRate = false }) {
  function set(key, val) {
    onChange({ ...bond, [key]: val });
  }

  return (
    <div className="slb-grid-2">
      <Field
        label="Settlement Date"
        tip="The pricing date. Only cash flows after this date are discounted. Accrued interest is calculated from the last coupon date up to this date."
      >
        <input
          type="date"
          className="slb-input"
          value={bond.settlement_date}
          onChange={(e) => set("settlement_date", e.target.value)}
        />
      </Field>

      <Field
        label="Maturity Date"
        tip="The bond's final redemption date. The face value is repaid here and coupon dates are stepped back from this date at the given frequency."
      >
        <input
          type="date"
          className="slb-input"
          value={bond.maturity_date}
          min={bond.settlement_date}
          onChange={(e) => set("maturity_date", e.target.value)}
        />
      </Field>

      <Field
        label="Coupon Rate (% p.a.)"
        tip="Annual coupon as a percentage of face value. E.g. 5 means 5% p.a. Divided by coupon frequency for each periodic payment."
      >
        <input
          type="number"
          className="slb-input"
          value={bond.coupon_rate}
          min={0}
          step={0.01}
          onChange={(e) => set("coupon_rate", parseFloat(e.target.value) || 0)}
        />
      </Field>

      <Field
        label="Coupon Frequency"
        tip="Number of coupon payments per year. Semi-annual (2) is most common for corporate and government bonds."
      >
        <select
          className="slb-input"
          value={bond.coupon_frequency}
          onChange={(e) => set("coupon_frequency", parseInt(e.target.value))}
        >
          {FREQUENCIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Day Count"
        tip="Convention for converting date intervals to year fractions. ACT/ACT uses actual days and is standard for government bonds; 30/360 is common for corporate bonds."
      >
        <select
          className="slb-input"
          value={bond.day_count}
          onChange={(e) => set("day_count", e.target.value)}
        >
          {DAY_COUNTS.map((dc) => (
            <option key={dc} value={dc}>
              {dc}
            </option>
          ))}
        </select>
      </Field>

      {!hideYieldRate && (
        <Field
          label="Discount Yield (% p.a.)"
          tip="The flat annual yield used to discount all cash flows to their present value. Also known as yield-to-maturity (YTM) when solving for price."
        >
          <input
            type="number"
            className="slb-input"
            value={bond.yield_rate}
            min={0}
            step={0.01}
            onChange={(e) => set("yield_rate", parseFloat(e.target.value) || 0)}
          />
        </Field>
      )}

      <Field
        label="Face Value"
        tip="The par / notional amount redeemed at maturity. Coupon payments are a percentage of this. Rarely needs changing from 100."
        dim
      >
        <input
          type="number"
          className="slb-input slb-input--dim"
          value={bond.face_value}
          min={1}
          step={1}
          onChange={(e) => set("face_value", parseFloat(e.target.value) || 100)}
        />
      </Field>
    </div>
  );
}
