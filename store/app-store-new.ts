"use client"

import { create } from "zustand"

// Type definitions (keeping the same as before)
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
  name: string
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
  discount?: number
  roomId?: string
  reference?: string
}

export type Payment = {
  id: string
  participantId: string
  date: string
  amount: number
  currency: "TRY" | "USD" | "SAR"
  amountTRY: number
  method: "Nakit" | "Kart" | "Havale" | "Diğer"
  notes?: string
}

export type Expense = {
  id: string
  date: string
  amount: number
  currency: "TRY" | "USD" | "SAR"
  amountTRY: number
  category: "Uçak" | "Otel" | "Transfer" | "Rehberlik" | "Vize" | "Diğer"
  description?: string
  groupId?: string
}

export type CompanyEntry = {
  id: string
  date: string
  type: "Gelir" | "Gider"
  currency: "TRY" | "USD" | "SAR"
  amount: number
  amountTRY: number
  category: string
  description?: string
  readonly?: boolean
}

// API helper functions
const api = {
  async fetchGroups(): Promise<Group[]> {
    const response = await fetch('/api/groups')
    const data = await response.json()
    if (data.success) return data.groups
    throw new Error(data.error || 'Failed to fetch groups')
  },

  async createGroup(group: Omit<Group, 'id'>): Promise<Group> {
    const response = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    })
    const data = await response.json()
    if (data.success) return data.group
    throw new Error(data.error || 'Failed to create group')
  },

  async updateGroup(group: Group): Promise<Group> {
    const response = await fetch('/api/groups', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    })
    const data = await response.json()
    if (data.success) return data.group
    throw new Error(data.error || 'Failed to update group')
  },

  async deleteGroup(id: string): Promise<void> {
    const response = await fetch(`/api/groups?id=${id}`, {
      method: 'DELETE',
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.error || 'Failed to delete group')
  },

  async fetchParticipants(): Promise<Participant[]> {
    const response = await fetch('/api/participants')
    const data = await response.json()
    if (data.success) return data.participants
    throw new Error(data.error || 'Failed to fetch participants')
  },

  async createParticipant(participant: Omit<Participant, 'id'>): Promise<Participant> {
    const response = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participant),
    })
    const data = await response.json()
    if (data.success) return data.participant
    throw new Error(data.error || 'Failed to create participant')
  },

  async updateParticipant(participant: Participant): Promise<Participant> {
    const response = await fetch('/api/participants', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participant),
    })
    const data = await response.json()
    if (data.success) return data.participant
    throw new Error(data.error || 'Failed to update participant')
  },

  async deleteParticipant(id: string): Promise<void> {
    const response = await fetch(`/api/participants?id=${id}`, {
      method: 'DELETE',
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.error || 'Failed to delete participant')
  },

  async fetchPayments(): Promise<Payment[]> {
    const response = await fetch('/api/payments')
    const data = await response.json()
    if (data.success) return data.payments
    throw new Error(data.error || 'Failed to fetch payments')
  },

  // Add more API methods for payments, expenses, rooms, etc.
}

type AppState = {
  // Data state
  groups: Group[]
  rooms: Room[]
  participants: Participant[]
  payments: Payment[]
  expenses: Expense[]
  companyEntries: CompanyEntry[]
  
  // Loading state
  loading: {
    groups: boolean
    participants: boolean
    payments: boolean
    expenses: boolean
    rooms: boolean
    companyEntries: boolean
  }

  // Group actions
  loadGroups: () => Promise<void>
  addGroup: (g: Omit<Group, 'id'>) => Promise<void>
  updateGroup: (id: string, g: Group) => Promise<void>
  deleteGroup: (id: string) => Promise<void>

  // Participant actions
  loadParticipants: () => Promise<void>
  addParticipant: (p: Omit<Participant, 'id'>) => Promise<void>
  updateParticipant: (id: string, p: Participant) => Promise<void>
  deleteParticipant: (id: string) => Promise<void>
  assignParticipantRoom: (participantId: string, roomId: string | null) => Promise<void>

  // Payment actions
  loadPayments: () => Promise<void>
  addPayment: (pay: Omit<Payment, 'id'>) => Promise<void>
  updatePayment: (id: string, pay: Payment) => Promise<void>
  deletePayment: (id: string) => Promise<void>

  // Room actions (placeholder - API not implemented yet)
  addRoom: (r: Room) => void
  updateRoom: (id: string, r: Room) => void
  deleteRoom: (id: string) => void

  // Expense actions (placeholder - API not implemented yet)
  addExpense: (e: Expense) => void
  updateExpense: (id: string, e: Expense) => void
  deleteExpense: (id: string) => void

  // Company entry actions (placeholder - API not implemented yet)
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
    participants: false,
    payments: false,
    expenses: false,
    rooms: false,
    companyEntries: false,
  },

  // Group actions
  loadGroups: async () => {
    try {
      set((state) => ({ loading: { ...state.loading, groups: true } }))
      const groups = await api.fetchGroups()
      set({ groups })
    } catch (error) {
      console.error('Error loading groups:', error)
      throw error
    } finally {
      set((state) => ({ loading: { ...state.loading, groups: false } }))
    }
  },

  addGroup: async (groupData) => {
    try {
      const newGroup = await api.createGroup(groupData)
      set((state) => ({ groups: [newGroup, ...state.groups] }))
    } catch (error) {
      console.error('Error adding group:', error)
      throw error
    }
  },

  updateGroup: async (id, groupData) => {
    try {
      const updatedGroup = await api.updateGroup(groupData)
      set((state) => ({
        groups: state.groups.map((g) => (g.id === id ? updatedGroup : g))
      }))
    } catch (error) {
      console.error('Error updating group:', error)
      throw error
    }
  },

  deleteGroup: async (id) => {
    try {
      await api.deleteGroup(id)
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== id),
        participants: state.participants.filter((p) => p.groupId !== id),
        payments: state.payments.filter((pay) => {
          const linked = state.participants.find((p) => p.id === pay.participantId)
          return linked ? linked.groupId !== id : true
        }),
        expenses: state.expenses.filter((e) => e.groupId !== id),
        rooms: state.rooms.filter((r) => r.groupId !== id),
      }))
    } catch (error) {
      console.error('Error deleting group:', error)
      throw error
    }
  },

  // Participant actions
  loadParticipants: async () => {
    try {
      set((state) => ({ loading: { ...state.loading, participants: true } }))
      const participants = await api.fetchParticipants()
      set({ participants })
    } catch (error) {
      console.error('Error loading participants:', error)
      throw error
    } finally {
      set((state) => ({ loading: { ...state.loading, participants: false } }))
    }
  },

  addParticipant: async (participantData) => {
    try {
      const newParticipant = await api.createParticipant(participantData)
      set((state) => ({ participants: [newParticipant, ...state.participants] }))
    } catch (error) {
      console.error('Error adding participant:', error)
      throw error
    }
  },

  updateParticipant: async (id, participantData) => {
    try {
      const updatedParticipant = await api.updateParticipant(participantData)
      set((state) => ({
        participants: state.participants.map((p) => (p.id === id ? updatedParticipant : p))
      }))
    } catch (error) {
      console.error('Error updating participant:', error)
      throw error
    }
  },

  deleteParticipant: async (id) => {
    try {
      await api.deleteParticipant(id)
      set((state) => ({
        participants: state.participants.filter((p) => p.id !== id),
        payments: state.payments.filter((pay) => pay.participantId !== id),
      }))
    } catch (error) {
      console.error('Error deleting participant:', error)
      throw error
    }
  },

  assignParticipantRoom: async (participantId, roomId) => {
    // This will need to be implemented with API call
    set((state) => ({
      participants: state.participants.map((p) => 
        p.id === participantId ? { ...p, roomId: roomId || undefined } : p
      ),
    }))
  },

  // Payment actions
  loadPayments: async () => {
    try {
      set((state) => ({ loading: { ...state.loading, payments: true } }))
      const payments = await api.fetchPayments()
      set({ payments })
    } catch (error) {
      console.error('Error loading payments:', error)
      throw error
    } finally {
      set((state) => ({ loading: { ...state.loading, payments: false } }))
    }
  },

  addPayment: async (paymentData) => {
    // TODO: Implement with API
    const newPayment = { ...paymentData, id: crypto.randomUUID() } as Payment
    set((state) => ({ payments: [newPayment, ...state.payments] }))
  },

  updatePayment: async (id, paymentData) => {
    // TODO: Implement with API
    set((state) => ({ payments: state.payments.map((p) => (p.id === id ? paymentData : p)) }))
  },

  deletePayment: async (id) => {
    // TODO: Implement with API
    set((state) => ({ payments: state.payments.filter((p) => p.id !== id) }))
  },

  // Placeholder actions for rooms, expenses, company entries
  // These will be implemented with API calls later
  addRoom: (r) => set((state) => ({ rooms: [r, ...state.rooms] })),
  updateRoom: (id, r) => set((state) => ({ rooms: state.rooms.map((x) => (x.id === id ? r : x)) })),
  deleteRoom: (id) => set((state) => ({
    rooms: state.rooms.filter((r) => r.id !== id),
    participants: state.participants.map((p) => (p.roomId === id ? { ...p, roomId: undefined } : p)),
  })),

  addExpense: (e) => set((state) => ({ expenses: [e, ...state.expenses] })),
  updateExpense: (id, e) => set((state) => ({ expenses: state.expenses.map((x) => (x.id === id ? e : x)) })),
  deleteExpense: (id) => set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),

  addCompanyEntry: (e) => set((state) => ({ companyEntries: [e, ...state.companyEntries] })),
  updateCompanyEntry: (id, e) => set((state) => ({ companyEntries: state.companyEntries.map((x) => (x.id === id ? e : x)) })),
  deleteCompanyEntry: (id) => set((state) => ({ companyEntries: state.companyEntries.filter((e) => e.id !== id) })),
}))