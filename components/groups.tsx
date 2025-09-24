"use client"

import { useMemo, useState, useEffect } from "react"
import { useAppStore, type Group, type FeeSet, type FeesByDuration, type Room } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, BedDouble, Check, X } from 'lucide-react'
import ExportButton from "./export-button"
import { formatCurrency, formatDate } from "@/lib/format"
import { useExchangeRates, convertToTRY } from "@/lib/rates"

type DurationKey = "d7" | "d10" | "d14" | "d20"
const durationMap: Record<DurationKey, number> = { d7: 7, d10: 10, d14: 14, d20: 20 }

export default function GroupsModule() {
  const groups = useAppStore((s) => s.groups)
  const loadGroups = useAppStore((s) => s.loadGroups)
  const addGroup = useAppStore((s) => s.addGroup)
  const updateGroup = useAppStore((s) => s.updateGroup)
  const deleteGroup = useAppStore((s) => s.deleteGroup)
  const participants = useAppStore((s) => s.participants)
  const loadParticipants = useAppStore((s) => s.loadParticipants)
  // Rooms artık sadece Odalama sayfasında yönetiliyor
  const loading = useAppStore((s) => s.loading)

  const { rates } = useExchangeRates()

  // Verileri yükle
  useEffect(() => {
    loadGroups().catch(console.error)
    loadParticipants().catch(console.error)
  }, [])

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Group | null>(null)
  const [activeDuration, setActiveDuration] = useState<DurationKey>("d7")

  // Room state'leri kaldırıldı, artık sadece Odalama sayfasında

  const [form, setForm] = useState<Partial<Group>>({
    name: "",
    type: "Umre",
    startDate: "",
    endDate: "",
    capacity: 0,
    currency: "TRY",
    feesByDuration: {
      d7: { room2: 0, room3: 0, room4: 0 },
      d10: { room2: 0, room3: 0, room4: 0 },
      d14: { room2: 0, room3: 0, room4: 0 },
      d20: { room2: 0, room3: 0, room4: 0 },
    },
    notes: "",
  } as Partial<Group>)

  function resetForm() {
    setForm({
      name: "",
      type: "Umre",
      startDate: "",
      endDate: "",
      capacity: 0,
      currency: "TRY",
      feesByDuration: {
        d7: { room2: 0, room3: 0, room4: 0 },
        d10: { room2: 0, room3: 0, room4: 0 },
        d14: { room2: 0, room3: 0, room4: 0 },
        d20: { room2: 0, room3: 0, room4: 0 },
      },
      notes: "",
    } as Partial<Group>)
    setEditing(null)
    setActiveDuration("d7")
  }

  function updateFee(field: keyof FeeSet, value: number) {
    setForm((f) => {
      const current = (f.feesByDuration as FeesByDuration)[activeDuration]
      return {
        ...f,
        feesByDuration: {
          ...(f.feesByDuration as FeesByDuration),
          [activeDuration]: { ...current, [field]: value },
        },
      }
    })
  }

  async function submit() {
    if (!form.name || !form.type || !form.startDate) return
    
    try {
      if (editing) {
        const payload: Group = {
          id: editing.id,
          name: form.name!,
          type: (form.type as Group["type"]) || "Umre",
          startDate: form.startDate!,
          endDate: form.endDate || "",
          capacity: Number(form.capacity || 0),
          currency: (form.currency as Group["currency"]) || "TRY",
          feesByDuration: form.feesByDuration as FeesByDuration,
          notes: form.notes || "",
        }
        await updateGroup(editing.id, payload)
      } else {
        const payload = {
          name: form.name!,
          type: (form.type as Group["type"]) || "Umre",
          startDate: form.startDate!,
          endDate: form.endDate || "",
          capacity: Number(form.capacity || 0),
          currency: (form.currency as Group["currency"]) || "TRY",
          feesByDuration: form.feesByDuration as FeesByDuration,
          notes: form.notes || "",
        }
        await addGroup(payload)
      }
      setOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving group:', error)
      // Burada bir toast mesajı gösterebiliriz
    }
  }

  function startEdit(g: Group) {
    setEditing(g)
    // Format dates for HTML date inputs (YYYY-MM-DD)
    const formattedGroup = {
      ...g,
      startDate: g.startDate ? new Date(g.startDate).toISOString().split('T')[0] : '',
      endDate: g.endDate ? new Date(g.endDate).toISOString().split('T')[0] : '',
    }
    setForm(formattedGroup)
    setActiveDuration("d7")
    setOpen(true)
  }

  function groupUsage(g: Group) {
    const count = participants.filter((p) => p.groupId === g.id).length
    const remaining = Math.max(g.capacity - count, 0)
    return { count, remaining }
  }

  const csvRows = useMemo(
    () =>
      groups.map((g) => ({
        "Grup Adı": g.name,
        "Tür": g.type,
        "Başlangıç": g.startDate,
        "Bitiş": g.endDate || "",
        "Kontenjan": g.capacity,
        "Para Birimi": g.currency,
        "7g 2'li": g.feesByDuration.d7.room2,
        "7g 3'lü": g.feesByDuration.d7.room3,
        "7g 4'lü": g.feesByDuration.d7.room4,
        "10g 2'li": g.feesByDuration.d10.room2,
        "10g 3'lü": g.feesByDuration.d10.room3,
        "10g 4'lü": g.feesByDuration.d10.room4,
        "14g 2'li": g.feesByDuration.d14.room2,
        "14g 3'lü": g.feesByDuration.d14.room3,
        "14g 4'lü": g.feesByDuration.d14.room4,
        "20g 2'li": g.feesByDuration.d20.room2,
        "20g 3'lü": g.feesByDuration.d20.room3,
        "20g 4'lü": g.feesByDuration.d20.room4,
        "Not": g.notes || "",
      })),
    [groups]
  )

  const fees = (form.feesByDuration as FeesByDuration)[activeDuration]
  // Room fonksiyonları kaldırıldı, artık sadece Odalama sayfasında

  return (
    <div className="grid gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Gruplar / Turlar</h2>
          <p className="text-sm text-muted-foreground">Ücretleri gün bazında girin. Oda yönetimi ile 2/3/4/5 kişilik odalar ekleyin.</p>
        </div>
        <div className="flex gap-2">
          <ExportButton filename="gruplar.xlsx" rows={csvRows} />
          <ExportButton mode="print" title="Gruplar" rows={csvRows} />
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Yeni Grup
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85svh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Grup Düzenle" : "Yeni Grup"}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3 py-2">
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Grup Adı</Label>
                    <Input value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tür</Label>
                    <Select value={(form.type as string) || "Umre"} onValueChange={(v) => setForm((f) => ({ ...f, type: v as Group["type"] }))}>
                      <SelectTrigger><SelectValue placeholder="Tür" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Umre">Umre</SelectItem>
                        <SelectItem value="Hac">Hac</SelectItem>
                        <SelectItem value="Gezi">Gezi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Para Birimi</Label>
                    <Select value={(form.currency as string) || "TRY"} onValueChange={(v) => setForm((f) => ({ ...f, currency: v as Group["currency"] }))}>
                      <SelectTrigger><SelectValue placeholder="Para birimi" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRY">TRY</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="SAR">SAR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Başlangıç</Label>
                    <Input type="date" value={form.startDate || ""} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Bitiş</Label>
                    <Input type="date" value={form.endDate || ""} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Kontenjan</Label>
                  <Input type="number" min={0} value={String(form.capacity ?? 0)} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))} />
                </div>

                <div className="grid gap-2">
                  <Label>Gün</Label>
                  <Select value={activeDuration} onValueChange={(v) => setActiveDuration(v as DurationKey)}>
                    <SelectTrigger><SelectValue placeholder="Gün seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="d7">7 Gün</SelectItem>
                      <SelectItem value="d10">10 Gün</SelectItem>
                      <SelectItem value="d14">14 Gün</SelectItem>
                      <SelectItem value="d20">20 Gün</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded p-3">
                  <div className="font-medium mb-2">{durationMap[activeDuration]} Gün Ücretleri</div>
                  <div className="grid md:grid-cols-3 gap-3">
                    {(["room2", "room3", "room4"] as (keyof FeeSet)[]).map((field) => (
                      <div key={field} className="grid gap-1.5">
                        <Label>{field === "room2" ? "2'li Oda" : field === "room3" ? "3'lü Oda" : "4'lü Oda"}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={String(fees?.[field] ?? 0)}
                          onChange={(e) => updateFee(field, Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">
                          {"~ "}TL{" "}
                          {convertToTRY(Number(fees?.[field] || 0), (form.currency as any) || "TRY", {
                            USDTRY: rates.USDTRY,
                            SARTRY: rates.SARTRY,
                          }).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Diğer günlerin ücretlerini girmek için üstteki gün seçiminden değiştirin.</p>
                </div>

                <div className="grid gap-2">
                  <Label>Not</Label>
                  <Input value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>İptal</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit}>
                  {editing ? "Güncelle" : "Kaydet"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableCaption>Toplam {groups.length} grup</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Başlangıç</TableHead>
                <TableHead>Bitiş</TableHead>
                <TableHead>Doluluk</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading.groups ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Henüz grup eklenmemiş
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((g) => {
                const u = groupUsage(g)
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      <div>{g.name}</div>
                      <div className="text-xs text-muted-foreground">Odalar Odalama sekmesinde</div>
                    </TableCell>
                    <TableCell>{g.type}</TableCell>
                    <TableCell>{formatDate(g.startDate)}</TableCell>
                    <TableCell>{g.endDate ? formatDate(g.endDate) : "-"}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {u.count} / {g.capacity}
                      </span>
                      <div className="text-xs text-muted-foreground">Kalan: {u.remaining}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {/* Odalama butonu kaldırıldı - sadece Odalama sekmesinde */}
                        <Button variant="outline" size="icon" onClick={() => startEdit(g)} aria-label="Düzenle">
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          onClick={async () => {
                            if (confirm(`${g.name} grubunu silmek istediğinize emin misiniz?`)) {
                              try {
                                await deleteGroup(g.id)
                              } catch (error) {
                                console.error('Error deleting group:', error)
                              }
                            }
                          }} 
                          aria-label="Sil"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}


