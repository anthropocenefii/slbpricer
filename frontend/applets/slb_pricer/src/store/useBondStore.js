import { create } from "zustand";

const today = new Date();
today.setHours(0, 0, 0, 0);
const maturity = new Date(today);
maturity.setFullYear(maturity.getFullYear() + 5);
const callDefault = new Date(today);
callDefault.setFullYear(callDefault.getFullYear() + 2);

const toISO = (d) => d.toISOString().slice(0, 10);

const TENORS = ["0d", "1m", "3m", "6m", "1y", "2y", "3y", "5y", "7y", "10y", "15y", "20y"];

const useBondStore = create((set, get) => ({
  bond: {
    settlement_date: toISO(today),
    maturity_date: toISO(maturity),
    face_value: 100,
    coupon_rate: 5,
    coupon_frequency: 1,
    day_count: "ACT/ACT",
    yield_rate: 5,
  },

  stepUps: [],

  callEnabled: false,
  callOption: {
    call_date: toISO(callDefault),
    call_price: 100,
  },

  advancedMode: false,
  yieldCurve: TENORS.map((t) => ({ tenor: t, rate: 4.0 })),
  zSpread: 0,

  result: null,
  loading: false,
  error: null,

  // Bond actions
  setBond: (bond) => set({ bond }),
  updateBond: (key, value) =>
    set((state) => ({ bond: { ...state.bond, [key]: value } })),

  // Step-up actions
  setStepUps: (stepUps) => set({ stepUps }),
  addStepUp: () =>
    set((state) => {
      const { settlement_date, maturity_date } = state.bond;
      const s = new Date(settlement_date);
      const m = new Date(maturity_date);
      const mid = new Date((s.getTime() + m.getTime()) / 2);
      return {
        stepUps: [
          ...state.stepUps,
          {
            start_date: mid.toISOString().slice(0, 10),
            end_date: maturity_date,
            coupon_delta: 0.0025,
            probability: 0.5,
            step_type: "coupon_delta",
          },
        ],
      };
    }),
  removeStepUp: (i) =>
    set((state) => ({ stepUps: state.stepUps.filter((_, idx) => idx !== i) })),
  updateStepUp: (i, key, value) =>
    set((state) => ({
      stepUps: state.stepUps.map((su, idx) =>
        idx === i ? { ...su, [key]: value } : su,
      ),
    })),

  // Call option actions
  setCallEnabled: (callEnabled) => set({ callEnabled }),
  setCallOption: (callOption) => set({ callOption }),
  updateCallOption: (key, value) =>
    set((state) => ({ callOption: { ...state.callOption, [key]: value } })),

  // Advanced mode actions
  setAdvancedMode: (advancedMode) => set({ advancedMode }),
  setYieldCurve: (yieldCurve) => set({ yieldCurve }),
  updateCurveRate: (tenor, rate) =>
    set((state) => ({
      yieldCurve: state.yieldCurve.map((p) =>
        p.tenor === tenor ? { ...p, rate } : p,
      ),
    })),
  setZSpread: (zSpread) => set({ zSpread }),

  // API state actions
  setResult: (result) => set({ result }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

export default useBondStore;
