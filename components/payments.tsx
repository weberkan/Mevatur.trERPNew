"use client"

import { useMemo, useState, useEffect } from "react"
import { useAppStore, type Payment } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ExportButton from "./export-button"
import { formatCurrency, formatDate } from "@/lib/format"
import { getParticipantBalanceTRY } from "@/store/selectors"
import { Plus, Trash2, Pencil, Loader2 } from 'lucide-react'
import { useExchangeRates, convertToTRY } from "@/lib/rates"
import { fetchPayments, createPayment, updatePayment as apiUpdatePayment, deletePayment as apiDeletePayment } from "@/lib/api-payments"

export default function PaymentsModule() {
  const groups = useAppStore((s) => s.groups)
  const participants = useAppStore((s) => s.participants)
  const { rates } = useExchangeRates()
  
  // Local state for payments data
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Load payments on component mount
  useEffect(() => {
    loadPayments()
    // Also load groups and participants
    useAppStore.getState().loadGroups()
    useAppStore.getState().loadParticipants()
  }, [])
  
  const loadPayments = async () => {
    try {
      setLoading(true)
      const data = await fetchPayments()
      setPayments(data)
    } catch (error) {
      console.error('Failed to load payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Payment | null>(null)
  const [filterGroup, setFilterGroup] = useState<string>("all")
  const [filterParticipant, setFilterParticipant] = useState<string>("all")

  type FormState = Partial<Payment & { groupId?: string }>
  const [form, setForm] = useState<FormState>({
    participantId: "",
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    currency: "TRY",
    method: "Nakit",
    notes: "",
    groupId: "",
  })

  const visibleParticipants = useMemo(() => {
    if (form.groupId) {
      return participants.filter((p) => p.groupId === form.groupId)
    }
    return participants
  }, [form.groupId, participants])

  // Filtered participants for the filter dropdown
  const filteredParticipantsForDropdown = useMemo(() => {
    if (filterGroup === "all") {
      return participants
    }
    return participants.filter((p) => p.groupId === filterGroup)
  }, [filterGroup, participants])

  async function submit() {
    if (!form.participantId || !form.date || !form.amount || !form.currency) return
    
    try {
      setSubmitting(true)
      const amountTRY = convertToTRY(Number(form.amount || 0), form.currency as any, { USDTRY: rates.USDTRY, SARTRY: rates.SARTRY })
      
      const paymentData = {
        participantId: form.participantId!,
        date: form.date!,
        amount: Number(form.amount || 0),
        amountTRY,
        currency: (form.currency as Payment["currency"]) || "TRY",
        method: (form.method as Payment["method"]) || "Nakit",
        notes: form.notes || "",
      }
      
      const newPayment = await createPayment(paymentData)
      setPayments(prev => [newPayment, ...prev])
      setOpen(false)
      
      // Reset form
      setForm({
        participantId: "",
        date: new Date().toISOString().slice(0, 10),
        amount: 0,
        currency: "TRY",
        method: "Nakit",
        notes: "",
        groupId: "",
      })
    } catch (error) {
      console.error('Failed to create payment:', error)
      alert('Ödeme eklenirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitEdit() {
    if (!editing) return
    
    try {
      setSubmitting(true)
      const updated = { ...editing, ...form }
      const amountTRY = convertToTRY(Number(updated.amount || 0), updated.currency as any, { USDTRY: rates.USDTRY, SARTRY: rates.SARTRY })
      
      const updatedPayment = await apiUpdatePayment(editing.id, {
        participantId: updated.participantId,
        date: updated.date,
        amount: Number(updated.amount || 0),
        amountTRY,
        currency: updated.currency,
        method: updated.method,
        notes: updated.notes,
      })
      
      setPayments(prev => prev.map(p => p.id === editing.id ? updatedPayment : p))
      setEditOpen(false)
      setEditing(null)
    } catch (error) {
      console.error('Failed to update payment:', error)
      alert('Ödeme güncellenirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = payments.filter((pay) => {
    const participant = participants.find((p) => p.id === pay.participantId)
    const groupOk = filterGroup === "all" ? true : participant?.groupId === filterGroup
    const participantOk = filterParticipant === "all" ? true : pay.participantId === filterParticipant
    return groupOk && participantOk
  })

  const csvRows = filtered.map((pay) => {
    const participant = participants.find((p) => p.id === pay.participantId)
    const group = groups.find((g) => g.id === participant?.groupId)
    return {
      "Tarih": pay.date,
      "Grup": group?.name || "",
      "Katılımcı": participant?.fullName || "",
      "Tutar": `${formatCurrency(pay.amount, pay.currency)}`,
      "Tutar (TL)": pay.amountTRY,
      "Yöntem": pay.method,
      "Not": pay.notes || "",
    }
  })

  return (
    <div className="grid gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Ödemeler</h2>
          <p className="text-sm text-muted-foreground">Katılımcı ödemelerini ekleyin ve listeleyin. Tüm ödemeler TL’ye normalize edilir.</p>
        </div>
        <div className="flex gap-2">
          <ExportButton filename="odemeler.xlsx" rows={csvRows} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Ödeme Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Ödeme Ekle</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-2">
                  <Label>Grup</Label>
                  <Select value={(form.groupId as string) || "all"} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v === "all" ? "" : v, participantId: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Grup seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Gruplar</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Katılımcı</Label>
                  <Select value={(form.participantId as string) || ""} onValueChange={(v) => setForm((f) => ({ ...f, participantId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Katılımcı seçin" /></SelectTrigger>
                    <SelectContent>
                      {visibleParticipants.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Önce katılımcı ekleyin</div>
                      ) : null}
                      {visibleParticipants.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                    <Select value={(form.currency as string) || "TRY"} onValueChange={(v) => setForm((f) => ({ ...f, currency: v as Payment["currency"] }))}>
                      <SelectTrigger><SelectValue placeholder="Para birimi" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRY">TRY</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Yöntem</Label>
                  <Select value={(form.method as string) || "Nakit"} onValueChange={(v) => setForm((f) => ({ ...f, method: v as Payment["method"] }))}>
                    <SelectTrigger><SelectValue placeholder="Ödeme yöntemi" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nakit">Nakit</SelectItem>
                      <SelectItem value="Kart">Kart</SelectItem>
                      <SelectItem value="Havale">Havale</SelectItem>
                      <SelectItem value="Diğer">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Not</Label>
                  <Input value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
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

      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            <Select value={filterGroup} onValueChange={(value) => {
              setFilterGroup(value)
              // Reset participant filter when group changes
              setFilterParticipant("all")
            }}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Grup filtrele" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Gruplar</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterParticipant} onValueChange={setFilterParticipant}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Katılımcı filtrele" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Katılımcılar</SelectItem>
                {filteredParticipantsForDropdown.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left p-2 font-medium">Tarih</th>
                  <th className="text-left p-2 font-medium">Grup</th>
                  <th className="text-left p-2 font-medium">Katılımcı</th>
                  <th className="text-left p-2 font-medium">Yöntem</th>
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
                ) : filtered.map((pay) => {
                  const participant = participants.find((p) => p.id === pay.participantId)
                  const group = groups.find((g) => g.id === participant?.groupId)
                  const remaining = participant
                    ? getParticipantBalanceTRY(groups, payments, participant, { USDTRY: rates.USDTRY, SARTRY: rates.SARTRY })
                    : 0
                  return (
                    <tr key={pay.id} className="border-t">
                      <td className="p-2">{formatDate(pay.date)}</td>
                      <td className="p-2">{group?.name || "-"}</td>
                      <td className="p-2">
                        <div className="font-medium">{participant?.fullName || "-"}</div>
                        <div className="text-xs text-muted-foreground">Kalan: {formatCurrency(remaining, "TRY")}</div>
                      </td>
                      <td className="p-2">{pay.method}</td>
                      <td className="p-2">
                        <div>{formatCurrency(pay.amount, pay.currency)}</div>
                        <div className="text-xs text-muted-foreground">= {formatCurrency(pay.amountTRY, "TRY")}</div>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => { setEditing(pay); setForm(pay); setEditOpen(true) }}
                            aria-label="Düzenle"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            onClick={async () => {
                              if (confirm(`Bu ödeme kaydını silmek istediğinize emin misiniz?`)) {
                                try {
                                  await apiDeletePayment(pay.id)
                                  setPayments(prev => prev.filter(p => p.id !== pay.id))
                                } catch (error) {
                                  console.error('Failed to delete payment:', error)
                                  alert('Ödeme silinirken bir hata oluştu')
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
                {!loading && filtered.length === 0 ? (
                  <tr><td className="p-3 text-center text-muted-foreground" colSpan={6}>Ödeme yok.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ödeme Düzenle</DialogTitle>
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
                <Select value={(form.currency as string) || "TRY"} onValueChange={(v) => setForm((f) => ({ ...f, currency: v as Payment["currency"] }))}>
                  <SelectTrigger><SelectValue placeholder="Para birimi" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Yöntem</Label>
              <Select value={(form.method as string) || "Nakit"} onValueChange={(v) => setForm((f) => ({ ...f, method: v as Payment["method"] }))}>
                <SelectTrigger><SelectValue placeholder="Ödeme yöntemi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nakit">Nakit</SelectItem>
                  <SelectItem value="Kart">Kart</SelectItem>
                  <SelectItem value="Havale">Havale</SelectItem>
                  <SelectItem value="Diğer">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Not</Label>
              <Input value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
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


