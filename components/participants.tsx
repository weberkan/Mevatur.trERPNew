"use client"

import { useMemo, useState, useEffect } from "react"
import { useAppStore, type Participant, type Group } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ExportButton from "./export-button"
import {
  getParticipantBalance,
  getParticipantFee,
  getParticipantFeeTRY,
  getPaymentSumsByCurrency,
} from "@/store/selectors"
import { formatCurrency } from "@/lib/format"
import { Plus, Pencil, Trash2, Filter, Info } from "lucide-react"
import { isEmail, isPassport, isPhoneTR, isTC, normalizePassport, normalizePhone } from "@/lib/validators"
import { useExchangeRates } from "@/lib/rates"
import { fetchPayments } from "@/lib/api-payments"

type Errors = Partial<Record<keyof Participant | "form", string>>

export default function ParticipantsModule() {
  const groups = useAppStore((s) => s.groups)
  const loadGroups = useAppStore((s) => s.loadGroups)
  const participants = useAppStore((s) => s.participants)
  const loadParticipants = useAppStore((s) => s.loadParticipants)
  const rooms = useAppStore((s) => s.rooms)
  
  // Local payments state (API-based)
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const addParticipant = useAppStore((s) => s.addParticipant)
  const updateParticipant = useAppStore((s) => s.updateParticipant)
  const deleteParticipant = useAppStore((s) => s.deleteParticipant)
  const assignParticipantRoom = useAppStore((s) => s.assignParticipantRoom)
  const loading = useAppStore((s) => s.loading)
  const { rates } = useExchangeRates()

  // Verileri yükle
  useEffect(() => {
    loadGroups().catch(console.error)
    loadParticipants().catch(console.error)
    // Ödemeleri yükle
    fetchPayments()
      .then(setPayments)
      .catch(console.error)
      .finally(() => setPaymentsLoading(false))
  }, [])

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Participant | null>(null)
  const [filterGroup, setFilterGroup] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [errors, setErrors] = useState<Errors>({})

  // Room assignment state'leri kaldırıldı - Odalama sekmesinde yapılacak

  const [form, setForm] = useState<Partial<Participant>>({
    fullName: "",
    phone: "",
    email: "",
    idNumber: "",
    passportNo: "",
    passportValidUntil: "",
    birthDate: "",
    gender: "Mr",
    groupId: "",
    roomType: "2",
    dayCount: 7,
    discount: 0,
    reference: "",
  })

  function resetForm() {
    setForm({
      fullName: "",
      phone: "",
      email: "",
      idNumber: "",
      passportNo: "",
      passportValidUntil: "",
      birthDate: "",
      gender: "Mr",
      groupId: "",
      roomType: "2",
      dayCount: 7,
      discount: 0,
      reference: "",
    })
    setEditing(null)
    setErrors({})
  }

  function remainingForGroup(groupId?: string) {
    if (!groupId) return 0
    const g = groups.find((gg) => gg.id === groupId)
    if (!g) return 0
    const count = participants.filter((p) => p.groupId === groupId).length
    return Math.max(g.capacity - count, 0)
  }

  function validate(): boolean {
    const e: Errors = {}
    if (!form.fullName?.trim()) e.fullName = "Ad Soyad zorunlu"
    if (!form.groupId) e.groupId = "Grup seçin"
    if (!form.roomType) e.roomType = "Oda tipi seçin"
    if (!form.dayCount) e.dayCount = "Gün seçin"

    if (form.idNumber && !isTC(form.idNumber)) e.idNumber = "TC No 11 haneli sayı olmalı"
    if (form.email && !isEmail(form.email)) e.email = "Geçerli e-posta girin"
    if (form.phone && !isPhoneTR(form.phone)) e.phone = "Telefon 0 olmadan 10 hane olmalı (5xx...)"
    if (form.passportNo && !isPassport(form.passportNo)) e.passportNo = "Pasaport: 1 büyük harf + 8 rakam (9 hane)"

    if (form.groupId) {
      const rem = remainingForGroup(form.groupId)
      const isEditingSameGroup = editing && editing.groupId === form.groupId
      const needed = isEditingSameGroup ? 0 : 1
      if (rem < needed) e.form = "Kontenjan dolu: bu gruba yeni kayıt yapılamaz"
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit() {
    if (!validate()) return
    
    try {
      const normalizedPhone = form.phone ? normalizePhone(form.phone).slice(0, 10) : ""
      const normalizedPassport = form.passportNo ? normalizePassport(form.passportNo) : ""
      
      if (editing) {
        const participant: Participant = {
          ...editing,
          ...form,
          phone: normalizedPhone,
          passportNo: normalizedPassport,
        } as Participant
        await updateParticipant(editing.id, participant)
      } else {
        const participant = {
          fullName: form.fullName!,
          phone: normalizedPhone,
          email: form.email || "",
          idNumber: form.idNumber || "",
          passportNo: normalizedPassport,
          passportValidUntil: form.passportValidUntil || "",
          birthDate: form.birthDate || "",
          gender: (form.gender as Participant["gender"]) || "Mr",
          groupId: form.groupId!,
          roomType: (form.roomType as "2" | "3" | "4") || "2",
          dayCount: (form.dayCount as 7 | 10 | 14 | 20) || 7,
          discount: Number(form.discount || 0),
          reference: (form.reference || "").trim(),
        }
        await addParticipant(participant)
      }
      
      setOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving participant:', error)
      setErrors({ form: 'Kaydetme sırasında hata oluştu' })
    }
  }

  function startEdit(p: Participant) {
    setEditing(p)
    // Format dates for HTML date inputs (YYYY-MM-DD)
    const formattedParticipant = {
      ...p,
      birthDate: p.birthDate ? new Date(p.birthDate).toISOString().split('T')[0] : '',
      passportValidUntil: p.passportValidUntil ? new Date(p.passportValidUntil).toISOString().split('T')[0] : '',
    }
    setForm(formattedParticipant)
    setErrors({})
    setOpen(true)
  }

  const filtered = useMemo(() => {
    return participants.filter((p) => {
      const groupOk = filterGroup === "all" ? true : p.groupId === filterGroup
      const s = search.toLowerCase().trim()
      const textOk =
        !s ||
        (p.fullName || "").toLowerCase().includes(s) ||
        (p.phone || "").toLowerCase().includes(s) ||
        (p.email || "").toLowerCase().includes(s) ||
        (p.idNumber || "").toLowerCase().includes(s) ||
        (p.passportNo || "").toLowerCase().includes(s)
      return groupOk && textOk
    })
  }, [participants, filterGroup, search])

  const csvRows = filtered.map((p) => {
    // Güvenli sayı dönüştürme fonksiyonu
    const safeToFixed = (value: any, digits = 2): string => {
      const num = Number(value)
      return (isNaN(num) || !isFinite(num)) ? "0.00" : num.toFixed(digits)
    }
    
    // Tarih formatlama fonksiyonu
    const formatDate = (dateStr: string): string => {
      if (!dateStr) return "-"
      try {
        return new Date(dateStr).toLocaleDateString("tr-TR")
      } catch {
        return dateStr || "-"
      }
    }
    
    const group = groups.find((g) => g.id === p.groupId)
    const assignedRoom = p.roomId ? rooms.find((r) => r.id === p.roomId) : undefined
    const paid = getPaymentSumsByCurrency(payments, p.id) || { USD: 0, TRY: 0, SAR: 0 }
    const fee = getParticipantFee(groups, p) || 0
    const feeTRY = getParticipantFeeTRY(groups, p, rates) || 0
    const balance = getParticipantBalance(groups, payments, p, rates) || 0
    
    // USD ücreti hesapla
    let feeUSD = 0
    if (group?.currency === "USD") {
      feeUSD = fee
    } else if (group?.currency === "TRY" && rates.USDTRY) {
      feeUSD = fee / rates.USDTRY
    } else if (group?.currency === "SAR" && rates.USDSAR) {
      feeUSD = fee / rates.USDSAR
    }
    
    return {
      "Ad Soyad": p.fullName || "-",
      Grup: group?.name || "-",
      Referans: (p.reference || "").trim() || "-",
      Cinsiyet: p.gender === "Mr" ? "Bay" : p.gender === "Mrs" ? "Bayan" : p.gender === "Chd" ? "Çocuk" : p.gender || "-",
      "Oda Tipi": p.roomType ? `${p.roomType}'li` : "-",
      "Atanan Oda": assignedRoom?.name || "-",
      "Gün Sayısı": p.dayCount || "-",
      "İndirim (${group?.currency || 'TRY'})": safeToFixed(p.discount || 0, 0),
      Telefon: p.phone || "-",
      "E-posta": p.email || "-",
      "TC Kimlik No": p.idNumber || "-",
      "Pasaport No": p.passportNo || "-",
      "Doğum Tarihi": formatDate(p.birthDate || ""),
      "Pasaport Geçerlilik": formatDate(p.passportValidUntil || ""),
      "Ücret (USD)": safeToFixed(feeUSD),
      "Ücret (Grup Para)": `${safeToFixed(fee, 0)} ${group?.currency || ""}`,
      "Ücret (TL)": safeToFixed(feeTRY),
      "Ödenen (USD)": safeToFixed(paid.USD),
      "Ödenen (TRY)": safeToFixed(paid.TRY),
      "Ödenen (SAR)": safeToFixed(paid.SAR),
      "Kalan (USD)": group?.currency === "USD" ? safeToFixed(balance) : safeToFixed(balance / (rates.USDTRY || 34)),
      "Kalan (Grup Para)": safeToFixed(balance),
    }
  })

  const selectedGroup = groups.find((g) => g.id === form.groupId)
  const feePreview =
    form.groupId && form.roomType && form.dayCount ? getParticipantFee(groups, { ...(form as any), id: "" }) : 0
  const feePreviewTRY =
    form.groupId && form.roomType && form.dayCount
      ? (getParticipantFeeTRY(groups, { ...(form as any), id: "" } as Participant, rates) || 0)
      : 0

  const roomsForGroup = (gid: string) => rooms.filter((r) => r.groupId === gid)

  // Oda atama fonksiyonları kaldırıldı - Odalama sekmesinde yapılacak

  return (
    <div className="grid gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-medium">Katılımcılar</h2>
            <p className="text-sm text-muted-foreground">
              İndirim tanımlayın ve odaya yerleştirin. Oda yerleşiminde kapasite kısıtı yoktur.
            </p>
          </div>
          {filterGroup !== "all" ? (
            <div className="px-3 py-2 rounded bg-neutral-50 border text-sm">
              Seçili grup kalan kontenjan: {(() => {
                const g = groups.find((gg) => gg.id === filterGroup)
                if (!g) return 0
                const c = participants.filter((p) => p.groupId === filterGroup).length
                return Math.max(g.capacity - c, 0)
              })()}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <ExportButton filename="katilimcilar.xlsx" rows={csvRows} />
          <ExportButton mode="print" title="Katılımcı Listesi" rows={csvRows} />
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o)
              if (!o) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Yeni Katılımcı
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Katılımcı Düzenle" : "Yeni Katılımcı"}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3 py-2">
                <div className="grid gap-2">
                  <Label>Grup</Label>
                  <Select
                    value={(form.groupId as string) || ""}
                    onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Grup seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {useAppStore.getState().groups.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Önce grup ekleyin</div>
                      ) : null}
                      {useAppStore.getState().groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.groupId ? <p className="text-xs text-red-600">{errors.groupId}</p> : null}
                  {form.groupId ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5" aria-hidden="true" />
                      Kalan kontenjan: {(() => {
                        const g = groups.find((gg) => gg.id === form.groupId)
                        if (!g) return 0
                        const c = participants.filter((p) => p.groupId === form.groupId).length
                        return Math.max(g.capacity - c, 0)
                      })()}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Oda Tipi</Label>
                    <Select
                      value={(form.roomType as string) || "2"}
                      onValueChange={(v) => setForm((f) => ({ ...f, roomType: v as "2" | "3" | "4" }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Oda tipi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2'li</SelectItem>
                        <SelectItem value="3">3'lü</SelectItem>
                        <SelectItem value="4">4'lü</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.roomType ? <p className="text-xs text-red-600">{errors.roomType}</p> : null}
                  </div>
                  <div className="grid gap-2">
                    <Label>Gün</Label>
                    <Select
                      value={String(form.dayCount || 7)}
                      onValueChange={(v) => setForm((f) => ({ ...f, dayCount: Number(v) as 7 | 10 | 14 | 20 }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Gün sayısı" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="14">14</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.dayCount ? <p className="text-xs text-red-600">{errors.dayCount}</p> : null}
                  </div>
                  <div className="grid gap-2">
                    <Label>Cinsiyet</Label>
                    <Select
                      value={(form.gender as string) || "Mr"}
                      onValueChange={(v) => setForm((f) => ({ ...f, gender: v as Participant["gender"] }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mr">Mr.</SelectItem>
                        <SelectItem value="Mrs">Mrs.</SelectItem>
                        <SelectItem value="Chd">Chd.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedGroup ? (
                  <div className="text-xs text-muted-foreground">
                    Ücret (indirimli): {formatCurrency(feePreview, selectedGroup.currency)} {" (~TL "}
                    {(feePreviewTRY || 0).toFixed(2)}
                    {")"}
                  </div>
                ) : null}

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>İndirim ({selectedGroup?.currency || "Grup Para"})</Label>
                    <Input
                      type="number"
                      min={0}
                      value={String(form.discount ?? 0)}
                      onChange={(e) => setForm((f) => ({ ...f, discount: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Ad Soyad</Label>
                    <Input
                      value={form.fullName || ""}
                      onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    />
                    {errors.fullName ? <p className="text-xs text-red-600">{errors.fullName}</p> : null}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Referans (opsiyonel)</Label>
                  <Input
                    value={form.reference || ""}
                    onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                    placeholder="Örn. Ali Yılmaz"
                  />
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Telefon (0'sız 10 hane)</Label>
                    <Input
                      value={form.phone || ""}
                      onChange={(e) => setForm((f) => ({ ...f, phone: normalizePhone(e.target.value).slice(0, 10) }))}
                      placeholder="5XXXXXXXXX"
                      inputMode="numeric"
                      maxLength={10}
                    />
                    {errors.phone ? <p className="text-xs text-red-600">{errors.phone}</p> : null}
                  </div>
                  <div className="grid gap-2">
                    <Label>E-posta</Label>
                    <Input
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="mail@ornek.com"
                    />
                    {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Doğum Tarihi</Label>
                    <Input
                      type="date"
                      value={form.birthDate || ""}
                      onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Pasaport Geçerlilik</Label>
                    <Input
                      type="date"
                      value={form.passportValidUntil || ""}
                      onChange={(e) => setForm((f) => ({ ...f, passportValidUntil: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>TC Kimlik No</Label>
                    <Input
                      value={form.idNumber || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, idNumber: e.target.value.replace(/\D+/g, "").slice(0, 11) }))
                      }
                      inputMode="numeric"
                      placeholder="11 hane"
                    />
                    {errors.idNumber ? <p className="text-xs text-red-600">{errors.idNumber}</p> : null}
                  </div>
                  <div className="grid gap-2">
                    <Label>Pasaport</Label>
                    <Input
                      value={form.passportNo || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, passportNo: normalizePassport(e.target.value).slice(0, 9) }))
                      }
                      placeholder="A12345678"
                    />
                    {errors.passportNo ? <p className="text-xs text-red-600">{errors.passportNo}</p> : null}
                  </div>
                </div>

                {errors.form ? <p className="text-sm text-red-700">{errors.form}</p> : null}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false)
                    resetForm()
                  }}
                >
                  İptal
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit}>
                  {editing ? "Güncelle" : "Kaydet"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" aria-hidden="true" />
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Grup filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Gruplar</SelectItem>
                  {useAppStore.getState().groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Input
                placeholder="Ara: ad, telefon, e-posta, TC, pasaport"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left p-2 font-medium">Ad Soyad</th>
                  <th className="text-left p-2 font-medium">Grup</th>
                  <th className="text-left p-2 font-medium">Referans</th>
                  <th className="text-left p-2 font-medium">Tip / Oda</th>
                  <th className="text-left p-2 font-medium">Gün</th>
                  <th className="text-left p-2 font-medium">Telefon</th>
                  <th className="text-left p-2 font-medium">Ücret (USD)</th>
                  <th className="text-left p-2 font-medium">Ödenen (USD)</th>
                  <th className="text-left p-2 font-medium">Kalan (USD)</th>
                  <th className="text-right p-2 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {paymentsLoading ? (
                  <tr>
                    <td className="p-8 text-center" colSpan={10}>
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        <span>Yükleniyor...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {filtered.map((p) => {
                      // Güvenli sayı dönüştürme fonksiyonu
                      const safeToFixed = (value: any, digits = 2): string => {
                        const num = Number(value)
                        return (isNaN(num) || !isFinite(num)) ? "0.00" : num.toFixed(digits)
                      }
                      
                      const group = groups.find((g) => g.id === p.groupId)
                      const paymentSums = getPaymentSumsByCurrency(payments, p.id) || { USD: 0, TRY: 0, SAR: 0 }
                      const balance = getParticipantBalance(groups, payments, p, rates) || 0
                      const feeRaw = getParticipantFee(groups, p) || 0
                      const feeTRY = getParticipantFeeTRY(groups, p, rates) || 0
                      const assignedRoom = p.roomId ? rooms.find((r) => r.id === p.roomId) : undefined
                      const pays = payments.filter((pp) => pp.participantId === p.id)
                      const paidUSDOrig = pays
                        .filter((pp) => pp.currency === "USD")
                        .reduce((s, pp) => s + (pp.amount || 0), 0)
                      const paidTRYOrig = pays
                        .filter((pp) => pp.currency === "TRY")
                        .reduce((s, pp) => s + (pp.amount || 0), 0)
                      return (
                        <tr key={p.id} className="border-t">
                          <td className="p-2">
                            <div className="font-medium">{p.fullName}</div>
                            <div className="text-xs text-muted-foreground">{p.email || p.phone || ""}</div>
                          </td>
                          <td className="p-2">{group?.name || "-"}</td>
                          <td className="p-2">{(p.reference || "").trim() || "-"}</td>
                          <td className="p-2">
                            <div>{p.roomType ? `${p.roomType}'li` : "-"}</div>
                            <div className="text-xs text-muted-foreground">{assignedRoom ? assignedRoom.name : "-"}</div>
                          </td>
                          <td className="p-2">{p.dayCount}</td>
                          <td className="p-2">{p.phone || "-"}</td>
                          <td className="p-2">
                            <div className="font-medium">
                              ${group?.currency === "USD" 
                                ? safeToFixed(feeRaw) 
                                : rates.USDTRY 
                                  ? safeToFixed(feeRaw / rates.USDTRY) 
                                  : "0.00"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(feeRaw, group?.currency || "TRY")}
                              {group?.currency !== "TRY" && (
                                <span className="ml-2">(~{formatCurrency(feeTRY, "TRY")})</span>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="font-medium">
                              ${safeToFixed(paymentSums.USD)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {group?.currency === "USD" && paymentSums.TRY > 0 && (
                                <span>+ {formatCurrency(paymentSums.TRY, "TRY")}</span>
                              )}
                              {group?.currency === "TRY" && paymentSums.USD > 0 && (
                                <span>+ {formatCurrency(paymentSums.TRY, "TRY")}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="font-medium">
                              ${group?.currency === "USD" 
                                ? safeToFixed(balance) 
                                : rates.USDTRY 
                                  ? safeToFixed(balance / rates.USDTRY) 
                                  : "0.00"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(balance, group?.currency || "TRY")}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-2 justify-end">
                              {/* Odalama butonu kaldırıldı - sadece Odalama sekmesinde */}
                              <Button variant="outline" size="icon" onClick={() => startEdit(p)} aria-label="Düzenle">
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={async () => {
                                  if (confirm(`${p.fullName} katılımcısını silmek istediğinize emin misiniz?`)) {
                                    try {
                                      await deleteParticipant(p.id)
                                    } catch (error) {
                                      console.error('Error deleting participant:', error)
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
                    {!paymentsLoading && filtered.length === 0 ? (
                      <tr>
                        <td className="p-3 text-center text-muted-foreground" colSpan={10}>
                          Sonuç yok.
                        </td>
                      </tr>
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Oda atama dialou kaldırıldı - Odalama sekmesinde drag & drop ile yapılacak */}
    </div>
  )
}


