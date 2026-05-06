import useBondStore from "@slb_store/useBondStore";
import BondInputForm from "@slb_components/BondInputForm";
import StepUpConfigurator from "@slb_components/StepUpConfigurator";
import CallOptionPanel from "@slb_components/CallOptionPanel";
import YieldCurvePanel from "@slb_components/YieldCurvePanel";
import ResultsPanel from "@slb_components/ResultsPanel";
import { priceBond } from "@slb/api/pricer";

export default function App() {
  const {
    bond, stepUps, callEnabled, callOption,
    advancedMode, yieldCurve, zSpread,
    result, loading, error,
    setBond, setStepUps, setCallEnabled, setCallOption,
    setAdvancedMode, setYieldCurve, setZSpread,
    setResult, setLoading, setError,
  } = useBondStore();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await priceBond({
        settlement_date: bond.settlement_date,
        maturity_date: bond.maturity_date,
        face_value: bond.face_value,
        coupon_rate: bond.coupon_rate / 100,
        coupon_frequency: bond.coupon_frequency,
        day_count: bond.day_count,
        yield_rate: advancedMode ? undefined : bond.yield_rate / 100,
        step_ups: stepUps,
        call_option: callEnabled ? callOption : null,
        yield_curve: advancedMode
          ? yieldCurve.map((p) => ({ tenor: p.tenor, rate: p.rate / 100 }))
          : undefined,
        z_spread: advancedMode ? zSpread / 10000 : undefined,
      });
      setResult(res);
    } catch (err) {
      setError(
        err?.response?.data?.detail ??
          "Could not reach the pricing server. Is the backend running?",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="slb-pricer">
      <header className="slb-pricer__header">
        <h1>SLB Bond Pricer</h1>
        <p>Fixed-coupon bonds with step-up / step-down coupons and embedded call options</p>
      </header>

      <div className="slb-pricer__layout">
        <form onSubmit={handleSubmit} className="slb-pricer__form">

          <div className="slb-card">
            <div className="slb-card__header">
              <span className="slb-card__title">Bond Details</span>
              <div className="slb-mode-toggle">
                <button
                  type="button"
                  className={`slb-mode-toggle__btn${!advancedMode ? " slb-mode-toggle__btn--active" : ""}`}
                  onClick={() => setAdvancedMode(false)}
                >
                  Basic
                </button>
                <button
                  type="button"
                  className={`slb-mode-toggle__btn${advancedMode ? " slb-mode-toggle__btn--active" : ""}`}
                  onClick={() => setAdvancedMode(true)}
                >
                  Advanced
                </button>
              </div>
            </div>
            <BondInputForm bond={bond} onChange={setBond} hideYieldRate={advancedMode} />
          </div>

          {advancedMode && (
            <div className="slb-card">
              <div className="slb-card__header">
                <span className="slb-card__title">Risk-Free Yield Curve</span>
              </div>
              <YieldCurvePanel
                curve={yieldCurve}
                onChange={setYieldCurve}
                zSpread={zSpread}
                onZSpreadChange={setZSpread}
              />
            </div>
          )}

          <div className="slb-card">
            <div className="slb-card__header">
              <span className="slb-card__title">Step-up / Step-down Coupons</span>
            </div>
            <StepUpConfigurator
              stepUps={stepUps}
              onChange={setStepUps}
              settlementDate={bond.settlement_date}
              maturityDate={bond.maturity_date}
            />
          </div>

          <div className="slb-card">
            <div className="slb-card__header">
              <span className="slb-card__title">Call Option</span>
            </div>
            <CallOptionPanel
              enabled={callEnabled}
              value={callOption}
              onToggle={setCallEnabled}
              onChange={setCallOption}
              settlementDate={bond.settlement_date}
              maturityDate={bond.maturity_date}
            />
          </div>

          <button type="submit" disabled={loading} className="slb-btn--primary">
            {loading ? "Calculating…" : "Price Bond"}
          </button>

          {error && <div className="slb-error">{error}</div>}
        </form>

        <div className="slb-pricer__results">
          {result ? (
            <ResultsPanel result={result} zSpreadBps={advancedMode ? zSpread : undefined} />
          ) : (
            <div className="slb-empty">Fill in bond details and click "Price Bond"</div>
          )}
        </div>
      </div>
    </div>
  );
}
