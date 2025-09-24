"use client"

import { useMemo, useState, useEffect } from "react"
import { useAppStore, type Payment, type Expense } from "@/store/app-store"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/format"
import ExportButton from "./export-button"
import { getParticipantFee } from "@/store/selectors"
import { useExchangeRates } from "@/lib/rates"
import { fetchPayments } from "@/lib/api-payments"
import { fetchExpenses } from "@/lib/api-expenses"

export default function ReportsModule() {
  const groups = useAppStore((s) => s.groups)
  const participants = useAppStore((s) => s.participants)
  const { rates } = useExchangeRates()

  // Local API-based state
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const [groupId, setGroupId] = useState<string>("all")

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [paymentsData, expensesData] = await Promise.all([
          fetchPayments(),
          fetchExpenses()
        ])
        setPayments(paymentsData)
        setExpenses(expensesData)
        // Also load groups and participants
        useAppStore.getState().loadGroups()
        useAppStore.getState().loadParticipants()
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const data = useMemo(() => {
    const selectedGroups = groupId === "all" ? groups : groups.filter((g) => g.id === groupId)
    const rows: Array<{
      groupId: string
      groupName: string
      participants: number
      days: number | undefined
      currency: string
      expected: number
      paid: number
      expense: number
      net: number
    }> = []

    selectedGroups.forEach((g) => {
      const groupParticipants = participants.filter((p) => p.groupId === g.id)
      const groupPayments = payments.filter((p) => groupParticipants.some((pp) => pp.id === p.participantId))
      const groupExpenses = expenses.filter((e) => !e.groupId || e.groupId === g.id)

      const expected = groupParticipants.reduce((s, p) => s + getParticipantFee(groups, p), 0) // group currency

      // Para birimlerine göre tahsilat toplamları
      const paidSums = {
        USD: groupPayments.filter((p) => p.currency === "USD").reduce((s, p) => s + Number(p.amount || 0), 0),
        TRY: groupPayments.filter((p) => p.currency === "TRY").reduce((s, p) => s + Number(p.amount || 0), 0),
        SAR: groupPayments.filter((p) => p.currency === "SAR").reduce((s, p) => s + Number(p.amount || 0), 0),
      }

      // Para birimlerine göre gider toplamları
      const expenseSums = {
        USD: groupExpenses.filter((e) => e.currency === "USD").reduce((s, e) => s + Number(e.amount || 0), 0),
        TRY: groupExpenses.filter((e) => e.currency === "TRY").reduce((s, e) => s + Number(e.amount || 0), 0),
        SAR: groupExpenses.filter((e) => e.currency === "SAR").reduce((s, e) => s + Number(e.amount || 0), 0),
      }

      // Her para birimi için ayrı satır ekle (sadece 0'dan büyük olanlar için)
      const currencies = ["USD", "TRY", "SAR"] as const
      currencies.forEach((curr) => {
        if (paidSums[curr] > 0 || expenseSums[curr] > 0) {
          rows.push({
            groupId: g.id,
            groupName: g.name,
            participants: groupParticipants.length,
            days: (g as any).days,
            currency: curr,
            expected: curr === g.currency ? expected : 0, // Sadece grup para biriminde beklenen geliri göster
            paid: paidSums[curr],
            expense: expenseSums[curr],
            net: paidSums[curr] - expenseSums[curr],
          })
        }
      })

      // Eğer hiç işlem yoksa grup para biriminde bir satır ekle
      if (
        paidSums.USD === 0 &&
        paidSums.TRY === 0 &&
        paidSums.SAR === 0 &&
        expenseSums.USD === 0 &&
        expenseSums.TRY === 0 &&
        expenseSums.SAR === 0
      ) {
        rows.push({
          groupId: g.id,
          groupName: g.name,
          participants: groupParticipants.length,
          days: (g as any).days,
          currency: g.currency,
          expected: expected,
          paid: 0,
          expense: 0,
          net: 0,
        })
      }
    })

    return rows
  }, [groupId, groups, participants, payments, expenses])

  const csvRows = data.map((d) => ({
    Grup: d.groupName,
    Gün: d.days ?? "-",
    "Para Birimi": d.currency,
    "Katılımcı Sayısı": d.participants,
    "Beklenen Gelir": d.expected,
    Tahsilat: d.paid,
    Giderler: d.expense,
    Net: d.net,
  }))

  return (
    <div className="grid gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Raporlar</h2>
          <p className="text-sm text-muted-foreground">
            Grup bazlı özetler. Tahsilat, Gider ve Net orijinal para birimlerinde gösterilir.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton filename="grup-rapor.xlsx" rows={csvRows} />
          <ExportButton mode="print" title="Grup Raporu" rows={csvRows} />
        </div>
      </div>

      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Grup seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Gruplar</SelectItem>
                {useAppStore.getState().groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left p-2 font-medium">Grup</th>
                  <th className="text-left p-2 font-medium">Gün</th>
                  <th className="text-left p-2 font-medium">Katılımcı</th>
                  <th className="text-left p-2 font-medium">Para</th>
                  <th className="text-left p-2 font-medium">Beklenen</th>
                  <th className="text-left p-2 font-medium">Tahsilat</th>
                  <th className="text-left p-2 font-medium">Giderler</th>
                  <th className="text-left p-2 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-8 text-center" colSpan={8}>
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        <span>Yükleniyor...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((d, index) => (
                      <tr key={`${d.groupId}-${d.currency}-${index}`} className="border-t">
                        <td className="p-2 font-medium">{d.groupName}</td>
                        <td className="p-2">{d.days ?? "-"}</td>
                        <td className="p-2">{d.participants}</td>
                        <td className="p-2">{d.currency}</td>
                        <td className="p-2">{d.expected > 0 ? formatCurrency(d.expected, d.currency) : "-"}</td>
                        <td className="p-2">{d.paid > 0 ? formatCurrency(d.paid, d.currency) : "-"}</td>
                        <td className="p-2">{d.expense > 0 ? formatCurrency(d.expense, d.currency) : "-"}</td>
                        <td className={`p-2 ${d.net >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                          {d.net !== 0 ? formatCurrency(d.net, d.currency) : "-"}
                        </td>
                      </tr>
                    ))}
                    {!loading && data.length === 0 ? (
                      <tr>
                        <td className="p-3 text-center text-muted-foreground" colSpan={8}>
                          Raporlanacak grup yok.
                        </td>
                      </tr>
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
