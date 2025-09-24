export function isTC(value: string): boolean {
  const cleaned = value.replace(/\D/g, "")
  return cleaned.length === 11 && /^\d{11}$/.test(cleaned)
}

export function isEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

export function isPhoneTR(value: string): boolean {
  const cleaned = value.replace(/\D/g, "")
  return cleaned.length === 10 && cleaned.startsWith("5")
}

export function isPassport(value: string): boolean {
  const cleaned = value.replace(/[^A-Z0-9]/g, "")
  return cleaned.length === 9 && /^[A-Z]\d{8}$/.test(cleaned)
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "")
}

export function normalizePassport(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "")
}
