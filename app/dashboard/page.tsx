"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TopNav from "@/components/top-nav"
import GroupsModule from "@/components/groups"
import ParticipantsModule from "@/components/participants"
import PaymentsModule from "@/components/payments"
import IncomeExpenseModule from "@/components/income-expense"
import ReportsModule from "@/components/reports"
import RoomingModule from "@/components/rooming"
import AuthGuard from "@/components/auth-guard"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("groups")

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <TopNav />
        <main className="max-w-7xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="groups">Gruplar</TabsTrigger>
            <TabsTrigger value="participants">Katılımcılar</TabsTrigger>
            <TabsTrigger value="rooming">Odalama</TabsTrigger>
            <TabsTrigger value="payments">Ödemeler</TabsTrigger>
            <TabsTrigger value="income-expense">Gelir–Gider</TabsTrigger>
            <TabsTrigger value="reports">Raporlar</TabsTrigger>
          </TabsList>

          <TabsContent value="groups">
            <GroupsModule />
          </TabsContent>

          <TabsContent value="participants">
            <ParticipantsModule />
          </TabsContent>

          <TabsContent value="rooming">
            <RoomingModule />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsModule />
          </TabsContent>

          <TabsContent value="income-expense">
            <IncomeExpenseModule />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsModule />
          </TabsContent>
        </Tabs>
      </main>
    </div>
    </AuthGuard>
  )
}
