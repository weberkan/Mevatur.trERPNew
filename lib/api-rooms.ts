import { Room } from '@/store/app-store'

const API_BASE = '/api'

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || 'API request failed')
  }
  return response.json()
}

// Fetch all rooms
export async function fetchRooms(): Promise<Room[]> {
  try {
    const response = await fetch(`${API_BASE}/rooms`)
    const data = await handleResponse(response)
    return data.rooms || []
  } catch (error) {
    console.error('Error fetching rooms:', error)
    throw error
  }
}

// Create new room
export async function createRoom(roomData: Omit<Room, 'id'>): Promise<Room> {
  try {
    const response = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roomData),
    })
    const data = await handleResponse(response)
    return data.room
  } catch (error) {
    console.error('Error creating room:', error)
    throw error
  }
}

// Update existing room
export async function updateRoom(id: string, roomData: Partial<Room>): Promise<Room> {
  try {
    const response = await fetch(`${API_BASE}/rooms`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...roomData }),
    })
    const data = await handleResponse(response)
    return data.room
  } catch (error) {
    console.error('Error updating room:', error)
    throw error
  }
}

// Delete room
export async function deleteRoom(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/rooms?id=${id}`, {
      method: 'DELETE',
    })
    await handleResponse(response)
  } catch (error) {
    console.error('Error deleting room:', error)
    throw error
  }
}