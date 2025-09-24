import { NextResponse } from 'next/server'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
})

export async function GET() {
  let client
  
  try {
    client = await pool.connect()
    
    // Create roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        permissions JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      )
    `)

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `)

    // Insert admin role
    await client.query(`
      INSERT INTO roles (name, description) 
      VALUES ('admin', 'System Administrator') 
      ON CONFLICT (name) DO NOTHING
    `)

    // Hash the password
    const passwordHash = await bcrypt.hash('Ptt2026Meva+-', 10)

    // Insert admin user
    await client.query(`
      INSERT INTO users (username, email, password_hash, full_name, role_id) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (username) DO UPDATE SET
        password_hash = $3,
        email = $2,
        full_name = $4
    `, ['admin', 'admin@meva.com', passwordHash, 'Admin User', 1])

    // Check results
    const rolesResult = await client.query('SELECT * FROM roles')
    const usersResult = await client.query('SELECT id, username, email, full_name, is_active FROM users')

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      tables: {
        roles: rolesResult.rows,
        users: usersResult.rows
      }
    })

  } catch (error) {
    console.error('Database init error:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  } finally {
    if (client) {
      client.release()
    }
  }
}