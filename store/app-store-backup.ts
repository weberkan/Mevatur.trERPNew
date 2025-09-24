"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

// Fees per duration (7/10/14/20) and room type
export type FeeSet = { room2: number; room3: number; room4: number }
export type FeesByDuration = {
  d7: FeeSet
  d10: FeeSet
  d14: FeeSet
  d20: FeeSet
}

export type Group = {
  id: string
  name: string
  type: "Hac" | "Umre" | "Gezi"
  startDate: string
  endDate?: string
  capacity: number
  feesByDuration: FeesByDuration
  currency: "TRY" | "USD" | "SAR"
  notes?: string
}

export type Room = {
  id: string
  groupId: string
  name: string // e.g. 201-A
  type: "2" | "3" | "4" | "5"
}

export type Participant = {
  id: string
  fullName: string
  phone: string
  email: string
  idNumber: string
  passportNo: string
  passportValidUntil?: string
  birthDate?: string
  gender?: "Mr" | "Mrs" | "Chd"
  groupId: string
  roomType: "2" | "3" | "4"
  dayCount: 7 | 10 | 14 | 20
  discount?: number // in group's currency
  roomId?: string
  reference?: string // NEW
}

export type Payment = {
  id: string
  participantId: string
  date: string
  amount: number // original entered
  currency: "TRY" | "USD" | "SAR"
  amountTRY: number // normalized
  method: "Nakit" | "Kart" | "Havale" | "Diğer"
  notes?: string
}

export type Expense = {
  id: string
  date: string
  amount: number // original entered
  currency: "TRY" | "USD" | "SAR"
  amountTRY: number // normalized to TL
  category: "Uçak" | "Otel" | "Transfer" | "Rehberlik" | "Vize" | "Diğer"
  description?: string
  groupId?: string
}

export type CompanyEntry = {
  id: string
  date: string
  type: "Gelir" | "Gider"
  // Manual entries: both original and normalized
  currency: "TRY" | "USD" | "SAR"
  amount: number // original in currency
  amountTRY: number // normalized TL
  category: string
  description?: string
  // Derived entries will have currency: "TRY" and amount == amountTRY
  readonly?: boolean
}

type AppState = {
  groups: Group[]
  rooms: Room[]
  participants: Participant[]
  payments: Payment[]
  expenses: Expense[]
  companyEntries: CompanyEntry[]

  addGroup: (g: Group) => void
  updateGroup: (id: string, g: Group) => void
  deleteGroup: (id: string) => void

  addRoom: (r: Room) => void
  updateRoom: (id: string, r: Room) => void
  deleteRoom: (id: string) => void

  addParticipant: (p: Participant) => void
  updateParticipant: (id: string, p: Participant) => void
  deleteParticipant: (id: string) => void
  assignParticipantRoom: (participantId: string, roomId: string | null) => void

  addPayment: (pay: Payment) => void
  updatePayment: (id: string, pay: Payment) => void
  deletePayment: (id: string) => void

  addExpense: (e: Expense) => void
  updateExpense: (id: string, e: Expense) => void
  deleteExpense: (id: string) => void

  addCompanyEntry: (e: CompanyEntry) => void
  updateCompanyEntry: (id: string, e: CompanyEntry) => void
  deleteCompanyEntry: (id: string) => void
}

function makeFeeSetFromSingle(fee: number): FeeSet {
  return { room2: fee ?? 0, room3: fee ?? 0, room4: fee ?? 0 }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      groups: [],
      rooms: [],
      participants: [],
      payments: [],
      expenses: [],
      companyEntries: [],

      addGroup: (g) => set((s) => ({ groups: [g, ...s.groups] })),
      updateGroup: (id, g) => set((s) => ({ groups: s.groups.map((x) => (x.id === id ? g : x)) })),
      deleteGroup: (id) =>
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== id),
          participants: s.participants
            .filter((p) => p.groupId !== id)
            .map((p) => (p.groupId === id ? { ...p, roomId: undefined } : p)),
          payments: s.payments.filter((pay) => {
            const linked = s.participants.find((p) => p.id === pay.participantId)
            return linked ? linked.groupId !== id : true
          }),
          expenses: s.expenses.filter((e) => e.groupId !== id),
          rooms: s.rooms.filter((r) => r.groupId !== id),
        })),

      addRoom: (r) => set((s) => ({ rooms: [r, ...s.rooms] })),
      updateRoom: (id, r) => set((s) => ({ rooms: s.rooms.map((x) => (x.id === id ? r : x)) })),
      deleteRoom: (id) =>
        set((s) => ({
          rooms: s.rooms.filter((r) => r.id !== id),
          participants: s.participants.map((p) => (p.roomId === id ? { ...p, roomId: undefined } : p)),
        })),

      addParticipant: (p) => set((s) => ({ participants: [p, ...s.participants] })),
      updateParticipant: (id, p) => set((s) => ({ participants: s.participants.map((x) => (x.id === id ? p : x)) })),
      deleteParticipant: (id) =>
        set((s) => ({
          participants: s.participants.filter((p) => p.id !== id),
          payments: s.payments.filter((pay) => pay.participantId !== id),
        })),
      assignParticipantRoom: (participantId, roomId) =>
        set((s) => ({
          participants: s.participants.map((p) => (p.id === participantId ? { ...p, roomId: roomId || undefined } : p)),
        })),

      addPayment: (pay) => set((s) => ({ payments: [pay, ...s.payments] })),
      updatePayment: (id, pay) => set((s) => ({ payments: s.payments.map((x) => (x.id === id ? pay : x)) })),
      deletePayment: (id) => set((s) => ({ payments: s.payments.filter((p) => p.id !== id) })),

      addExpense: (e) => set((s) => ({ expenses: [e, ...s.expenses] })),
      updateExpense: (id, e) => set((s) => ({ expenses: s.expenses.map((x) => (x.id === id ? e : x)) })),
      deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      addCompanyEntry: (e) => set((s) => ({ companyEntries: [e, ...s.companyEntries] })),
      updateCompanyEntry: (id, e) =>
        set((s) => ({ companyEntries: s.companyEntries.map((x) => (x.id === id ? e : x)) })),
      deleteCompanyEntry: (id) => set((s) => ({ companyEntries: s.companyEntries.filter((e) => e.id !== id) })),
    }),
    {
      name: "simple-erp-store",
      version: 8,
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted
        // v<=3 -> modern group/participant/payments
        if (version <= 3) {
          const groups = Array.isArray(persisted.groups)
            ? persisted.groups.map((g: any) => {
                const currency = g.currency ?? "TRY"
                const baseFeeSet = g.fees
                  ? {
                      room2: g.fees.room2 ?? g.fee ?? 0,
                      room3: g.fees.room3 ?? g.fee ?? 0,
                      room4: g.fees.room4 ?? g.fee ?? 0,
                    }
                  : { room2: g.fee ?? 0, room3: g.fee ?? 0, room4: g.fee ?? 0 }
                const fbd: FeesByDuration = { d7: baseFeeSet, d10: baseFeeSet, d14: baseFeeSet, d20: baseFeeSet }
                return {
                  id: g.id,
                  name: g.name,
                  type: g.type,
                  startDate: g.startDate,
                  endDate: g.endDate,
                  capacity: g.capacity ?? 0,
                  feesByDuration: fbd,
                  currency,
                  notes: g.notes,
                } as Group
              })
            : []
          const participants = Array.isArray(persisted.participants)
            ? persisted.participants.map((p: any) => ({
                ...p,
                roomType: p.roomType ?? "2",
                dayCount: p.dayCount ?? 7,
                gender: p.gender ?? "Mr",
              }))
            : []
          const payments = Array.isArray(persisted.payments)
            ? persisted.payments.map((pay: any) => ({
                id: pay.id,
                participantId: pay.participantId,
                date: pay.date,
                amount: pay.amount ?? 0,
                currency: pay.currency ?? "TRY",
                amountTRY: pay.amountTRY ?? pay.amount ?? 0,
                method: pay.method ?? "Nakit",
                notes: pay.notes,
              }))
            : []
          return { ...persisted, groups, participants, payments }
        }
        // v4 -> v5 handled previously; keep passthrough values
        if (version === 4) {
          const groups = Array.isArray(persisted.groups)
            ? persisted.groups.map((g: any) => {
                if (g.feesByDuration) return g
                const base = g.fees ? g.fees : makeFeeSetFromSingle(g.fee ?? 0)
                const fbd: FeesByDuration = { d7: base, d10: base, d14: base, d20: base }
                return { ...g, feesByDuration: fbd }
              })
            : []
          const participants = Array.isArray(persisted.participants)
            ? persisted.participants.map((p: any) => ({ dayCount: p.dayCount ?? 7, gender: p.gender ?? "Mr", ...p }))
            : []
          return { ...persisted, groups, participants }
        }
        // v5/6/7 -> v8: add companyEntries currency fields and rooms up to date
        if (version === 5 || version === 6 || version === 7) {
          const rooms = Array.isArray(persisted.rooms)
            ? persisted.rooms.map((r: any) => ({
                id: r.id,
                groupId: r.groupId,
                name: r.name,
                type: (r.type || "3") as "2" | "3" | "4" | "5",
              }))
            : []
          const companyEntries = Array.isArray(persisted.companyEntries)
            ? persisted.companyEntries.map((e: any) => ({
                id: e.id,
                date: e.date,
                type: e.type,
                currency: e.currency ?? "TRY",
                amount: e.amount ?? e.amountTRY ?? 0,
                amountTRY: e.amountTRY ?? e.amount ?? 0,
                category: e.category ?? "Diğer",
                description: e.description ?? "",
                readonly: e.readonly ?? false,
              }))
            : []
          return { ...persisted, rooms, companyEntries }
        }
        return persisted
      },
    },
  ),
)
