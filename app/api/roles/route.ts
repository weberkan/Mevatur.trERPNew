import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
});

// JWT token'dan kullanıcı bilgisini al
async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const client = await pool.connect();
    const result = await client.query(
      'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
      [decoded.userId]
    );
    client.release();
    
    return result.rows[0] || null;
  } catch (error) {
    return null;
  }
}

// GET - Rol listesi
export async function GET(request: NextRequest) {
  try {
    // Kullanıcı doğrulama
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sadece admin roller görebilir
    if (currentUser.role_name !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const client = await pool.connect();
    const result = await client.query(`
      SELECT id, name, description
      FROM roles 
      ORDER BY name ASC
    `);
    
    client.release();
    
    return NextResponse.json({ 
      success: true, 
      roles: result.rows 
    });

  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch roles' 
    }, { status: 500 });
  }
}