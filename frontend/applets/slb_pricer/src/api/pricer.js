import axios from "axios";

export async function priceBond(req) {
  const { data } = await axios.post("/api/price", req);
  return data;
}
