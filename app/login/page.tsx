'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Lock, User } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // API'ye login isteği gönder
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Login başarılı - session storage'a kaydet
        sessionStorage.setItem('isAuthenticated', 'true')
        sessionStorage.setItem('user', JSON.stringify({
          ...data.user,
          loginTime: Date.now()
        }))
        
        // Dashboard'a yönlendir
        router.push('/dashboard')
      } else {
        setError(data.error || 'Giriş başarısız')
      }
    } catch (error) {
      console.error('Login hatası:', error)
      setError('Bağlantı hatası. Lütfen tekrar deneyin.')
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid-emerald-100/25 bg-[size:20px_20px] opacity-60" />
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-emerald-100">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-emerald-700">Meva Panel</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Hac & Umre ERP Sistemi
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                Kullanıcı Adı
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Kullanıcı adınızı girin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Şifre
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Şifrenizi girin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Giriş yapılıyor...
                </div>
              ) : (
                'Giriş Yap'
              )}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h4 className="text-sm font-medium text-emerald-800 mb-2">Sistem Bilgisi:</h4>
            <div className="text-xs text-emerald-700 space-y-1">
              <p><strong>Sistem:</strong> Hac & Umre ERP Yönetim Paneli</p>
              <p><strong>Giriş:</strong> Yöneticinizden kullanıcı bilgilerinizi alın</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
