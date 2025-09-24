"use client"

import { create } from "zustand"
import { fetchGroups, createGroup, updateGroup as apiUpdateGroup, deleteGroup as apiDeleteGroup } from "@/lib/api-groups"
import { fetchParticipants, createParticipant, updateParticipant as apiUpdateParticipant, deleteParticipant as apiDeleteParticipant } from "@/lib/api-participants"

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
  // Data state
  groups: Group[]
  rooms: Room[]
  participants: Participant[]
  payments: Payment[]
  expenses: Expense[]
  companyEntries: CompanyEntry[]
  
  // Loading states
  loading: {
    groups: boolean
    rooms: boolean
    participants: boolean
    payments: boolean
    expenses: boolean
    companyEntries: boolean
  }

  // Data loading functions - to be called by components
  loadGroups: () => Promise<void>
  loadParticipants: () => Promise<void>
  
  // Group operations (API-backed)
  addGroup: (g: Omit<Group, 'id'>) => Promise<void>
  updateGroup: (id: string, g: Partial<Group>) => Promise<void>
  deleteGroup: (id: string) => Promise<void>

  // Room operations (in-memory for now, will be API-backed via rooming component)
  addRoom: (r: Room) => void
  updateRoom: (id: string, r: Room) => void
  deleteRoom: (id: string) => void

  // Participant operations (API-backed)
  addParticipant: (p: Omit<Participant, 'id'>) => Promise<void>
  updateParticipant: (id: string, p: Partial<Participant>) => Promise<void>
  deleteParticipant: (id: string) => Promise<void>
  assignParticipantRoom: (participantId: string, roomId: string | null) => Promise<void>

  // Payment/Expense/CompanyEntry operations (handled by individual components)
  // These are kept for backward compatibility but won't be used by new API-based components
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

export const useAppStore = create<AppState>()((set, get) => ({
  // Initial state
  groups: [],
  rooms: [],
  participants: [],
  payments: [],
  expenses: [],
  companyEntries: [],
  
  loading: {
    groups: false,
    rooms: false,
    participants: false,
    payments: false,
    expenses: false,
    companyEntries: false,
  },

  // Data loading functions
  loadGroups: async () => {
    try {
      set((state) => ({ loading: { ...state.loading, groups: true } }))
      const groups = await fetchGroups()
      set({ groups })
    } catch (error) {
      console.error('Failed to load groups:', error)
    } finally {
      set((state) => ({ loading: { ...state.loading, groups: false } }))
    }
  },

  loadParticipants: async () => {
    try {
      set((state) => ({ loading: { ...state.loading, participants: true } }))
      const participants = await fetchParticipants()
      set({ participants })
    } catch (error) {
      console.error('Failed to load participants:', error)
    } finally {
      set((state) => ({ loading: { ...state.loading, participants: false } }))
    }
  },

  // Group operations (API-backed)
  addGroup: async (groupData) => {
    try {
      const newGroup = await createGroup(groupData)
      set((state) => ({ groups: [newGroup, ...state.groups] }))
    } catch (error) {
      console.error('Failed to add group:', error)
      throw error
    }
  },

  updateGroup: async (id, groupData) => {
    try {
      const updatedGroup = await apiUpdateGroup(id, groupData)
      set((state) => ({ groups: state.groups.map(g => g.id === id ? updatedGroup : g) }))
    } catch (error) {
      console.error('Failed to update group:', error)
      throw error
    }
  },

  deleteGroup: async (id) => {
    try {
      await apiDeleteGroup(id)
      set((state) => ({
        groups: state.groups.filter(g => g.id !== id),
        // Clean up related data
        participants: state.participants.filter(p => p.groupId !== id)
      }))
    } catch (error) {
      console.error('Failed to delete group:', error)
      throw error
    }
  },

  // Participant operations (API-backed)
  addParticipant: async (participantData) => {
    try {
      const newParticipant = await createParticipant(participantData)
      set((state) => ({ participants: [newParticipant, ...state.participants] }))
    } catch (error) {
      console.error('Failed to add participant:', error)
      throw error
    }
  },

  updateParticipant: async (id, participantData) => {
    try {
      const state = get()
      const existingParticipant = state.participants.find(p => p.id === id)
      if (!existingParticipant) {
        throw new Error('Participant not found')
      }
      
      // Ensure required fields are always included
      const updateData = {
        fullName: existingParticipant.fullName,
        groupId: existingParticipant.groupId,
        ...participantData
      }
      
      const updatedParticipant = await apiUpdateParticipant(id, updateData)
      set((state) => ({ participants: state.participants.map(p => p.id === id ? updatedParticipant : p) }))
    } catch (error) {
      console.error('Failed to update participant:', error)
      throw error
    }
  },

  deleteParticipant: async (id) => {
    try {
      await apiDeleteParticipant(id)
      set((state) => ({
        participants: state.participants.filter(p => p.id !== id)
      }))
    } catch (error) {
      console.error('Failed to delete participant:', error)
      throw error
    }
  },

  assignParticipantRoom: async (participantId, roomId) => {
    try {
      const state = get()
      const participant = state.participants.find(p => p.id === participantId)
      if (!participant) return
      
      await apiUpdateParticipant(participantId, {
        fullName: participant.fullName,
        groupId: participant.groupId,
        roomId: roomId || undefined
      })
      
      set((state) => ({
        participants: state.participants.map(p => 
          p.id === participantId ? { ...p, roomId: roomId || undefined } : p
        )
      }))
    } catch (error) {
      console.error('Failed to assign room:', error)
      // Rollback is not needed since we update state after API success
    }
  },

  // Room operations (in-memory for backward compatibility)
  addRoom: (r) => set((state) => ({ rooms: [r, ...state.rooms] })),
  updateRoom: (id, r) => set((state) => ({ rooms: state.rooms.map(x => x.id === id ? r : x) })),
  deleteRoom: (id) => set((state) => ({
    rooms: state.rooms.filter(r => r.id !== id),
    participants: state.participants.map(p => p.roomId === id ? { ...p, roomId: undefined } : p)
  })),

  // Legacy operations (for backward compatibility)
  addPayment: (pay) => set((state) => ({ payments: [pay, ...state.payments] })),
  updatePayment: (id, pay) => set((state) => ({ payments: state.payments.map(x => x.id === id ? pay : x) })),
  deletePayment: (id) => set((state) => ({ payments: state.payments.filter(p => p.id !== id) })),

  addExpense: (e) => set((state) => ({ expenses: [e, ...state.expenses] })),
  updateExpense: (id, e) => set((state) => ({ expenses: state.expenses.map(x => x.id === id ? e : x) })),
  deleteExpense: (id) => set((state) => ({ expenses: state.expenses.filter(e => e.id !== id) })),

  addCompanyEntry: (e) => set((state) => ({ companyEntries: [e, ...state.companyEntries] })),
  updateCompanyEntry: (id, e) => set((state) => ({ companyEntries: state.companyEntries.map(x => x.id === id ? e : x) })),
  deleteCompanyEntry: (id) => set((state) => ({ companyEntries: state.companyEntries.filter(e => e.id !== id) })),
}))