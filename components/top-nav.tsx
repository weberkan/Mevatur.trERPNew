"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useExchangeRates } from "@/lib/rates"
import { useMemo, useState, useEffect } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/format"
import { LogOut, Users, Building2 } from "lucide-react"

type Pair = "USDTRY" | "SARTRY" | "USDSAR"

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { rates, isLoading, error, refresh } = useExchangeRates()

  const isDashboard = pathname?.startsWith("/dashboard")
  const isCompany = pathname?.startsWith("/company")
  const isUsers = pathname?.startsWith("/users")

  const [convOpen, setConvOpen] = useState(false)
  const [pair, setPair] = useState<Pair | null>(null)
  const [amount, setAmount] = useState<string>("1")

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  
  const [isAdmin, setIsAdmin] = useState(false)

  // Kullanıcı rolünü kontrol et
  useEffect(() => {
    const checkUserRole = () => {
      try {
        const userStr = sessionStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          setIsAdmin(user.role === 'admin')
        } else {
          setIsAdmin(false)
        }
      } catch {
        setIsAdmin(false)
      }
    }
    
    checkUserRole()
  }, [])

  const info = useMemo(() => {
    if (!pair) return null as null | { title: string; from: "USD" | "SAR"; to: "TRY" | "SAR"; rate: number }
    if (pair === "USDTRY")
      return { title: "USD → TRY Çevirici", from: "USD" as const, to: "TRY" as const, rate: rates.USDTRY || 0 }
    if (pair === "SARTRY")
      return { title: "SAR → TRY Çevirici", from: "SAR" as const, to: "TRY" as const, rate: rates.SARTRY || 0 }
    return { title: "USD → SAR Çevirici", from: "USD" as const, to: "SAR" as const, rate: rates.USDSAR || 0 }
  }, [pair, rates.USDTRY, rates.SARTRY, rates.USDSAR])

  const result = useMemo(() => {
    const a = Number(amount || "0")
    if (!info || !isFinite(a) || a < 0) return 0
    if (!info.rate) return 0
    return a * info.rate
  }, [amount, info])

  function openConv(p: Pair) {
    setPair(p)
    setAmount("1")
    setConvOpen(true)
  }

  function handleCompanyClick(e: React.MouseEvent) {
    e.preventDefault()
    setPassword("")
    setPasswordError("")
    setPasswordOpen(true)
  }

  function handlePasswordSubmit() {
    if (password === "571632") {
      setPasswordOpen(false)
      setPassword("")
      setPasswordError("")
      router.push("/company")
    } else {
      setPasswordError("Hatalı şifre")
    }
  }

  async function handleLogout() {
    try {
      // Logout API'sini çağır (cookie'yi temizler)
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout hatası:', error)
    } finally {
      // Session storage'ı temizle
      sessionStorage.removeItem('isAuthenticated')
      sessionStorage.removeItem('user')
      
      // Login sayfasına yönlendir
      router.push('/login')
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b">
      <div className="max-w-7xl mx-auto flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image src="/images/logo.png" alt="Meva logo" width={28} height={28} />
              <div className="hidden md:block">
                <h1 className="text-lg font-bold text-emerald-700">Meva Panel</h1>
              </div>
            </Link>
          </div>

        </div>

        <div className="flex items-center gap-2 text-xs">
          {isAdmin && (
            <Link
              href="/users"
              className={`px-2 py-1 rounded border text-xs transition-colors ${
                isUsers ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"
              }`}
              title="Kullanıcı Yönetimi"
            >
              <Users className="w-3 h-3" />
            </Link>
          )}
          <button
            type="button"
            onClick={handleCompanyClick}
            className={`px-2 py-1 rounded border text-xs transition-colors ${
              isCompany ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"
            }`}
            title="Şirket Muhasebe"
          >
            <Building2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-2 py-1 rounded bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs"
            title="Çıkış Yap"
          >
            <LogOut className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => openConv("USDTRY")}
            className="px-2 py-1 rounded bg-neutral-50 border text-neutral-700 hover:bg-neutral-100"
            title="USD→TRY çevirici"
          >
            {isLoading ? "USD→TRY…" : rates.USDTRY ? `USD→TRY ${rates.USDTRY.toFixed(2)}` : "USD→TRY -"}
          </button>
          <button
            type="button"
            onClick={() => openConv("SARTRY")}
            className="px-2 py-1 rounded bg-neutral-50 border text-neutral-700 hover:bg-neutral-100"
            title="SAR→TRY çevirici"
          >
            {isLoading ? "SAR→TRY…" : rates.SARTRY ? `SAR→TRY ${rates.SARTRY.toFixed(2)}` : "SAR→TRY -"}
          </button>
          <button
            type="button"
            onClick={() => openConv("USDSAR")}
            className="px-2 py-1 rounded bg-neutral-50 border text-neutral-700 hover:bg-neutral-100"
            title="USD→SAR çevirici"
          >
            {isLoading ? "USD→SAR…" : rates.USDSAR ? `USD→SAR ${rates.USDSAR.toFixed(4)}` : "USD→SAR -"}
          </button>
          {error ? (
            <button onClick={refresh} className="px-2 py-1 rounded border text-red-700 text-xs">
              Yenile
            </button>
          ) : null}
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Şirket Muhasebe Erişimi</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="company-password">Şifre</Label>
              <Input
                id="company-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi girin"
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              />
              {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>
              İptal
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handlePasswordSubmit}>
              Giriş
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Converter Dialog */}
      <Dialog open={convOpen} onOpenChange={setConvOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{info?.title || "Çevirici"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            {info?.rate ? (
              <>
                <div className="text-xs text-muted-foreground">{`1 ${info.from} = ${formatCurrency(info.rate, info.to)}`}</div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{`${info.from} Tutarı`}</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="rounded border bg-neutral-50 px-3 py-2 text-sm">
                  {`Sonuç: `}
                  <span className="font-medium">{formatCurrency(result, info.to)}</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-red-700">Kur bilgisi alınamadı. Lütfen tekrar deneyin.</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvOpen(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
