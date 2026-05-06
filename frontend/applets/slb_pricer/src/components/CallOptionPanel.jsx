export default function CallOptionPanel({
  enabled,
  value,
  onToggle,
  onChange,
  settlementDate,
  maturityDate,
}) {
  return (
    <div>
      <div className="slb-call__toggle">
        <input
          type="checkbox"
          id="call-toggle"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <label htmlFor="call-toggle">Embedded Call Option</label>
      </div>

      {enabled && (
        <div className="slb-grid-2">
          <div className="slb-field">
            <div className="slb-field__label">Call Date</div>
            <input
              type="date"
              className="slb-input"
              value={value.call_date}
              min={settlementDate}
              max={maturityDate}
              onChange={(e) =>
                onChange({ ...value, call_date: e.target.value })
              }
            />
          </div>

          <div className="slb-field">
            <div className="slb-field__label">Call Price</div>
            <input
              type="number"
              className="slb-input"
              value={value.call_price}
              min={0}
              step={0.01}
              onChange={(e) =>
                onChange({
                  ...value,
                  call_price: parseFloat(e.target.value) || 100,
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
