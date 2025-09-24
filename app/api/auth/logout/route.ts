import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Başarıyla çıkış yapıldı'
    })

    // JWT token cookie'sini temizle
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0 // Hemen expire et
    })

    return response

  } catch (error) {
    console.error('Logout hatası:', error)
    return NextResponse.json(
      { error: 'Çıkış işlemi başarısız' },
      { status: 500 }
    )
  }
}