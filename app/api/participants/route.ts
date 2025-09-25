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

// GET - Tüm katılımcıları getir
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        id,
        full_name as "fullName",
        phone,
        email,
        id_number as "idNumber",
        passport_no as "passportNo",
        passport_valid_until as "passportValidUntil",
        birth_date as "birthDate",
        gender,
        group_id as "groupId",
        room_type as "roomType",
        day_count as "dayCount",
        discount,
        room_id as "roomId",
        reference,
        created_at,
        updated_at
      FROM participants 
      ORDER BY created_at DESC
    `);
    
    client.release();
    
    return NextResponse.json({ 
      success: true, 
      participants: result.rows 
    });

  } catch (error) {
    console.error('Get participants error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch participants' 
    }, { status: 500 });
  }
}

// POST - Yeni katılımcı oluştur
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      fullName, phone, email, idNumber, passportNo, passportValidUntil, 
      birthDate, gender, groupId, roomType, dayCount, discount, roomId, reference 
    } = await request.json();

    // Validation
    if (!fullName || !groupId) {
      return NextResponse.json({ 
        error: 'Full name and group ID are required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        INSERT INTO participants (
          full_name, phone, email, id_number, passport_no, passport_valid_until,
          birth_date, gender, group_id, room_type, day_count, discount, room_id, reference
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING 
          id,
          full_name as "fullName",
          phone,
          email,
          id_number as "idNumber",
          passport_no as "passportNo",
          passport_valid_until as "passportValidUntil",
          birth_date as "birthDate",
          gender,
          group_id as "groupId",
          room_type as "roomType",
          day_count as "dayCount",
          discount,
          room_id as "roomId",
          reference,
          created_at,
          updated_at
      `, [
        fullName, phone || null, email || null, idNumber || null, passportNo || null, 
        passportValidUntil || null, birthDate || null, gender || 'Mr', groupId, 
        roomType || '3', dayCount || 7, discount || 0, roomId || null, reference || null
      ]);

      client.release();

      return NextResponse.json({ 
        success: true, 
        message: 'Participant created successfully',
        participant: result.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Create participant error:', error);
    return NextResponse.json({ 
      error: 'Failed to create participant' 
    }, { status: 500 });
  }
}

// PUT - Katılımcıyı güncelle
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      id, fullName, phone, email, idNumber, passportNo, passportValidUntil, 
      birthDate, gender, groupId, roomType, dayCount, discount, roomId, reference 
    } = await request.json();

    // Validation
    if (!id || !fullName || !groupId) {
      return NextResponse.json({ 
        error: 'ID, full name, and group ID are required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        UPDATE participants 
        SET full_name = $1, phone = $2, email = $3, id_number = $4, passport_no = $5,
            passport_valid_until = $6, birth_date = $7, gender = $8, group_id = $9,
            room_type = $10, day_count = $11, discount = $12, room_id = $13, reference = $14
        WHERE id = $15
        RETURNING 
          id,
          full_name as "fullName",
          phone,
          email,
          id_number as "idNumber",
          passport_no as "passportNo",
          passport_valid_until as "passportValidUntil",
          birth_date as "birthDate",
          gender,
          group_id as "groupId",
          room_type as "roomType",
          day_count as "dayCount",
          discount,
          room_id as "roomId",
          reference,
          created_at,
          updated_at
      `, [
        fullName, phone || null, email || null, idNumber || null, passportNo || null,
        passportValidUntil || null, birthDate || null, gender || 'Mr', groupId,
        roomType || '3', dayCount || 7, discount || 0, roomId || null, reference || null, id
      ]);

      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Participant not found' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Participant updated successfully',
        participant: result.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Update participant error:', error);
    return NextResponse.json({ 
      error: 'Failed to update participant' 
    }, { status: 500 });
  }
}

// DELETE - Katılımcıyı sil
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const participantId = url.searchParams.get('id');

    if (!participantId) {
      return NextResponse.json({ 
        error: 'Participant ID is required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(
        'DELETE FROM participants WHERE id = $1 RETURNING full_name',
        [participantId]
      );

      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Participant not found' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Participant deleted successfully',
        deletedParticipant: result.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Delete participant error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete participant' 
    }, { status: 500 });
  }
}