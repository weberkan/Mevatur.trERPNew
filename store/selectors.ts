import type { Group, Participant, Payment } from "./app-store"

export function getParticipantFee(groups: Group[], participant: Participant): number {
  const group = groups.find((g) => g.id === participant.groupId)
  if (!group) return 0

  const durationKey = `d${participant.dayCount}` as keyof typeof group.feesByDuration
  const roomKey = `room${participant.roomType}` as keyof typeof group.feesByDuration.d7

  const baseFee = group.feesByDuration[durationKey]?.[roomKey] || 0
  const discount = participant.discount || 0

  return Math.max(baseFee - discount, 0)
}

export function getParticipantFeeTRY(
  groups: Group[],
  participant: Participant,
  rates: { USDTRY?: number; SARTRY?: number },
): number {
  const group = groups.find((g) => g.id === participant.groupId)
  if (!group) return 0

  const feeInGroupCurrency = getParticipantFee(groups, participant)

  if (group.currency === "TRY") return feeInGroupCurrency
  if (group.currency === "USD") return feeInGroupCurrency * (rates.USDTRY || 34)
  if (group.currency === "SAR") return feeInGroupCurrency * (rates.SARTRY || 9)

  return feeInGroupCurrency
}

// Yeni fonksiyon: Para birimlerine göre ayrı ayrı ödeme toplamları
export function getPaymentSumsByCurrency(
  payments: Payment[],
  participantId: string,
): { USD: number; TRY: number; SAR: number } {
  const participantPayments = payments.filter((p) => p.participantId === participantId)
  return {
    USD: participantPayments.filter((p) => p.currency === "USD").reduce((sum, p) => sum + p.amount, 0),
    TRY: participantPayments.filter((p) => p.currency === "TRY").reduce((sum, p) => sum + p.amount, 0),
    SAR: participantPayments.filter((p) => p.currency === "SAR").reduce((sum, p) => sum + p.amount, 0),
  }
}

export function getSumPaymentsForParticipant(payments: Payment[], participantId: string): number {
  return payments
    .filter((p) => p.participantId === participantId)
    .reduce((sum, p) => sum + (p.amountTRY || p.amount), 0)
}

// Yeni fonksiyon: Grup para biriminde kalan bakiye hesaplama
export function getParticipantBalance(
  groups: Group[],
  payments: Payment[],
  participant: Participant,
  rates: { USDTRY?: number; SARTRY?: number },
): number {
  const group = groups.find((g) => g.id === participant.groupId)
  if (!group) return 0

  const fee = getParticipantFee(groups, participant)
  const paymentSums = getPaymentSumsByCurrency(payments, participant.id)

  // Grup para birimindeki ödemeleri al
  let paidInGroupCurrency = 0
  if (group.currency === "USD") {
    paidInGroupCurrency = paymentSums.USD
    // TRY ödemelerini USD'ye çevir
    if (paymentSums.TRY > 0 && rates.USDTRY) {
      paidInGroupCurrency += paymentSums.TRY / rates.USDTRY
    }
  } else if (group.currency === "TRY") {
    paidInGroupCurrency = paymentSums.TRY
    // USD ödemelerini TRY'ye çevir
    if (paymentSums.USD > 0 && rates.USDTRY) {
      paidInGroupCurrency += paymentSums.USD * rates.USDTRY
    }
  } else if (group.currency === "SAR") {
    paidInGroupCurrency = paymentSums.SAR
    // Diğer para birimlerini SAR'a çevir
    if (paymentSums.USD > 0 && rates.USDSAR) {
      paidInGroupCurrency += paymentSums.USD / rates.USDSAR
    }
    if (paymentSums.TRY > 0 && rates.SARTRY) {
      paidInGroupCurrency += paymentSums.TRY / rates.SARTRY
    }
  }

  return fee - paidInGroupCurrency
}

export function getParticipantBalanceTRY(
  groups: Group[],
  payments: Payment[],
  participant: Participant,
  rates: { USDTRY?: number; SARTRY?: number },
): number {
  const feeTRY = getParticipantFeeTRY(groups, participant, rates)
  const paidTRY = getSumPaymentsForParticipant(payments, participant.id)
  return feeTRY - paidTRY
}
