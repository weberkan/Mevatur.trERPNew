import { Payment } from '@/store/app-store'

const API_BASE = '/api'

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || 'API request failed')
  }
  return response.json()
}

// Fetch all payments
export async function fetchPayments(): Promise<Payment[]> {
  try {
    const response = await fetch(`${API_BASE}/payments`)
    const data = await handleResponse(response)
    return data.payments || []
  } catch (error) {
    console.error('Error fetching payments:', error)
    throw error
  }
}

// Create new payment
export async function createPayment(paymentData: Omit<Payment, 'id'>): Promise<Payment> {
  try {
    const response = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    })
    const data = await handleResponse(response)
    return data.payment
  } catch (error) {
    console.error('Error creating payment:', error)
    throw error
  }
}

// Update existing payment
export async function updatePayment(id: string, paymentData: Partial<Payment>): Promise<Payment> {
  try {
    const response = await fetch(`${API_BASE}/payments`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...paymentData }),
    })
    const data = await handleResponse(response)
    return data.payment
  } catch (error) {
    console.error('Error updating payment:', error)
    throw error
  }
}

// Delete payment
export async function deletePayment(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/payments?id=${id}`, {
      method: 'DELETE',
    })
    await handleResponse(response)
  } catch (error) {
    console.error('Error deleting payment:', error)
    throw error
  }
}