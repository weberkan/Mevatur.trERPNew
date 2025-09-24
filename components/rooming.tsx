"use client"

import { useMemo, useState, useEffect } from "react"
import { useAppStore, type Room } from "@/store/app-store"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BedDouble, Check, Pencil, Plus, X, FileText, Printer, Loader2, Trash2 } from "lucide-react"
import { exportToWord, exportToHTML, type RoomingExportData } from "@/lib/export-rooming"
import { fetchRooms, createRoom, updateRoom as apiUpdateRoom, deleteRoom as apiDeleteRoom } from "@/lib/api-rooms"

function RoomCard(props: {
  room: Room
  occupants: { id: string; fullName: string; roomType?: string }[]
  onDropParticipant: (participantId: string) => Promise<void>
  onUnassign: (participantId: string) => Promise<void>
  onEdit: (r: Room) => void
}) {
  const { room, occupants, onDropParticipant, onUnassign, onEdit } = props
  return (
    <div
      className="border rounded-md bg-white"
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
      }}
      onDrop={async (e) => {
        e.preventDefault()
        const pid = e.dataTransfer.getData("text/plain")
        console.log('Dropped participant ID to room:', pid, room.name)
        if (pid) {
          try {
            await onDropParticipant(pid)
            console.log('Successfully assigned participant to room')
          } catch (error) {
            console.error('Error assigning participant to room:', error)
          }
        }
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b bg-neutral-50">
        <div className="flex items-center gap-2">
          <BedDouble className="h-4 w-4 text-neutral-600" aria-hidden="true" />
          <div className="font-medium">{room.name}</div>
          <div className="text-xs text-muted-foreground">{`${room.type}'li`}</div>
        </div>
        <div className="text-xs text-muted-foreground">{occupants.length} kişi</div>
      </div>
      <div className="p-2 grid gap-2 min-h-[88px]">
        {occupants.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded border px-2 py-1 bg-white">
            <div
              draggable={true}
              onDragStart={(e) => {
                console.log('Drag started for room occupant:', p.fullName, p.id)
                e.dataTransfer.setData("text/plain", p.id)
                e.dataTransfer.effectAllowed = "move"
              }}
              className="cursor-grab active:cursor-grabbing truncate"
              title="Taşı"
            >
              {p.fullName}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{p.roomType ? `${p.roomType}'li` : "-"}</span>
              <button
                className="text-xs text-red-600 hover:underline"
                onClick={async () => await onUnassign(p.id)}
                aria-label="Atamayı kaldır"
                title="Atamayı kaldır"
              >
                Kaldır
              </button>
            </div>
          </div>
        ))}
        {occupants.length === 0 ? (
          <div className="text-xs text-muted-foreground">Bu odaya sürükleyip bırakın</div>
        ) : null}
      </div>
      <div className="px-3 py-2 border-t">
        <Button variant="outline" size="sm" onClick={() => onEdit(room)}>
          <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
          Düzenle
        </Button>
      </div>
    </div>
  )
}

export default function RoomingModule() {
  const groups = useAppStore((s) => s.groups)
  const participants = useAppStore((s) => s.participants)
  const assignParticipantRoom = useAppStore((s) => s.assignParticipantRoom)
  
  // Local state for rooms data from API
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Load rooms and other data on component mount
  useEffect(() => {
    loadRooms()
    // Groups ve participants'ları da yükle
    useAppStore.getState().loadGroups()
    useAppStore.getState().loadParticipants()
  }, [])
  
  const loadRooms = async () => {
    try {
      setLoading(true)
      const data = await fetchRooms()
      setRooms(data)
    } catch (error) {
      console.error('Failed to load rooms:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const [groupId, setGroupId] = useState<string>("")
  
  // Set initial group when groups are loaded
  useEffect(() => {
    if (groups.length > 0 && !groupId) {
      setGroupId(groups[0].id)
    }
  }, [groups, groupId])
  const [newRoom, setNewRoom] = useState<Partial<Room>>({ name: "", type: "3" })
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<Partial<Room>>({})

  const groupRooms = useMemo(() => rooms.filter((r) => r.groupId === groupId), [rooms, groupId])
  const groupParticipants = useMemo(() => participants.filter((p) => p.groupId === groupId), [participants, groupId])
  const unassigned = useMemo(() => groupParticipants.filter((p) => !p.roomId), [groupParticipants])

  // Export fonksiyonları
  const exportData: RoomingExportData = useMemo(() => {
    const selectedGroup = groups.find(g => g.id === groupId)
    return {
      groupName: selectedGroup?.name || "Seçili Grup",
      rooms: groupRooms.map(room => ({
        name: room.name,
        type: room.type,
        occupants: groupParticipants
          .filter(p => p.roomId === room.id)
          .map(p => ({ fullName: p.fullName, roomType: p.roomType }))
      })),
      unassigned: unassigned.map(p => ({ fullName: p.fullName, roomType: p.roomType }))
    }
  }, [groupId, groups, groupRooms, groupParticipants, unassigned])

  const handleExportWord = async () => {
    try {
      await exportToWord(exportData)
    } catch (error) {
      console.error('Word export hatası:', error)
      alert('Word dosyası oluşturulurken hata oluştu.')
    }
  }



  const handleExportHTML = () => {
    try {
      exportToHTML(exportData)
    } catch (error) {
      console.error('HTML export hatası:', error)
      alert('HTML dosyası oluşturulurken hata oluştu.')
    }
  }

  async function dropToUnassigned(pid: string) {
    try {
      await assignParticipantRoom(pid, null)
    } catch (error) {
      console.error('Failed to unassign room:', error)
    }
  }

  function startEditRoom(r: Room) {
    setEditingRoomId(r.id)
    setEditingDraft({ ...r })
  }

  async function saveRoomEdit() {
    if (!editingRoomId || submitting) return
    const original = rooms.find((r) => r.id === editingRoomId)
    if (!original) return
    const name = (editingDraft.name || "").trim()
    const type = (editingDraft.type as Room["type"]) || original.type
    if (!name) return
    
    try {
      setSubmitting(true)
      const updatedRoom = await apiUpdateRoom(original.id, {
        groupId: original.groupId,
        name,
        type
      })
      
      setRooms(prev => prev.map(r => r.id === editingRoomId ? updatedRoom : r))
      setEditingRoomId(null)
      setEditingDraft({})
    } catch (error) {
      console.error('Failed to update room:', error)
      alert('Oda güncellenirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteRoom() {
    if (!editingRoomId || submitting) return
    const original = rooms.find((r) => r.id === editingRoomId)
    if (!original) return
    
    // Odada katılımcı var mı kontrol et
    const roomOccupants = groupParticipants.filter(p => p.roomId === original.id)
    if (roomOccupants.length > 0) {
      alert(`Bu odada ${roomOccupants.length} katılımcı bulunuyor. Önce katılımcıları başka odalara taşıyın veya atamalarını kaldırın.`)
      return
    }
    
    if (!confirm(`"${original.name}" odasını silmek istediğinize emin misiniz?`)) {
      return
    }
    
    try {
      setSubmitting(true)
      await apiDeleteRoom(original.id)
      setRooms(prev => prev.filter(r => r.id !== editingRoomId))
      setEditingRoomId(null)
      setEditingDraft({})
    } catch (error) {
      console.error('Failed to delete room:', error)
      alert('Oda silinirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Odalama</h2>
          <p className="text-sm text-muted-foreground">
            Katılımcıları sürükle-bırak ile odalara yerleştirin. Odaları burada düzenleyebilirsiniz.
          </p>
        </div>
        
        {/* Export Butonları */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportWord}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
          >
            <FileText className="h-4 w-4 mr-2" />
            Word
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportHTML}
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            <Printer className="h-4 w-4 mr-2" />
            Yazdır
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 md:p-4 grid gap-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Grup</Label>
              <Select value={groupId || ""} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Grup seçin" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Yeni Oda</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Oda adı / no — örn. 301-A"
                  value={newRoom.name || ""}
                  onChange={(e) => setNewRoom((r) => ({ ...r, name: e.target.value }))}
                />
                <Select
                  value={(newRoom.type as string) || "3"}
                  onValueChange={(v) => setNewRoom((r) => ({ ...r, type: v as Room["type"] }))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Tip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2'li</SelectItem>
                    <SelectItem value="3">3'lü</SelectItem>
                    <SelectItem value="4">4'lü</SelectItem>
                    <SelectItem value="5">5'li</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={async () => {
                    if (!groupId || !newRoom.name?.trim() || submitting) return
                    
                    try {
                      setSubmitting(true)
                      const roomData = {
                        groupId,
                        name: newRoom.name!.trim(),
                        type: (newRoom.type as Room["type"]) || "3",
                      }
                      
                      const room = await createRoom(roomData)
                      setRooms(prev => [...prev, room])
                      setNewRoom({ name: "", type: "3" })
                    } catch (error) {
                      console.error('Failed to create room:', error)
                      alert('Oda eklenirken bir hata oluştu')
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Ekle
                </Button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-[320px,1fr] gap-4">
            {/* Unassigned column */}
            <div
              className="border rounded-md bg-white"
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
              }}
              onDrop={async (e) => {
                e.preventDefault()
                const pid = e.dataTransfer.getData("text/plain")
                console.log('Dropped participant ID to unassigned:', pid)
                if (pid) {
                  try {
                    await dropToUnassigned(pid)
                    console.log('Successfully unassigned participant')
                  } catch (error) {
                    console.error('Error unassigning participant:', error)
                  }
                }
              }}
            >
              <div className="px-3 py-2 border-b bg-neutral-50 font-medium">Atanmamış</div>
              <div className="p-2 grid gap-2 min-h-[140px]">
                {unassigned.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded border px-2 py-1 bg-white"
                    draggable={true}
                    onDragStart={(e) => {
                      console.log('Drag started for:', p.fullName, p.id)
                      e.dataTransfer.setData("text/plain", p.id)
                      e.dataTransfer.effectAllowed = "move"
                    }}
                    title="Odaya sürükleyip bırakın"
                  >
                    <div className="truncate">{p.fullName}</div>
                    <span className="text-xs text-muted-foreground">{p.roomType ? `${p.roomType}'li` : "-"}</span>
                  </div>
                ))}
                {unassigned.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Atanmamış katılımcı yok.</div>
                ) : null}
              </div>
            </div>

            {/* Rooms grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full flex items-center justify-center p-8">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : groupRooms.map((r) => {
                const occ = groupParticipants.filter((p) => p.roomId === r.id)
                const isEditing = editingRoomId === r.id
                if (isEditing) {
                  return (
                    <div key={r.id} className="border rounded-md bg-white">
                      <div className="px-3 py-2 border-b bg-neutral-50">
                        <div className="grid grid-cols-[1fr,120px] gap-2">
                          <Input
                            value={editingDraft.name || ""}
                            onChange={(e) => setEditingDraft((d) => ({ ...d, name: e.target.value }))}
                          />
                          <Select
                            value={(editingDraft.type as string) || r.type}
                            onValueChange={(v) => setEditingDraft((d) => ({ ...d, type: v as Room["type"] }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Tip" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2'li</SelectItem>
                              <SelectItem value="3">3'lü</SelectItem>
                              <SelectItem value="4">4'lü</SelectItem>
                              <SelectItem value="5">5'li</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="p-2 grid gap-2 min-h-[88px]">
                        {occ.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between rounded border px-2 py-1 bg-white"
                          >
                            <div className="truncate">{p.fullName}</div>
                            <span className="text-xs text-muted-foreground">
                              {p.roomType ? `${p.roomType}'li` : "-"}
                            </span>
                          </div>
                        ))}
                        {occ.length === 0 ? (
                          <div className="text-xs text-muted-foreground">Bu odaya sürükleyin</div>
                        ) : null}
                      </div>
                      <div className="px-3 py-2 border-t flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={deleteRoom}
                          disabled={submitting}
                        >
                          {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                          <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" /> Sil
                        </Button>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700" 
                            onClick={saveRoomEdit}
                            disabled={submitting}
                          >
                            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                            <Check className="h-4 w-4 mr-1" aria-hidden="true" /> Kaydet
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingRoomId(null)
                              setEditingDraft({})
                            }}
                          >
                            <X className="h-4 w-4 mr-1" aria-hidden="true" /> İptal
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                }
                return (
                  <RoomCard
                    key={r.id}
                    room={r}
                    occupants={occ.map((p) => ({ id: p.id, fullName: p.fullName, roomType: p.roomType }))}
                    onDropParticipant={async (pid) => {
                      try {
                        await assignParticipantRoom(pid, r.id)
                      } catch (error) {
                        console.error('Failed to assign room:', error)
                      }
                    }}
                    onUnassign={async (pid) => {
                      try {
                        await assignParticipantRoom(pid, null)
                      } catch (error) {
                        console.error('Failed to unassign room:', error)
                      }
                    }}
                    onEdit={startEditRoom}
                  />
                )
              })}
              {!loading && groupRooms.length === 0 ? (
                <div className="text-sm text-muted-foreground border rounded-md p-3">
                  Bu gruba ait oda yok. Üstteki alandan yeni oda ekleyin.
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


