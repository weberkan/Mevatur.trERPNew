import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'

// PostgreSQL bağlantı havuzu
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false // Coolify PostgreSQL SSL desteklemiyor
})

export async function POST(request: NextRequest) {
  let client
  
  try {
    const { username, password } = await request.json()

    // Kullanıcı adı ve şifre kontrolü
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Kullanıcı adı ve şifre gerekli' },
        { status: 400 }
      )
    }

    // Veritabanı bağlantısı
    client = await pool.connect()
    
    // Kullanıcıyı ve rol bilgisini getir
    const userQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.password_hash,
        u.full_name,
        u.is_active,
        u.last_login,
        r.name as role_name,
        r.permissions
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.username = $1 AND u.is_active = true
    `
    
    const result = await client.query(userQuery, [username])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı veya aktif değil' },
        { status: 401 }
      )
    }
    
    const user = result.rows[0]
    
    // Şifre doğrulama
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Geçersiz şifre' },
        { status: 401 }
      )
    }
    
    // Son giriş zamanını güncelle
    await client.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    )
    
    // JWT token oluştur
    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        role: user.role_name
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    )
    
    // Başarılı giriş - hassas bilgileri çıkar
    const { password_hash, ...userWithoutPassword } = user
    
    const response = NextResponse.json({
      success: true,
      user: {
        id: userWithoutPassword.id,
        username: userWithoutPassword.username,
        email: userWithoutPassword.email,
        full_name: userWithoutPassword.full_name,
        role: userWithoutPassword.role_name,
        permissions: userWithoutPassword.permissions,
        last_login: userWithoutPassword.last_login
      },
      message: 'Giriş başarılı'
    })
    
    // JWT token'ı cookie olarak ayarla
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 // 24 saat
    })
    
    return response

  } catch (error) {
    console.error('Login hatası:', error)
    return NextResponse.json(
      { 
        error: 'Sunucu hatası',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Bir hata oluştu'
      },
      { status: 500 }
    )
  } finally {
    // Bağlantıyı serbest bırak
    if (client) {
      client.release()
    }
  }
}
