"use client"

import { useMemo, useState, useEffect } from "react"
import { useAppStore, type Expense } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ExportButton from "./export-button"
import { formatCurrency, formatDate } from "@/lib/format"
import { Plus, Trash2, Pencil, Loader2 } from 'lucide-react'
import { useExchangeRates, convertToTRY } from "@/lib/rates"
import { fetchExpenses, createExpense, updateExpense as apiUpdateExpense, deleteExpense as apiDeleteExpense } from "@/lib/api-expenses"
import { fetchPayments } from "@/lib/api-payments"

export default function IncomeExpenseModule() {
  const groups = useAppStore((s) => s.groups)
  const participants = useAppStore((s) => s.participants)
  const { rates } = useExchangeRates()
  
  // Local state for data from API
  const [payments, setPayments] = useState<any[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    try {
      setLoading(true)
      const [paymentsData, expensesData] = await Promise.all([
        fetchPayments(),
        fetchExpenses()
      ])
      setPayments(paymentsData)
      setExpenses(expensesData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

  const [filterGroup, setFilterGroup] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")

  const [form, setForm] = useState<Partial<Expense>>({
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    currency: "TRY",
    category: "Uçak",
    description: "",
    groupId: "",
  })

  async function submit() {
    if (!form.date || !form.amount || !form.currency || !form.category) return
    
    try {
      setSubmitting(true)
      
      const amountTRY = convertToTRY(Number(form.amount || 0), form.currency as any, { USDTRY: rates.USDTRY, SARTRY: rates.SARTRY })
      
      const expenseData = {
        date: form.date!,
        amount: Number(form.amount || 0),
        currency: (form.currency as Expense["currency"]) || "TRY",
        amountTRY,
        category: (form.category as Expense["category"]) || "Uçak",
        description: form.description || "",
        groupId: form.groupId || null
      }
      
      const newExpense = await createExpense(expenseData)
      setExpenses(prev => [newExpense, ...prev])
      setOpen(false)
      
      // Reset form
      setForm({
        date: new Date().toISOString().slice(0, 10),
        amount: 0,
        currency: "TRY",
        category: "Uçak",
        description: "",
        groupId: "",
      })
    } catch (error) {
      console.error('Failed to create expense:', error)
      alert('Gider eklenirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitEdit() {
    if (!editing) return
    
    try {
      setSubmitting(true)
      const merged = { ...editing, ...form }
      const amountTRY = convertToTRY(Number(merged.amount ?? editing.amount), merged.currency as any, { USDTRY: rates.USDTRY, SARTRY: rates.SARTRY })
      
      const updatedExpense = await apiUpdateExpense(editing.id, {
        date: (merged.date as string) || editing.date,
        amount: Number(merged.amount ?? editing.amount),
        currency: (merged.currency as Expense["currency"]) || editing.currency,
        amountTRY,
        category: (merged.category as Expense["category"]) || editing.category,
        description: (merged.description as string) ?? editing.description,
        groupId: (merged.groupId as string) ?? editing.groupId
      })
      
      setExpenses(prev => prev.map(e => e.id === editing.id ? updatedExpense : e))
      setEditOpen(false)
      setEditing(null)
    } catch (error) {
      console.error('Failed to update expense:', error)
      alert('Gider güncellenirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const inRange = useMemo(() => {
    return (date: string) => {
      if (!date) return false
      
      try {
        const inputDate = new Date(date)
        if (isNaN(inputDate.getTime())) return false
        
        const t = inputDate.getTime()
        
        let fromOk = true
        let toOk = true
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom)
          fromDate.setHours(0, 0, 0, 0)
          fromOk = t >= fromDate.getTime()
        }
        
        if (dateTo) {
          const toDate = new Date(dateTo)
          toDate.setHours(23, 59, 59, 999)
          toOk = t <= toDate.getTime()
        }
        
        return fromOk && toOk
      } catch (error) {
        console.error('Date parsing error:', error, date)
        return false
      }
    }
  }, [dateFrom, dateTo])

  const filteredPayments = useMemo(() => {
    if (!Array.isArray(payments)) return []
    
    return payments.filter((p) => {
      if (!p || !p.date) return false
      
      // Grup filtresi
      if (filterGroup !== "all") {
        const participant = participants.find((pp) => pp.id === p.participantId)
        if (!participant || participant.groupId !== filterGroup) {
          return false
        }
      }
      
      // Tarih filtresi
      return inRange(p.date)
    })
  }, [payments, participants, filterGroup, dateFrom, dateTo, inRange])

  const filteredExpenses = useMemo(() => {
    if (loading || !Array.isArray(expenses)) return []
    
    return expenses.filter((e) => {
      if (!e || !e.date) return false
      
      // Grup filtresi
      if (filterGroup !== "all") {
        // Boş group_id olan kaygılar "Genel" olarak kabul edilir
        const expenseGroupId = e.groupId || null
        if (expenseGroupId !== filterGroup) {
          return false
        }
      }
      
      // Tarih filtresi
      return inRange(e.date)
    })
  }, [expenses, filterGroup, dateFrom, dateTo, loading, inRange])

  // Per-currency totals with improved error handling
  const totalIncomeUSD = useMemo(() => {
    return filteredPayments
      .filter(p => p && p.currency === "USD" && !isNaN(Number(p.amount)))
      .reduce((s, p) => s + Number(p.amount || 0), 0)
  }, [filteredPayments])
  
  const totalIncomeTRY = useMemo(() => {
    return filteredPayments
      .filter(p => p && p.currency === "TRY" && !isNaN(Number(p.amount)))
      .reduce((s, p) => s + Number(p.amount || 0), 0)
  }, [filteredPayments])
  
  const totalExpenseUSD = useMemo(() => {
    return filteredExpenses
      .filter(e => e && e.currency === "USD" && !isNaN(Number(e.amount)))
      .reduce((s, e) => s + Number(e.amount || 0), 0)
  }, [filteredExpenses])
  
  const totalExpenseTRY = useMemo(() => {
    return filteredExpenses
      .filter(e => e && e.currency === "TRY" && !isNaN(Number(e.amount)))
      .reduce((s, e) => s + Number(e.amount || 0), 0)
  }, [filteredExpenses])
  
  const balanceUSD = totalIncomeUSD - totalExpenseUSD
  const balanceTRY = totalIncomeTRY - totalExpenseTRY

  const csvRows = [
    ...filteredPayments.map((p) => {
      const participant = participants.find((pp) => pp.id === p.participantId)
      const group = groups.find((g) => g.id === participant?.groupId)
      return {
        "Tür": "Gelir",
        "Tarih": p.date,
        "Grup": group?.name || "",
        "Açıklama": participant?.fullName || "",
        "Kategori": "Ödeme",
        "Tutar (Orijinal)": `${p.amount} ${p.currency}`,
        "Tutar (TL)": p.amountTRY ?? p.amount,
      }
    }),
    ...filteredExpenses.map((e) => {
      const group = groups.find((g) => g.id === e.groupId)
      return {
        "Tür": "Gider",
        "Tarih": e.date,
        "Grup": group?.name || "",
        "Açıklama": e.description,
        "Kategori": e.category,
        "Tutar (Orijinal)": `${e.amount} ${e.currency}`,
        "Tutar (TL)": e.amountTRY ?? e.amount,
      }
    }),
  ]

  return (
    <div className="grid gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Gelir–Gider</h2>
          <p className="text-sm text-muted-foreground">Ödemeler otomatik gelir. Tutarlar girildiği para biriminde gösterilir; TL eşdeğeri bilgi amaçlıdır.</p>
        </div>
        <div className="flex gap-2">
          <ExportButton filename="gelir-gider.xlsx" rows={csvRows} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Gider Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Gider Ekle</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Tarih</Label>
                    <Input type="date" value={form.date || ""} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tutar</Label>
                    <Input type="number" min={0} value={String(form.amount ?? 0)} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Para Birimi</Label>
                    <Select value={(form.currency as string) || "TRY"} onValueChange={(v) => setForm((f) => ({ ...f, currency: v as Expense["currency"] }))}>
                      <SelectTrigger><SelectValue placeholder="Para birimi" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRY">TRY</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Kategori</Label>
                  <Select value={(form.category as string) || "Uçak"} onValueChange={(v) => setForm((f) => ({ ...f, category: v as Expense["category"] }))}>
                    <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Uçak">Uçak</SelectItem>
                      <SelectItem value="Otel">Otel</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                      <SelectItem value="Rehberlik">Rehberlik</SelectItem>
                      <SelectItem value="Vize">Vize</SelectItem>
                      <SelectItem value="Diğer">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Grup (opsiyonel)</Label>
                  <Select value={(form.groupId as string) || "none"} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Grup seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tüm / Genel</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Açıklama</Label>
                  <Input value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700" 
                  onClick={submit}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Kaydet
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Header totals per currency (no conversion between currencies) */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            Gelir (TRY): {formatCurrency(totalIncomeTRY, "TRY")}
          </div>
          <div className="px-3 py-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
            Gider (TRY): {formatCurrency(totalExpenseTRY, "TRY")}
          </div>
          <div className={`px-3 py-2 rounded border text-sm ${balanceTRY >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            Bakiye (TRY): {formatCurrency(balanceTRY, "TRY")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            Gelir (USD): {formatCurrency(totalIncomeUSD, "USD")}
          </div>
          <div className="px-3 py-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
            Gider (USD): {formatCurrency(totalExpenseUSD, "USD")}
          </div>
          <div className={`px-3 py-2 rounded border text-sm ${balanceUSD >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            Bakiye (USD): {formatCurrency(balanceUSD, "USD")}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="grid md:grid-cols-4 gap-3 mb-4">
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger><SelectValue placeholder="Grup filtrele" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Gruplar</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Başlangıç" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Bitiş" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Gelirler (Ödemeler)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="text-left p-2 font-medium">Tarih</th>
                      <th className="text-left p-2 font-medium">Grup</th>
                      <th className="text-left p-2 font-medium">Katılımcı</th>
                      <th className="text-left p-2 font-medium">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => {
                      const participant = participants.find((pp) => pp.id === p.participantId)
                      const group = groups.find((g) => g.id === participant?.groupId)
                      return (
                        <tr key={p.id} className="border-t">
                          <td className="p-2">{formatDate(p.date)}</td>
                          <td className="p-2">{group?.name || "-"}</td>
                          <td className="p-2">{participant?.fullName || "-"}</td>
                          <td className="p-2">
                            <div>{formatCurrency(p.amount, p.currency)}</div>
                            <div className="text-xs text-muted-foreground">= {formatCurrency(p.amountTRY ?? p.amount, "TRY")}</div>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredPayments.length === 0 ? (<tr><td className="p-3 text-center text-muted-foreground" colSpan={4}>Kayıt yok.</td></tr>) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Giderler</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="text-left p-2 font-medium">Tarih</th>
                      <th className="text-left p-2 font-medium">Grup</th>
                      <th className="text-left p-2 font-medium">Kategori</th>
                      <th className="text-left p-2 font-medium">Açıklama</th>
                      <th className="text-left p-2 font-medium">Tutar</th>
                      <th className="text-right p-2 font-medium">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td className="p-8 text-center" colSpan={6}>
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Yüklüyor...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredExpenses.map((e) => {
                      const group = groups.find((g) => g.id === e.groupId)
                      return (
                        <tr key={e.id} className="border-t">
                          <td className="p-2">{formatDate(e.date)}</td>
                          <td className="p-2">{group?.name || "Genel"}</td>
                          <td className="p-2">{e.category}</td>
                          <td className="p-2">{e.description || "-"}</td>
                          <td className="p-2">
                            <div>{formatCurrency(e.amount, e.currency)}</div>
                            <div className="text-xs text-muted-foreground">= {formatCurrency(e.amountTRY ?? e.amount, "TRY")}</div>
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="icon" onClick={() => { setEditing(e); setForm(e); setEditOpen(true) }} aria-label="Düzenle">
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="icon" 
                                onClick={async () => {
                                  if (confirm(`Bu gider kaydını silmek istediğinize emin misiniz?`)) {
                                    try {
                                      await apiDeleteExpense(e.id)
                                      setExpenses(prev => prev.filter(ex => ex.id !== e.id))
                                    } catch (error) {
                                      console.error('Failed to delete expense:', error)
                                      alert('Gider silinirken bir hata oluştu')
                                    }
                                  }
                                }}
                                aria-label="Sil"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {!loading && filteredExpenses.length === 0 ? (<tr><td className="p-3 text-center text-muted-foreground" colSpan={6}>Kayıt yok.</td></tr>) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gider Düzenle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Tarih</Label>
                <Input type="date" value={(form.date as string) || ""} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Tutar</Label>
                <Input type="number" min={0} value={String(form.amount ?? 0)} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
              </div>
              <div className="grid gap-2">
                <Label>Para Birimi</Label>
                <Select value={(form.currency as string) || "TRY"} onValueChange={(v) => setForm((f) => ({ ...f, currency: v as Expense["currency"] }))}>
                  <SelectTrigger><SelectValue placeholder="Para birimi" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Kategori</Label>
              <Select value={(form.category as string) || "Uçak"} onValueChange={(v) => setForm((f) => ({ ...f, category: v as Expense["category"] }))}>
                <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Uçak">Uçak</SelectItem>
                  <SelectItem value="Otel">Otel</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                  <SelectItem value="Rehberlik">Rehberlik</SelectItem>
                  <SelectItem value="Vize">Vize</SelectItem>
                  <SelectItem value="Diğer">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Grup (opsiyonel)</Label>
              <Select value={(form.groupId as string) || "none"} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Grup seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tüm / Genel</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Açıklama</Label>
              <Input value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>İptal</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700" 
              onClick={submitEdit}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


