'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = sessionStorage.getItem('isAuthenticated')
      const isLoggedIn = authStatus === 'true'
      
      setIsAuthenticated(isLoggedIn)

      // Eğer login sayfasında değilsek ve giriş yapmamışsak login'e yönlendir
      if (!isLoggedIn && pathname !== '/login') {
        router.push('/login')
      }
      
      // Eğer login sayfasındaysak ve giriş yapmışsak dashboard'a yönlendir
      if (isLoggedIn && pathname === '/login') {
        router.push('/dashboard')
      }
    }

    checkAuth()

    // Storage değişikliklerini dinle (başka sekmede logout olunca)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isAuthenticated') {
        checkAuth()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [router, pathname])

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Yükleniyor...</span>
        </div>
      </div>
    )
  }

  // Login sayfasında auth guard'a gerek yok
  if (pathname === '/login') {
    return <>{children}</>
  }

  // Authenticated olmayan kullanıcıları login'e yönlendir
  if (!isAuthenticated) {
    return null // Router.push zaten çalışacak
  }

  return <>{children}</>
}
