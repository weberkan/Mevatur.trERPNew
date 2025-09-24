import { Expense } from '@/store/app-store'

const API_BASE = '/api'

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || 'API request failed')
  }
  return response.json()
}

// Fetch all expenses
export async function fetchExpenses(): Promise<Expense[]> {
  try {
    const response = await fetch(`${API_BASE}/expenses`)
    const data = await handleResponse(response)
    return data.expenses || []
  } catch (error) {
    console.error('Error fetching expenses:', error)
    throw error
  }
}

// Create new expense
export async function createExpense(expenseData: Omit<Expense, 'id'>): Promise<Expense> {
  try {
    const response = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData),
    })
    const data = await handleResponse(response)
    return data.expense
  } catch (error) {
    console.error('Error creating expense:', error)
    throw error
  }
}

// Update existing expense
export async function updateExpense(id: string, expenseData: Partial<Expense>): Promise<Expense> {
  try {
    const response = await fetch(`${API_BASE}/expenses`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...expenseData }),
    })
    const data = await handleResponse(response)
    return data.expense
  } catch (error) {
    console.error('Error updating expense:', error)
    throw error
  }
}

// Delete expense
export async function deleteExpense(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/expenses?id=${id}`, {
      method: 'DELETE',
    })
    await handleResponse(response)
  } catch (error) {
    console.error('Error deleting expense:', error)
    throw error
  }
}