import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'

// PostgreSQL bağlantı havuzu
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: false // Local development için
})

export async function POST(request: NextRequest) {
  let client

  try {
    const { username, email, password, full_name, role_id, created_by } = await request.json()

    // Zorunlu alanları kontrol et
    if (!username || !email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Kullanıcı adı, email, şifre ve tam isim gerekli' },
        { status: 400 }
      )
    }

    // Email formatını kontrol et
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Geçerli bir email adresi girin' },
        { status: 400 }
      )
    }

    // Şifre güvenlik kontrolü (en az 6 karakter)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalı' },
        { status: 400 }
      )
    }

    // Veritabanı bağlantısı
    client = await pool.connect()

    // Kullanıcı adı ve email benzersizlik kontrolü
    const existingUserQuery = `
      SELECT id FROM users 
      WHERE username = $1 OR email = $2
    `
    const existingUser = await client.query(existingUserQuery, [username, email])

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Bu kullanıcı adı veya email zaten kullanılıyor' },
        { status: 409 }
      )
    }

    // Rol kontrolü - eğer role_id verilmemişse default 'user' rolünü al
    let finalRoleId = role_id
    if (!finalRoleId) {
      const defaultRoleQuery = 'SELECT id FROM roles WHERE name = $1'
      const defaultRole = await client.query(defaultRoleQuery, ['user'])
      if (defaultRole.rows.length > 0) {
        finalRoleId = defaultRole.rows[0].id
      }
    }

    // Şifreyi hash'le
    const saltRounds = 12
    const password_hash = await bcrypt.hash(password, saltRounds)

    // Yeni kullanıcıyı ekle
    const insertUserQuery = `
      INSERT INTO users (username, email, password_hash, full_name, role_id, created_by, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id, username, email, full_name, is_active, created_at
    `

    const result = await client.query(insertUserQuery, [
      username,
      email, 
      password_hash,
      full_name,
      finalRoleId,
      created_by || null
    ])

    const newUser = result.rows[0]

    // Başarılı yanıt
    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        full_name: newUser.full_name,
        is_active: newUser.is_active,
        created_at: newUser.created_at
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Kullanıcı oluşturma hatası:', error)
    return NextResponse.json(
      {
        error: 'Sunucu hatası',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Kullanıcı oluşturulamadı'
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