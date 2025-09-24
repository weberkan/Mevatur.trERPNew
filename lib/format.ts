export function formatCurrency(amount: number, currency: string): string {
  const num = Number(amount) || 0
  const formatted = num.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${formatted} ${currency}`
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("tr-TR")
  } catch {
    return dateStr
  }
}
