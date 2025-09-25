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

// GET - Tüm grupları getir
export async function GET(request: NextRequest) {
  try {
    // TEMPORARY: Disable auth for testing
    // const currentUser = await getUserFromToken(request);
    // if (!currentUser) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    const currentUser = { id: 1 }; // Fake user for testing

    const client = await pool.connect();
    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        g.id,
        g.name,
        g.type,
        g.start_date as "start_date",
        g.end_date as "end_date",
        g.capacity,
        g.currency,
        g.fees_by_duration as "feesByDuration",
        g.notes,
        g.status,
        g.guide_name,
        g.guide_phone,
        g.total_price,
        g.archived_at,
        g.archive_path,
        g.created_at,
        g.updated_at,
        u.full_name as creator_name,
        (SELECT COUNT(*) FROM participants WHERE group_id = g.id) as participant_count
      FROM groups g
      LEFT JOIN users u ON g.created_by = u.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (status && status !== 'all') {
      paramCount++;
      query += ` AND g.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (type && type !== 'all') {
      paramCount++;
      query += ` AND g.type = $${paramCount}`;
      queryParams.push(type);
    }

    query += ` ORDER BY g.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    queryParams.push(limit, offset);

    const result = await client.query(query, queryParams);
    
    // Toplam sayıyı al
    let countQuery = 'SELECT COUNT(*) FROM groups WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (status && status !== 'all') {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    if (type && type !== 'all') {
      countParamCount++;
      countQuery += ` AND type = $${countParamCount}`;
      countParams.push(type);
    }

    const countResult = await client.query(countQuery, countParams);
    const totalItems = parseInt(countResult.rows[0].count);
    
    client.release();
    
    return NextResponse.json({
      data: result.rows.map(row => ({
        ...row,
        total_paid: 0, // TODO: Hesapla
        total_remaining: 0 // TODO: Hesapla
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });

  } catch (error) {
    console.error('Get groups error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch groups' 
    }, { status: 500 });
  }
}

// POST - Yeni grup oluştur
export async function POST(request: NextRequest) {
  try {
    // TEMPORARY: Disable auth for testing
    // const currentUser = await getUserFromToken(request);
    // if (!currentUser) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    const currentUser = { id: 1 }; // Fake user for testing

    const { name, type, startDate, endDate, capacity, currency, feesByDuration, notes } = await request.json();

    // Validation
    if (!name || !type || !startDate) {
      return NextResponse.json({ 
        error: 'Name, type, and start date are required' 
      }, { status: 400 });
    }

    if (!['Hac', 'Umre', 'Gezi'].includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid group type' 
      }, { status: 400 });
    }

    if (!['TRY', 'USD', 'SAR'].includes(currency)) {
      return NextResponse.json({ 
        error: 'Invalid currency' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        INSERT INTO groups (name, type, start_date, end_date, capacity, currency, fees_by_duration, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING 
          id,
          name,
          type,
          start_date as "startDate",
          end_date as "endDate",
          capacity,
          currency,
          fees_by_duration as "feesByDuration",
          notes,
          created_at,
          updated_at
      `, [name, type, startDate, endDate || null, capacity || 0, currency || 'TRY', JSON.stringify(feesByDuration), notes || null, currentUser.id]);

      client.release();

      return NextResponse.json({ 
        success: true, 
        message: 'Group created successfully',
        group: result.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json({ 
      error: 'Failed to create group' 
    }, { status: 500 });
  }
}

// PUT - Grubu güncelle
export async function PUT(request: NextRequest) {
  try {
    // TEMPORARY: Disable auth for testing
    // const currentUser = await getUserFromToken(request);
    // if (!currentUser) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    const currentUser = { id: 1 }; // Fake user for testing

    const { id, name, type, startDate, endDate, capacity, currency, feesByDuration, notes } = await request.json();

    // Validation
    if (!id || !name || !type || !startDate) {
      return NextResponse.json({ 
        error: 'ID, name, type, and start date are required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        UPDATE groups 
        SET name = $1, type = $2, start_date = $3, end_date = $4, 
            capacity = $5, currency = $6, fees_by_duration = $7, notes = $8
        WHERE id = $9
        RETURNING 
          id,
          name,
          type,
          start_date as "startDate",
          end_date as "endDate",
          capacity,
          currency,
          fees_by_duration as "feesByDuration",
          notes,
          created_at,
          updated_at
      `, [name, type, startDate, endDate || null, capacity || 0, currency || 'TRY', JSON.stringify(feesByDuration), notes || null, id]);

      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Group not found' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Group updated successfully',
        group: result.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Update group error:', error);
    return NextResponse.json({ 
      error: 'Failed to update group' 
    }, { status: 500 });
  }
}

// DELETE - Grubu sil
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const groupId = url.searchParams.get('id');

    if (!groupId) {
      return NextResponse.json({ 
        error: 'Group ID is required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      // Önce grup var mı kontrol et
      const checkResult = await client.query('SELECT id, name FROM groups WHERE id = $1', [groupId]);
      
      if (checkResult.rows.length === 0) {
        client.release();
        return NextResponse.json({ 
          error: 'Group not found' 
        }, { status: 404 });
      }

      // Grup silme (CASCADE ile ilgili veriler otomatik silinecek)
      const deleteResult = await client.query(
        'DELETE FROM groups WHERE id = $1 RETURNING name',
        [groupId]
      );

      client.release();

      return NextResponse.json({ 
        success: true, 
        message: 'Group deleted successfully',
        deletedGroup: deleteResult.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Delete group error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete group' 
    }, { status: 500 });
  }
}