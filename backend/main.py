from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models.bond import BondPriceRequest, BondPriceResponse
from .pricing.bond_price import price_bond

app = FastAPI(title="SLB Bond Pricer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/price", response_model=BondPriceResponse)
def price(req: BondPriceRequest) -> BondPriceResponse:
    if req.settlement_date >= req.maturity_date:
        raise HTTPException(400, "settlement_date must be before maturity_date")
    if req.call_option and req.call_option.call_date >= req.maturity_date:
        raise HTTPException(400, "call_date must be before maturity_date")
    if req.call_option and req.call_option.call_date <= req.settlement_date:
        raise HTTPException(400, "call_date must be after settlement_date")

    result = price_bond(req)
    return BondPriceResponse(**result)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
