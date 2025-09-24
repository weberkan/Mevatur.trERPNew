import { Group } from '@/store/app-store'

const API_BASE = '/api'

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || 'API request failed')
  }
  return response.json()
}

// Fetch all groups
export async function fetchGroups(): Promise<Group[]> {
  try {
    const response = await fetch(`${API_BASE}/groups`)
    const data = await handleResponse(response)
    return data.groups || []
  } catch (error) {
    console.error('Error fetching groups:', error)
    throw error
  }
}

// Create new group
export async function createGroup(groupData: Omit<Group, 'id'>): Promise<Group> {
  try {
    const response = await fetch(`${API_BASE}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groupData),
    })
    const data = await handleResponse(response)
    return data.group
  } catch (error) {
    console.error('Error creating group:', error)
    throw error
  }
}

// Update existing group
export async function updateGroup(id: string, groupData: Partial<Group>): Promise<Group> {
  try {
    const response = await fetch(`${API_BASE}/groups`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...groupData }),
    })
    const data = await handleResponse(response)
    return data.group
  } catch (error) {
    console.error('Error updating group:', error)
    throw error
  }
}

// Delete group
export async function deleteGroup(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/groups?id=${id}`, {
      method: 'DELETE',
    })
    await handleResponse(response)
  } catch (error) {
    console.error('Error deleting group:', error)
    throw error
  }
}