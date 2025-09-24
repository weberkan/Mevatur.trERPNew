"use client"

// Historical rate helpers (ECB via Frankfurter and exchangerate.host).
// Usage: await fetchHistoricalRate("2024-06-01", "USD") -> TRY rate on that date.

async function fetchFrankfurterOn(date: string, base: "USD" | "SAR") {
  // https://api.frankfurter.app/2024-06-01?from=USD&to=TRY
  const res = await fetch(`https://api.frankfurter.app/${date}?from=${base}&to=TRY`)
  if (!res.ok) return 0
  const json = await res.json()
  return json?.rates?.TRY ? Number(json.rates.TRY) : 0
}

async function fetchExchangerateHostOn(date: string, base: "USD" | "SAR") {
  // https://api.exchangerate.host/2024-06-01?base=USD&symbols=TRY
  const res = await fetch(`https://api.exchangerate.host/${date}?base=${base}&symbols=TRY`)
  if (!res.ok) return 0
  const json = await res.json()
  return json?.rates?.TRY ? Number(json.rates.TRY) : 0
}

export async function fetchHistoricalRate(date: string, base: "USD" | "SAR") {
  // Try ECB (Frankfurter) then exchangerate.host
  for (const fn of [fetchFrankfurterOn, fetchExchangerateHostOn]) {
    try {
      const v = await fn(date, base)
      if (typeof v === "number" && isFinite(v) && v > 0) return v
    } catch (_) {}
  }
  return 0
}
