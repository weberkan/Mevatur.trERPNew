"use client"

import { useMemo, useState, useEffect } from "react"
import { useAppStore, type CompanyEntry, type Payment, type Expense } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import ExportButton from "./export-button"
import { formatCurrency, formatDate } from "@/lib/format"
import { Plus, Trash2, Pencil, ArrowUpDown, Loader2 } from "lucide-react"
import { useExchangeRates } from "@/lib/rates"
import { fetchCompanyEntries, createCompanyEntry, updateCompanyEntry as apiUpdateCompanyEntry, deleteCompanyEntry as apiDeleteCompanyEntry } from "@/lib/api-company-entries"
import { fetchPayments } from "@/lib/api-payments"
import { fetchExpenses } from "@/lib/api-expenses"

type ViewMode = "records" | "monthly" | "weekly"
type SortBy = "date" | "type"
type SortDir = "asc" | "desc"

export default function CompanyFinanceModule() {
  const participants = useAppStore((s) => s.participants)
  const groups = useAppStore((s) => s.groups)
  
  // Local API-based state
  const [entries, setEntries] = useState<CompanyEntry[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Load all data on component mount
  useEffect(() => {
    loadAllData()
  }, [])
  
  const loadAllData = async () => {
    try {
      setLoading(true)
      // Load all data in parallel
      const [entriesData, paymentsData, expensesData] = await Promise.all([
        fetchCompanyEntries(),
        fetchPayments(),
        fetchExpenses()
      ])
      
      console.log('Company Finance - Data loaded:', {
        entriesCount: entriesData.length,
        paymentsCount: paymentsData.length,
        expensesCount: expensesData.length
      })
      
      setEntries(entriesData)
      setPayments(paymentsData)
      setExpenses(expensesData)
      
      // Also load groups and participants
      useAppStore.getState().loadGroups()
      useAppStore.getState().loadParticipants()
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const { rates } = useExchangeRates()
  const USDTRY = rates.USDTRY || 0

  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<CompanyEntry | null>(null)

  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [view, setView] = useState<ViewMode>("records")
  const [sortBy, setSortBy] = useState<SortBy>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const [form, setForm] = useState<Partial<CompanyEntry>>({
    date: new Date().toISOString().slice(0, 10),
    type: "Gelir",
    currency: "TRY",
    amount: 0,
    amountTRY: 0,
    category: "Diğer",
    description: "",
  })

  const inRange = useMemo(() => {
    return (d: string) => {
      const t = new Date(d).getTime()
      const fromOk = dateFrom ? t >= new Date(dateFrom).getTime() : true
      const toOk = dateTo ? t <= new Date(dateTo).getTime() : true
      return fromOk && toOk
    }
  }, [dateFrom, dateTo])

  function toTRY(amount: number, currency: "TRY" | "USD" | "SAR") {
    if (currency === "TRY") return amount
    if (currency === "USD") return USDTRY ? amount * USDTRY : amount
    // Keep SAR conversion in case historical/readonly rows contain SAR
    if (currency === "SAR") return rates.SARTRY || 0 ? amount * (rates.SARTRY || 0) : amount
    return amount
  }

  // Derived entries: preserve original currency and amount
  const derivedFromPayments = useMemo(() => {
    const derived = payments.map((p) => {
      const participant = participants.find((pp) => pp.id === p.participantId)
      const group = groups.find((g) => g.id === participant?.groupId)
      return {
        id: `PAY-${p.id}`,
        date: p.date,
        type: "Gelir" as const,
        currency: p.currency,
        amount: p.amount,
        amountTRY: p.amountTRY ?? toTRY(p.amount, p.currency),
        category: `Ödeme - ${group?.name || "-"}`,
        description: participant?.fullName || "",
        readonly: true,
      }
    })
    
    console.log('Company Finance - derivedFromPayments:', {
      paymentsCount: payments.length,
      participantsCount: participants.length,
      groupsCount: groups.length,
      derivedCount: derived.length
    })
    
    return derived
  }, [payments, participants, groups])

  const derivedFromExpenses = useMemo(() => {
    const derived = expenses.map((e) => {
      const group = groups.find((g) => g.id === e.groupId)
      return {
        id: `EXP-${e.id}`,
        date: e.date,
        type: "Gider" as const,
        currency: e.currency,
        amount: e.amount,
        amountTRY: e.amountTRY ?? toTRY(e.amount, e.currency),
        category: group ? `Gider (${e.category}) - ${group.name}` : `Gider (${e.category})`,
        description: e.description || "",
        readonly: true,
      }
    })
    
    console.log('Company Finance - derivedFromExpenses:', {
      expensesCount: expenses.length,
      groupsCount: groups.length,
      derivedCount: derived.length
    })
    
    return derived
  }, [expenses, groups])

  const combined = useMemo(() => {
    const raw: CompanyEntry[] = [
      ...entries.map((e) => ({ ...e, readonly: false })),
      ...derivedFromPayments,
      ...derivedFromExpenses,
    ].filter((e) => inRange(e.date))
    
    console.log('Company Finance - combined:', {
      entriesCount: entries.length,
      derivedFromPaymentsCount: derivedFromPayments.length,
      derivedFromExpensesCount: derivedFromExpenses.length,
      beforeFilter: entries.length + derivedFromPayments.length + derivedFromExpenses.length,
      afterFilter: raw.length,
      dateFilter: { dateFrom, dateTo }
    })
    
    raw.sort((a, b) => {
      if (sortBy === "date") {
        const da = new Date(a.date).getTime()
        const db = new Date(b.date).getTime()
        return sortDir === "asc" ? da - db : db - da
      } else {
        const order = (t: any) => (t === "Gider" ? 2 : 1)
        const oa = order(a.type)
        const ob = order(b.type)
        return sortDir === "asc" ? oa - ob : ob - oa
      }
    })
    return raw
  }, [entries, derivedFromPayments, derivedFromExpenses, dateFrom, dateTo, sortBy, sortDir, inRange])

  // Totals per currency (USD and TL only; SAR removed from header blocks)
  type Totals = { income: number; expense: number; balance: number }
  
  const totalsUSD = useMemo(() => {
    const incomeEntries = combined.filter((e) => e.type === "Gelir" && e.currency === "USD")
    const expenseEntries = combined.filter((e) => e.type === "Gider" && e.currency === "USD")
    const income = incomeEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
    const expense = expenseEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
    
    console.log('Company Finance - totalsUSD:', {
      combinedCount: combined.length,
      incomeEntriesCount: incomeEntries.length,
      expenseEntriesCount: expenseEntries.length,
      income,
      expense,
      balance: income - expense
    })
    
    return { income, expense, balance: income - expense }
  }, [combined])
  
  const totalsTRY = useMemo(() => {
    // Sadece TRY para birimindeki kayıtları hesapla
    const incomeEntries = combined.filter((e) => e.type === "Gelir" && e.currency === "TRY")
    const expenseEntries = combined.filter((e) => e.type === "Gider" && e.currency === "TRY")
    const income = incomeEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
    const expense = expenseEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
    
    console.log('Company Finance - totalsTRY:', {
      combinedCount: combined.length,
      incomeEntriesCount: incomeEntries.length,
      expenseEntriesCount: expenseEntries.length,
      income,
      expense,
      balance: income - expense
    })
    
    return { income, expense, balance: income - expense }
  }, [combined])

  const csvRows = combined.map((e) => ({
    Tarih: e.date,
    Tür: e.type,
    Kategori: e.category,
    Açıklama: e.description || "",
    "Tutar (Orijinal)": `${e.amount} ${e.currency}`,
    "Tutar (TL)": e.amountTRY,
    Kaynak: (e as any).readonly ? "Grup İşlemleri" : "Manuel",
  }))

  async function submit() {
    if (!form.date || !form.type || form.amount == null || !form.currency || submitting) return
    
    try {
      setSubmitting(true)
      const amount = Number(form.amount || 0)
      const amountTRY = toTRY(amount, form.currency as any)
      
      const entryData = {
        date: form.date!,
        type: form.type! as CompanyEntry["type"],
        currency: form.currency! as "TRY" | "USD",
        amount: Number(amount), // Ensure it's a number
        amountTRY: Number(amountTRY), // Ensure it's a number
        category: form.category || "Diğer",
        description: form.description || "",
        readonly: false
      }
      
      const newEntry = await createCompanyEntry(entryData)
      setEntries(prev => [newEntry, ...prev])
      setOpen(false)
      
      // Refresh payments and expenses to get latest data
      const [paymentsData, expensesData] = await Promise.all([
        fetchPayments(),
        fetchExpenses()
      ])
      setPayments(paymentsData)
      setExpenses(expensesData)
      
      // Reset form
      setForm({
        date: new Date().toISOString().slice(0, 10),
        type: "Gelir",
        currency: "TRY",
        amount: 0,
        amountTRY: 0,
        category: "Diğer",
        description: "",
      })
    } catch (error) {
      console.error('Failed to create company entry:', error)
      alert('Kayıt eklenirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitEdit() {
    if (!editing || submitting) return
    
    try {
      setSubmitting(true)
      const amount = Number(form.amount ?? editing.amount)
      const currency = (form.currency ?? editing.currency) as "TRY" | "USD"
      const amountTRY = toTRY(amount, currency as any)
      
      const updatedEntry = await apiUpdateCompanyEntry(editing.id, {
        date: (form.date as string) || editing.date,
        type: (form.type as CompanyEntry["type"]) || editing.type,
        currency,
        amount: Number(amount), // Ensure it's a number
        amountTRY: Number(amountTRY), // Ensure it's a number
        category: (form.category as string) ?? editing.category,
        description: (form.description as string) ?? editing.description,
        readonly: editing.readonly
      })
      
      setEntries(prev => prev.map(e => e.id === editing.id ? updatedEntry : e))
      setEditOpen(false)
      setEditing(null)
    } catch (error) {
      console.error('Failed to update company entry:', error)
      alert('Kayıt güncellenirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return
    
    try {
      await apiDeleteCompanyEntry(id)
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (error) {
      console.error('Failed to delete company entry:', error)
      alert('Kayıt silinirken bir hata oluştu')
    }
  }

  function toggleSort(col: SortBy) {
    if (sortBy !== col) {
      setSortBy(col)
      setSortDir("desc")
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Şirket Muhasebe</h2>
          <p className="text-sm text-muted-foreground">
            Gelir–Gider sekmesindeki tüm kayıtlar otomatik aktarılır. Aşağıdan ekstra kayıt ekleyebilir ve
            düzenleyebilirsiniz.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton filename="meva-muhasebe.xlsx" rows={csvRows} />
          <ExportButton mode="print" title="Meva Muhasebe Kayıtları" rows={csvRows} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Kayıt Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Gelir / Gider Ekle</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Tarih</Label>
                    <Input
                      type="date"
                      value={form.date || ""}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tür</Label>
                    <select
                      className="h-9 w-full rounded border px-3 py-1 text-sm"
                      value={(form.type as string) || "Gelir"}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CompanyEntry["type"] }))}
                    >
                      <option value="Gelir">Gelir</option>
                      <option value="Gider">Gider</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Para Birimi</Label>
                    <select
                      className="h-9 w-full rounded border px-3 py-1 text-sm"
                      value={(form.currency as string) || "TRY"}
                      onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as "TRY" | "USD" }))}
                    >
                      <option value="TRY">TRY</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Tutar ({form.currency})</Label>
                  <Input
                    type="number"
                    min={0}
                    value={String(form.amount ?? 0)}
                    onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    ≈ {`TL ${toTRY(Number(form.amount || 0), (form.currency as any) || "TRY").toFixed(2)}`}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Kategori</Label>
                  <Input
                    value={form.category || ""}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="Örn. Kira, Ofis Malzeme..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Açıklama</Label>
                  <Input
                    value={form.description || ""}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  İptal
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit}>
                  Kaydet
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Totals per currency (SAR removed) */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          Gelir (USD): {formatCurrency(totalsUSD.income, "USD")}
        </div>
        <div className="px-3 py-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          Gider (USD): {formatCurrency(totalsUSD.expense, "USD")}
        </div>
        <div
          className={`px-3 py-2 rounded border text-sm ${totalsUSD.balance >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}
        >
          Bakiye (USD): {formatCurrency(totalsUSD.balance, "USD")}
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <div className="px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          Gelir (TRY): {formatCurrency(totalsTRY.income, "TRY")}
        </div>
        <div className="px-3 py-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          Gider (TRY): {formatCurrency(totalsTRY.expense, "TRY")}
        </div>
        <div
          className={`px-3 py-2 rounded border text-sm ${totalsTRY.balance >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}
        >
          Bakiye (TRY): {formatCurrency(totalsTRY.balance, "TRY")}
        </div>
      </div>

      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Başlangıç" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Bitiş" />
            <select
              className="h-9 w-full rounded border px-3 py-1 text-sm"
              value={view}
              onChange={(e) => setView(e.target.value as ViewMode)}
            >
              <option value="records">Kayıtlar</option>
              <option value="monthly">Aylık Özet</option>
              <option value="weekly">Haftalık Özet</option>
            </select>
          </div>

          {view === "records" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="text-left p-2 font-medium">
                      <button
                        className="inline-flex items-center gap-1 hover:underline"
                        onClick={() => toggleSort("date")}
                      >
                        Tarih <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="text-left p-2 font-medium">
                      <button
                        className="inline-flex items-center gap-1 hover:underline"
                        onClick={() => toggleSort("type")}
                      >
                        Tür <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="text-left p-2 font-medium">Kategori</th>
                    <th className="text-left p-2 font-medium">Açıklama</th>
                    <th className="text-left p-2 font-medium">Tutar</th>
                    <th className="text-left p-2 font-medium">Kaynak</th>
                    <th className="text-right p-2 font-medium">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="p-8 text-center" colSpan={7}>
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Yükleniyor...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {combined.map((e: any) => (
                        <tr key={e.id} className="border-t">
                          <td className="p-2">{formatDate(e.date)}</td>
                          <td className={`p-2 ${e.type === "Gelir" ? "text-emerald-700" : "text-red-700"}`}>{e.type}</td>
                          <td className="p-2">{e.category}</td>
                          <td className="p-2">{e.description || "-"}</td>
                          <td className="p-2">
                            <div>{formatCurrency(e.amount, e.currency)}</div>
                            <div className="text-xs text-muted-foreground">≈ {formatCurrency(e.amountTRY, "TRY")}</div>
                          </td>
                          <td className="p-2">{e.readonly ? "Grup İşlemleri" : "Manuel"}</td>
                          <td className="p-2 text-right">
                            {e.readonly ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    setEditing(e as CompanyEntry)
                                    setForm(e as CompanyEntry)
                                    setEditOpen(true)
                                  }}
                                  aria-label="Düzenle"
                                >
                                  <Pencil className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => deleteEntry(e.id)}
                                  aria-label="Sil"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!loading && combined.length === 0 ? (
                        <tr>
                          <td className="p-3 text-center text-muted-foreground" colSpan={7}>
                            Kayıt yok.
                          </td>
                        </tr>
                      ) : null}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}

          {view !== "records" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="text-left p-2 font-medium">{view === "monthly" ? "Ay" : "Hafta"}</th>
                    <th className="text-left p-2 font-medium">Para Birimi</th>
                    <th className="text-left p-2 font-medium">Gelir</th>
                    <th className="text-left p-2 font-medium">Gider</th>
                    <th className="text-left p-2 font-medium">Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Para birimi ve tarih bazlı gruplandırma
                    const buckets = new Map<string, { incomeUSD: number; expenseUSD: number; incomeTRY: number; expenseTRY: number }>()
                    
                    function isoWeek(d: Date) {
                      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
                      const dayNum = date.getUTCDay() || 7
                      date.setUTCDate(date.getUTCDate() + 4 - dayNum)
                      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
                      const weekNo = Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7)
                      return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
                    }
                    
                    for (const e of combined) {
                      const key =
                        view === "monthly"
                          ? `${new Date(e.date).getFullYear()}-${String(new Date(e.date).getMonth() + 1).padStart(2, "0")}`
                          : isoWeek(new Date(e.date))
                      
                      const cur = buckets.get(key) || { incomeUSD: 0, expenseUSD: 0, incomeTRY: 0, expenseTRY: 0 }
                      
                      if (e.currency === "USD") {
                        if (e.type === "Gelir") cur.incomeUSD += Number(e.amount || 0)
                        else cur.expenseUSD += Number(e.amount || 0)
                      } else if (e.currency === "TRY") {
                        if (e.type === "Gelir") cur.incomeTRY += Number(e.amount || 0)
                        else cur.expenseTRY += Number(e.amount || 0)
                      }
                      
                      buckets.set(key, cur)
                    }
                    
                    const result: JSX.Element[] = []
                    
                    Array.from(buckets.entries()).forEach(([key, v]) => {
                      // USD satırı (eğer USD işlemi varsa)
                      if (v.incomeUSD > 0 || v.expenseUSD > 0) {
                        const bakiyeUSD = v.incomeUSD - v.expenseUSD
                        result.push(
                          <tr key={`${key}-USD`} className="border-t">
                            <td className="p-2">{key}</td>
                            <td className="p-2">USD</td>
                            <td className="p-2">{formatCurrency(v.incomeUSD, "USD")}</td>
                            <td className="p-2">{formatCurrency(v.expenseUSD, "USD")}</td>
                            <td className={`p-2 ${bakiyeUSD >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                              {formatCurrency(bakiyeUSD, "USD")}
                            </td>
                          </tr>
                        )
                      }
                      
                      // TRY satırı (eğer TRY işlemi varsa)
                      if (v.incomeTRY > 0 || v.expenseTRY > 0) {
                        const bakiyeTRY = v.incomeTRY - v.expenseTRY
                        result.push(
                          <tr key={`${key}-TRY`} className="border-t">
                            <td className="p-2">{key}</td>
                            <td className="p-2">TRY</td>
                            <td className="p-2">{formatCurrency(v.incomeTRY, "TRY")}</td>
                            <td className="p-2">{formatCurrency(v.expenseTRY, "TRY")}</td>
                            <td className={`p-2 ${bakiyeTRY >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                              {formatCurrency(bakiyeTRY, "TRY")}
                            </td>
                          </tr>
                        )
                      }
                    })
                    
                    return result
                  })()}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o)
          if (!o) setEditing(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kayıt Düzenle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Tarih</Label>
                <Input
                  type="date"
                  value={(form.date as string) || ""}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Tür</Label>
                <select
                  className="h-9 w-full rounded border px-3 py-1 text-sm"
                  value={(form.type as string) || "Gelir"}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CompanyEntry["type"] }))}
                >
                  <option value="Gelir">Gelir</option>
                  <option value="Gider">Gider</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Para Birimi</Label>
                <select
                  className="h-9 w-full rounded border px-3 py-1 text-sm"
                  value={(form.currency as string) || "TRY"}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as "TRY" | "USD" }))}
                >
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Tutar ({form.currency})</Label>
              <Input
                type="number"
                min={0}
                value={String(form.amount ?? 0)}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">{`≈ ${formatCurrency(toTRY(Number(form.amount || 0), (form.currency as any) || "TRY"), "TRY")}`}</p>
            </div>
            <div className="grid gap-2">
              <Label>Kategori</Label>
              <Input
                value={form.category || ""}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Örn. Kira, Ofis Malzeme..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Açıklama</Label>
              <Input
                value={form.description || ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              İptal
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submitEdit}>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


