import { Participant } from '@/store/app-store'

const API_BASE = '/api'

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || 'API request failed')
  }
  return response.json()
}

// Fetch all participants
export async function fetchParticipants(): Promise<Participant[]> {
  try {
    const response = await fetch(`${API_BASE}/participants`)
    const data = await handleResponse(response)
    return data.participants || []
  } catch (error) {
    console.error('Error fetching participants:', error)
    throw error
  }
}

// Create new participant
export async function createParticipant(participantData: Omit<Participant, 'id'>): Promise<Participant> {
  try {
    const response = await fetch(`${API_BASE}/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(participantData),
    })
    const data = await handleResponse(response)
    return data.participant
  } catch (error) {
    console.error('Error creating participant:', error)
    throw error
  }
}

// Update existing participant
export async function updateParticipant(id: string, participantData: Partial<Participant>): Promise<Participant> {
  try {
    const response = await fetch(`${API_BASE}/participants`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...participantData }),
    })
    const data = await handleResponse(response)
    return data.participant
  } catch (error) {
    console.error('Error updating participant:', error)
    throw error
  }
}

// Delete participant
export async function deleteParticipant(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/participants?id=${id}`, {
      method: 'DELETE',
    })
    await handleResponse(response)
  } catch (error) {
    console.error('Error deleting participant:', error)
    throw error
  }
}