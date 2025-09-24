"use client"

import TopNav from "@/components/top-nav"
import CompanyFinanceModule from "@/components/company-finance"

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="max-w-7xl mx-auto p-4">
        <CompanyFinanceModule />
      </main>
    </div>
  )
}
