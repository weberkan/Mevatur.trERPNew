'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Ana sayfaya gelince login kontrolü yap
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true'
    
    if (isAuthenticated) {
      // Giriş yapmışsa dashboard'a yönlendir
      router.push('/dashboard')
    } else {
      // Giriş yapmamışsa login'e yönlendir
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-600">Yönlendiriliyor...</span>
      </div>
    </div>
  )
}
