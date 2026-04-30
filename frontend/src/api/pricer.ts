import axios from 'axios'
import type { BondPriceRequest, BondPriceResponse } from '../types/bond'

export async function priceBond(req: BondPriceRequest): Promise<BondPriceResponse> {
  const { data } = await axios.post<BondPriceResponse>('/api/price', req)
  return data
}
