import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function fmt(n, dp = 4) {
  return n.toFixed(dp);
}

function fmtBps(n, dp = 1) {
  if (n == null) return "—";
  return `${n.toFixed(dp)} bps`;
}

function PriceCard({ label, dirty, clean, variant = "default" }) {
  return (
    <div className={`slb-price-card${variant !== "default" ? ` slb-price-card--${variant}` : ""}`}>
      <div className="slb-price-card__label">{label}</div>
      <div className="slb-price-card__value">{fmt(clean)}</div>
      <div className="slb-price-card__sub">Clean&nbsp;|&nbsp;Dirty: {fmt(dirty)}</div>
    </div>
  );
}

function DeltaCard({ label, value, subtitle }) {
  const variant = value >= 0 ? "positive" : "negative";
  return (
    <div className={`slb-price-card slb-price-card--${variant}`}>
      <div className="slb-price-card__label">{label}</div>
      <div className="slb-price-card__value">
        {value >= 0 ? "+" : ""}{fmt(value)}
      </div>
      {subtitle && <div className="slb-price-card__sub">{subtitle}</div>}
    </div>
  );
}

export default function ResultsPanel({ result, zSpreadBps }) {
  const hasCurve = result.cashflow_schedule.some((cf) => cf.curve_rate != null);
  const hasScenarios = result.scenario_results.length > 0;
  const scenarioHasSpread = hasScenarios && result.scenario_results[0].spread_value_bps != null;
  const scenarioHasYieldBps = hasScenarios && result.scenario_results[0].yield_value_bps != null;
  const stepUpValuePrice = result.expected_clean_price - result.base_clean_price;
  const hasPrincipalPct = result.has_principal_pct_steps === true;

  const chartData = result.cashflow_schedule.map((cf) => ({
    date: cf.date.slice(0, 7),
    "Base coupon": parseFloat(cf.base_coupon.toFixed(4)),
    "Exp. coupon": parseFloat(cf.expected_coupon.toFixed(4)),
    Principal: cf.principal > 0 ? parseFloat(cf.principal.toFixed(4)) : null,
    ...(hasPrincipalPct && {
      Outstanding: parseFloat(cf.outstanding_principal.toFixed(2)),
    }),
  }));

  return (
    <div className="slb-results">

      {/* Summary cards */}
      <div className="slb-price-cards">
        <PriceCard
          label="Base (No Step-up)"
          dirty={result.base_price}
          clean={result.base_clean_price}
        />
        <PriceCard
          label="Expected (w/ Step-ups)"
          dirty={result.expected_price}
          clean={result.expected_clean_price}
          variant="accent"
        />
        <DeltaCard
          label="Step-up Value"
          value={stepUpValuePrice}
          subtitle={
            result.step_up_yield_bps != null
              ? `Expected − Base (clean) · ${result.step_up_yield_bps >= 0 ? "+" : ""}${result.step_up_yield_bps.toFixed(1)} bps`
              : "Expected − Base (clean)"
          }
        />
      </div>

      {/* Z-spread comparison (advanced mode) */}
      {hasCurve && result.step_up_spread_bps != null && zSpreadBps != null && (
        <div className="slb-zspread-box">
          <div>
            <div className="slb-zspread-box__label">Base Z-spread</div>
            <div className="slb-zspread-box__value">
              {fmtBps(zSpreadBps - result.step_up_spread_bps)}
            </div>
            <div className="slb-zspread-box__sub">Without step-up coupons</div>
          </div>
          <div>
            <div className="slb-zspread-box__label">Input Z-spread</div>
            <div className="slb-zspread-box__value">{fmtBps(zSpreadBps)}</div>
            <div className="slb-zspread-box__sub">With expected step-ups</div>
          </div>
          <div>
            <div className="slb-zspread-box__label">Step-up Value</div>
            <div className={`slb-zspread-box__value${result.step_up_spread_bps < 0 ? " slb-zspread-box__value--mixed" : ""}`}>
              {result.step_up_spread_bps >= 0 ? "+" : ""}{fmtBps(result.step_up_spread_bps)}
            </div>
            <div className="slb-zspread-box__sub">Input − Base spread</div>
          </div>
        </div>
      )}

      {/* Accrued interest */}
      <div className="slb-accrued">
        <span className="slb-accrued__label">Accrued Interest</span>
        <span className="slb-accrued__value">{fmt(result.accrued_interest)}</span>
      </div>

      {/* Call option */}
      {result.price_to_call !== null && (
        <div className="slb-call-result">
          <div className="slb-call-result__title">Callable Bond (YTC basis)</div>
          <div className="slb-call-result__row">
            <span>Dirty price to call</span>
            <span className="slb-call-result__value">{fmt(result.price_to_call)}</span>
          </div>
          <div className="slb-call-result__row">
            <span>Clean price to call</span>
            <span className="slb-call-result__value">{fmt(result.clean_price_to_call ?? 0)}</span>
          </div>
        </div>
      )}

      {/* Scenario breakdown */}
      {hasScenarios && (
        <div className="slb-scenarios">
          <div className="slb-scenarios__header">
            <div className="slb-scenarios__title">Step-up / Step-down Scenarios</div>
            <div className="slb-scenarios__sub">
              Scenario clean price vs base, assuming each scenario occurs with certainty.
            </div>
          </div>
          <div className="slb-scenarios__wrap">
            <table className="slb-scenarios__table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Prob.</th>
                  <th>Base Clean</th>
                  <th>Expected Clean</th>
                  <th>Step-up Value (Price)</th>
                  {scenarioHasYieldBps && <th>Step-up Value (bps)</th>}
                  {scenarioHasSpread && <th>Step-up Value (Z-bps)</th>}
                </tr>
              </thead>
              <tbody>
                {result.scenario_results.map((sr, i) => (
                  <tr key={i}>
                    <td title={sr.label}>{sr.label}</td>
                    <td>{(sr.probability * 100).toFixed(0)}%</td>
                    <td>{fmt(result.base_clean_price)}</td>
                    <td className="slb-scenarios__cell--accent">{fmt(sr.clean_price)}</td>
                    <td className={sr.pv_of_stepup >= 0 ? "slb-scenarios__cell--pos" : "slb-scenarios__cell--neg"}>
                      {sr.pv_of_stepup >= 0 ? "+" : ""}{fmt(sr.pv_of_stepup)}
                    </td>
                    {scenarioHasYieldBps && (
                      <td className={(sr.yield_value_bps ?? 0) >= 0 ? "slb-scenarios__cell--pos" : "slb-scenarios__cell--neg"}>
                        {sr.yield_value_bps != null
                          ? `${sr.yield_value_bps >= 0 ? "+" : ""}${sr.yield_value_bps.toFixed(1)} bps`
                          : "—"}
                      </td>
                    )}
                    {scenarioHasSpread && (
                      <td className={(sr.spread_value_bps ?? 0) >= 0 ? "slb-scenarios__cell--pos" : "slb-scenarios__cell--neg"}>
                        {sr.spread_value_bps != null
                          ? `${sr.spread_value_bps >= 0 ? "+" : ""}${sr.spread_value_bps.toFixed(1)} bps`
                          : "—"}
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
      <div className="slb-chart">
        <div className="slb-chart__header">
          <span className="slb-chart__title">Cash Flows by Date</span>
          {hasPrincipalPct && (
            <span className="slb-chart__badge">
              Dashed line = outstanding principal (step-up basis)
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,126,151,0.2)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} interval="preserveStartEnd" />
            <YAxis yAxisId="coupon" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} width={46} />
            <YAxis yAxisId="principal" orientation="right" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} width={46} />
            <Tooltip
              contentStyle={{ background: "#023c53", border: "1px solid #3f7e97", borderRadius: 4, fontSize: 12 }}
              labelStyle={{ color: "rgba(255,255,255,0.7)" }}
              formatter={(v) => v.toFixed(3)}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
            <Bar yAxisId="coupon" dataKey="Base coupon" fill="rgba(63,126,151,0.6)" />
            <Bar yAxisId="coupon" dataKey="Exp. coupon" fill="#3f7e97" />
            <Bar yAxisId="principal" dataKey="Principal" fill="#f7a918" />
            {hasPrincipalPct && (
              <Line
                yAxisId="principal"
                type="monotone"
                dataKey="Outstanding"
                stroke="#fb923c"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                name="Outstanding principal"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Cash flow schedule */}
      <div className="slb-cftable">
        <div className="slb-cftable__header">Cash Flow Schedule</div>
        <div className="slb-cftable__scroll">
          <table className="slb-cftable__table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Base Coupon</th>
                <th>Exp. Coupon</th>
                <th>Redemption</th>
                {hasPrincipalPct && <th className="slb-cftable__cell--orange">Outstanding</th>}
                {hasCurve && <th className="slb-cftable__cell--green">RF Rate (%)</th>}
                <th>Disc. Factor</th>
                <th>Base Coupon PV</th>
                <th>Exp. Coupon PV</th>
                <th>Principal PV</th>
              </tr>
            </thead>
            <tbody>
              {result.cashflow_schedule.map((cf, i) => (
                <tr key={i}>
                  <td>{cf.date}</td>
                  <td>{cf.base_coupon.toFixed(4)}</td>
                  <td>{cf.expected_coupon.toFixed(4)}</td>
                  <td>{cf.principal > 0 ? cf.principal.toFixed(2) : "—"}</td>
                  {hasPrincipalPct && (
                    <td className="slb-cftable__cell--orange">
                      {cf.outstanding_principal.toFixed(2)}
                    </td>
                  )}
                  {hasCurve && (
                    <td className="slb-cftable__cell--green">
                      {cf.curve_rate != null ? (cf.curve_rate * 100).toFixed(3) : "—"}
                    </td>
                  )}
                  <td>{cf.discount_factor.toFixed(3)}</td>
                  <td>{cf.base_coupon_pv.toFixed(3)}</td>
                  <td className="slb-cftable__cell--accent">{cf.expected_coupon_pv.toFixed(3)}</td>
                  <td className="slb-cftable__cell--orange">
                    {cf.principal_pv > 0 ? cf.principal_pv.toFixed(3) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
