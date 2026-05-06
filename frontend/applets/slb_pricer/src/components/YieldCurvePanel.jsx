export default function YieldCurvePanel({ curve, onChange, zSpread, onZSpreadChange }) {
  function setRate(tenor, rate) {
    onChange(curve.map((p) => (p.tenor === tenor ? { ...p, rate } : p)));
  }

  return (
    <div className="slb-curve">
      <div className="slb-curve__zspread">
        <div className="slb-curve__zspread-info">
          <div className="slb-curve__zspread-label">Z-Spread (bps)</div>
          <div className="slb-curve__zspread-hint">
            Constant spread added to every curve rate for discounting
          </div>
        </div>
        <input
          type="number"
          step={1}
          value={zSpread}
          onChange={(e) => onZSpreadChange(parseFloat(e.target.value) || 0)}
          className="slb-input slb-curve__zspread-input"
        />
        <span className="slb-curve__zspread-unit">bps</span>
      </div>

      <div className="slb-curve__grid">
        {curve.map(({ tenor, rate }) => (
          <div key={tenor} className="slb-curve__row">
            <span className="slb-curve__tenor">{tenor}</span>
            <input
              type="number"
              step={0.01}
              value={rate}
              onChange={(e) => setRate(tenor, parseFloat(e.target.value) || 0)}
              className="slb-input slb-curve__rate-input"
            />
            <span className="slb-curve__unit">%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
