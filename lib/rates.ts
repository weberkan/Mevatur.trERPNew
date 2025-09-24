"use client"

import { useEffect, useState } from "react"

export type ExchangeRates = {
  USDTRY: number
  SARTRY: number
  USDSAR: number
}

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>({ USDTRY: 0, SARTRY: 0, USDSAR: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchRates() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/rates", { cache: "no-store" })
      if (!res.ok) throw new Error("Kur servisi hata döndü")
      const data = await res.json()
      setRates({
        USDTRY: Number(data.USDTRY) || 0,
        SARTRY: Number(data.SARTRY) || 0,
        USDSAR: Number(data.USDSAR) || 0,
      })
    } catch (e: any) {
      setError(e?.message || "Kurlar alınamadı")
      // Fallback rates
      setRates({ USDTRY: 34, SARTRY: 9, USDSAR: 3.75 })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
    const interval = setInterval(fetchRates, 10 * 60 * 1000) // 10 minutes
    return () => clearInterval(interval)
  }, [])

  return { rates, isLoading, error, refresh: fetchRates }
}

export function convertToTRY(amount: number, currency: string, rates: { USDTRY?: number; SARTRY?: number }): number {
  if (currency === "TRY") return amount
  if (currency === "USD") return amount * (rates.USDTRY || 34)
  if (currency === "SAR") return amount * (rates.SARTRY || 9)
  return amount
}
