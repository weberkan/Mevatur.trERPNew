import { CompanyEntry } from '@/store/app-store'

const API_BASE = '/api'

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || 'API request failed')
  }
  return response.json()
}

// Fetch all company entries
export async function fetchCompanyEntries(): Promise<CompanyEntry[]> {
  try {
    const response = await fetch(`${API_BASE}/company-entries`)
    const data = await handleResponse(response)
    return data.entries || []
  } catch (error) {
    console.error('Error fetching company entries:', error)
    throw error
  }
}

// Create new company entry
export async function createCompanyEntry(entryData: Omit<CompanyEntry, 'id'>): Promise<CompanyEntry> {
  try {
    const response = await fetch(`${API_BASE}/company-entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entryData),
    })
    const data = await handleResponse(response)
    return data.entry
  } catch (error) {
    console.error('Error creating company entry:', error)
    throw error
  }
}

// Update existing company entry
export async function updateCompanyEntry(id: string, entryData: Partial<CompanyEntry>): Promise<CompanyEntry> {
  try {
    const response = await fetch(`${API_BASE}/company-entries`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...entryData }),
    })
    const data = await handleResponse(response)
    return data.entry
  } catch (error) {
    console.error('Error updating company entry:', error)
    throw error
  }
}

// Delete company entry
export async function deleteCompanyEntry(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/company-entries?id=${id}`, {
      method: 'DELETE',
    })
    await handleResponse(response)
  } catch (error) {
    console.error('Error deleting company entry:', error)
    throw error
  }
}