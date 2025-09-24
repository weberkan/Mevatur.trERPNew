import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
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

// GET - Kullanıcı listesi
export async function GET(request: NextRequest) {
  try {
    // Kullanıcı doğrulama
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sadece admin kullanıcıları görebilir
    if (currentUser.role_name !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.full_name, 
        u.is_active, 
        u.created_at, 
        u.last_login,
        r.name as role_name,
        c.name as company_name
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN user_companies uc ON u.id = uc.user_id AND uc.is_default = true
      LEFT JOIN companies c ON uc.company_id = c.id
      ORDER BY u.created_at DESC
    `);
    
    client.release();
    
    return NextResponse.json({ 
      success: true, 
      users: result.rows 
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch users' 
    }, { status: 500 });
  }
}

// POST - Yeni kullanıcı oluştur
export async function POST(request: NextRequest) {
  try {
    // Kullanıcı doğrulama
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sadece admin kullanıcı oluşturabilir
    if (currentUser.role_name !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { username, email, password, fullName, roleId } = await request.json();

    // Validation
    if (!username || !email || !password || !fullName || !roleId) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    // Password validation (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters long' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      // Kullanıcı adı ve email kontrolü
      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        client.release();
        return NextResponse.json({ 
          error: 'Username or email already exists' 
        }, { status: 409 });
      }

      // Rol kontrolü
      const roleCheck = await client.query(
        'SELECT id FROM roles WHERE id = $1',
        [roleId]
      );

      if (roleCheck.rows.length === 0) {
        client.release();
        return NextResponse.json({ 
          error: 'Invalid role selected' 
        }, { status: 400 });
      }

      // Şifreyi hashle
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Kullanıcı oluştur
      const userResult = await client.query(`
        INSERT INTO users (username, email, password_hash, full_name, role_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, username, email, full_name, is_active, created_at
      `, [username, email, passwordHash, fullName, roleId, currentUser.id]);

      const newUser = userResult.rows[0];

      // Default company'ye ekle (eğer varsa)
      const defaultCompany = await client.query(
        'SELECT id FROM companies ORDER BY created_at LIMIT 1'
      );

      if (defaultCompany.rows.length > 0) {
        await client.query(`
          INSERT INTO user_companies (user_id, company_id, is_default)
          VALUES ($1, $2, true)
        `, [newUser.id, defaultCompany.rows[0].id]);
      }

      client.release();

      return NextResponse.json({ 
        success: true, 
        message: 'User created successfully',
        user: newUser
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ 
      error: 'Failed to create user' 
    }, { status: 500 });
  }
}

// PUT - Kullanıcı güncelle
export async function PUT(request: NextRequest) {
  try {
    // Kullanıcı doğrulama
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sadece admin kullanıcı güncelleyebilir
    if (currentUser.role_name !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { id, username, email, fullName, roleId, isActive } = await request.json();

    // Validation
    if (!id || !username || !email || !fullName || !roleId) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      // Güncellenecek kullanıcının varlığını ve admin olmadığını kontrol et
      const targetUser = await client.query(
        'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
        [id]
      );

      if (targetUser.rows.length === 0) {
        client.release();
        return NextResponse.json({ 
          error: 'User not found' 
        }, { status: 404 });
      }

      // Admin kullanıcısının güncellenmesini engelle
      if (targetUser.rows[0].role_name === 'admin') {
        client.release();
        return NextResponse.json({ 
          error: 'Cannot update admin user' 
        }, { status: 403 });
      }

      // Username ve email kontrolü (kendisi hariç)
      const existingUser = await client.query(
        'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
        [username, email, id]
      );

      if (existingUser.rows.length > 0) {
        client.release();
        return NextResponse.json({ 
          error: 'Username or email already exists' 
        }, { status: 409 });
      }

      // Rol kontrolü
      const roleCheck = await client.query(
        'SELECT id FROM roles WHERE id = $1',
        [roleId]
      );

      if (roleCheck.rows.length === 0) {
        client.release();
        return NextResponse.json({ 
          error: 'Invalid role selected' 
        }, { status: 400 });
      }

      // Kullanıcı güncelle
      const updateResult = await client.query(`
        UPDATE users 
        SET username = $1, email = $2, full_name = $3, role_id = $4, is_active = $5, updated_at = NOW()
        WHERE id = $6
        RETURNING id, username, email, full_name, is_active, updated_at
      `, [username, email, fullName, roleId, isActive ?? true, id]);

      client.release();

      return NextResponse.json({ 
        success: true, 
        message: 'User updated successfully',
        user: updateResult.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ 
      error: 'Failed to update user' 
    }, { status: 500 });
  }
}

// DELETE - Kullanıcı sil
export async function DELETE(request: NextRequest) {
  try {
    // Kullanıcı doğrulama
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sadece admin kullanıcı silebilir
    if (currentUser.role_name !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      // Silinecek kullanıcının varlığını ve admin olmadığını kontrol et
      const targetUser = await client.query(
        'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
        [userId]
      );

      if (targetUser.rows.length === 0) {
        client.release();
        return NextResponse.json({ 
          error: 'User not found' 
        }, { status: 404 });
      }

      // Admin kullanıcısının silinmesini engelle
      if (targetUser.rows[0].role_name === 'admin') {
        client.release();
        return NextResponse.json({ 
          error: 'Cannot delete admin user' 
        }, { status: 403 });
      }

      // Kendini silmesini engelle
      if (parseInt(userId) === currentUser.id) {
        client.release();
        return NextResponse.json({ 
          error: 'Cannot delete your own account' 
        }, { status: 403 });
      }

      // İlgili tabloları temizle (foreign key constraint nedeniyle)
      await client.query('DELETE FROM user_companies WHERE user_id = $1', [userId]);
      
      // Kullanıcıyı sil
      const deleteResult = await client.query(
        'DELETE FROM users WHERE id = $1 RETURNING username, full_name',
        [userId]
      );

      client.release();

      return NextResponse.json({ 
        success: true, 
        message: 'User deleted successfully',
        deletedUser: deleteResult.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete user' 
    }, { status: 500 });
  }
}
