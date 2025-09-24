import jwt from 'jsonwebtoken'
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: false
})

export interface AuthUser {
  id: number
  username: string
  email: string
  full_name: string
  role_name: string
  permissions: any
  is_active: boolean
}

/**
 * JWT token'dan kullanıcı bilgisini al
 */
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const client = await pool.connect()
    
    const result = await client.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.is_active,
        r.name as role_name,
        r.permissions
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.id = $1 AND u.is_active = true
    `, [decoded.userId])
    
    client.release()
    
    return result.rows[0] || null
  } catch (error) {
    console.error('Token doğrulama hatası:', error)
    return null
  }
}

/**
 * Kullanıcının belirli bir yetkiye sahip olup olmadığını kontrol et
 */
export function hasPermission(user: AuthUser, resource: string, action: string): boolean {
  if (!user.permissions || typeof user.permissions !== 'object') {
    return false
  }

  // Admin her şeyi yapabilir
  if (user.role_name === 'admin') {
    return true
  }

  // İlgili kaynak ve aksiyon kontrolü
  const resourcePermissions = user.permissions[resource]
  if (!resourcePermissions || typeof resourcePermissions !== 'object') {
    return false
  }

  return resourcePermissions[action] === true
}

/**
 * Kullanıcının admin olup olmadığını kontrol et
 */
export function isAdmin(user: AuthUser): boolean {
  return user.role_name === 'admin'
}

/**
 * Kullanıcının manager veya admin olup olmadığını kontrol et
 */
export function isManagerOrAdmin(user: AuthUser): boolean {
  return ['admin', 'manager'].includes(user.role_name)
}

/**
 * Request'ten kullanıcı bilgisini al
 */
export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null

  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(cookie => cookie.split('='))
  )

  const token = cookies['auth-token']
  if (!token) return null

  return getUserFromToken(token)
}