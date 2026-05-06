const STEP_TYPES = ["coupon_delta", "principal_pct"];

export default function StepUpConfigurator({
  stepUps,
  onChange,
  settlementDate,
  maturityDate,
}) {
  function add() {
    const s = new Date(settlementDate);
    const m = new Date(maturityDate);
    const mid = new Date((s.getTime() + m.getTime()) / 2);
    onChange([
      ...stepUps,
      {
        start_date: mid.toISOString().slice(0, 10),
        end_date: maturityDate,
        coupon_delta: 0.0025,
        probability: 0.5,
        step_type: "coupon_delta",
      },
    ]);
  }

  function remove(i) {
    onChange(stepUps.filter((_, idx) => idx !== i));
  }

  function update(i, key, val) {
    onChange(stepUps.map((su, idx) => (idx === i ? { ...su, [key]: val } : su)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {stepUps.length === 0 && (
        <p className="slb-step__empty">No step-ups / step-downs added.</p>
      )}

      {stepUps.map((su, i) => (
        <div key={i} className="slb-step">
          <div className="slb-step__header">
            <span className="slb-step__title">
              Step {i + 1} — {su.coupon_delta >= 0 ? "▲ Step-up" : "▼ Step-down"}
              {su.step_type === "principal_pct" && (
                <span style={{ fontWeight: 400, fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
                  {" "}(% of principal)
                </span>
              )}
            </span>
            <button
              type="button"
              className="slb-step__remove"
              onClick={() => remove(i)}
            >
              Remove
            </button>
          </div>

          <div>
            <div className="slb-step__type-label">Step-up Type</div>
            <div className="slb-step__radio-group">
              {STEP_TYPES.map((type) => (
                <label key={type} className="slb-step__radio">
                  <input
                    type="radio"
                    name={`step_type_${i}`}
                    value={type}
                    checked={su.step_type === type}
                    onChange={() => update(i, "step_type", type)}
                  />
                  {type === "coupon_delta"
                    ? "Coupon rate change"
                    : "% of principal outstanding"}
                </label>
              ))}
            </div>
          </div>

          <div className="slb-grid-2">
            <div className="slb-field">
              <div className="slb-field__label">Start Date</div>
              <input
                type="date"
                className="slb-input"
                value={su.start_date}
                min={settlementDate}
                max={maturityDate}
                onChange={(e) => update(i, "start_date", e.target.value)}
              />
            </div>
            <div className="slb-field">
              <div className="slb-field__label">End Date</div>
              <input
                type="date"
                className="slb-input"
                value={su.end_date}
                min={su.start_date}
                max={maturityDate}
                onChange={(e) => update(i, "end_date", e.target.value)}
              />
            </div>
          </div>

          <div className="slb-field">
            <div className="slb-field__label">
              {su.step_type === "principal_pct"
                ? "Principal % Change (bps p.a.)"
                : "Coupon Change (bps p.a.)"}
              <span className="slb-step__value-badge" style={{ marginLeft: 6 }}>
                {(su.coupon_delta * 10000).toFixed(0)} bps
                {" "}({su.coupon_delta >= 0 ? "+" : ""}{(su.coupon_delta * 100).toFixed(3)}%)
              </span>
            </div>
            <input
              type="number"
              className="slb-input"
              value={(su.coupon_delta * 10000).toFixed(0)}
              step={1}
              onChange={(e) =>
                update(i, "coupon_delta", (parseFloat(e.target.value) || 0) / 10000)
              }
              placeholder="e.g. 50 for +50 bps, -25 for step-down"
            />
            <p className="slb-step__helper">
              {su.step_type === "principal_pct"
                ? "Positive = step-up, negative = step-down. Extra cash flow = outstanding principal × rate / frequency per period."
                : "Positive = step-up, negative = step-down. Applies to coupons between the dates above."}
            </p>
          </div>

          <div className="slb-field">
            <div className="slb-field__label">
              Probability of occurrence
              <span className="slb-step__value-badge" style={{ marginLeft: 6 }}>
                {(su.probability * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              className="slb-step__slider"
              min={0}
              max={1}
              step={0.01}
              value={su.probability}
              onChange={(e) => update(i, "probability", parseFloat(e.target.value))}
            />
            <div className="slb-step__prob-labels">
              <span>0% (won&apos;t occur)</span>
              <span>50%</span>
              <span>100% (certain)</span>
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="slb-btn--ghost" onClick={add}>
        + Add Step-up / Step-down
      </button>
    </div>
  );
}
