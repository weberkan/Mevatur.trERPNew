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

async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
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
        group_id as "groupId",
        name,
        type,
        created_at,
        updated_at
      FROM rooms 
      ORDER BY name ASC
    `);
    
    client.release();
    
    return NextResponse.json({ 
      success: true, 
      rooms: result.rows 
    });

  } catch (error) {
    console.error('Get rooms error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch rooms' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId, name, type } = await request.json();

    if (!groupId || !name || !type) {
      return NextResponse.json({ 
        error: 'Group ID, name, and type are required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        INSERT INTO rooms (group_id, name, type)
        VALUES ($1, $2, $3)
        RETURNING 
          id,
          group_id as "groupId",
          name,
          type,
          created_at,
          updated_at
      `, [groupId, name, type]);

      client.release();

      return NextResponse.json({ 
        success: true, 
        message: 'Room created successfully',
        room: result.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json({ 
      error: 'Failed to create room' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, groupId, name, type } = await request.json();

    if (!id || !groupId || !name || !type) {
      return NextResponse.json({ 
        error: 'ID, group ID, name, and type are required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        UPDATE rooms 
        SET group_id = $1, name = $2, type = $3
        WHERE id = $4
        RETURNING 
          id,
          group_id as "groupId",
          name,
          type,
          created_at,
          updated_at
      `, [groupId, name, type, id]);

      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Room not found' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Room updated successfully',
        room: result.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Update room error:', error);
    return NextResponse.json({ 
      error: 'Failed to update room' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const roomId = url.searchParams.get('id');

    if (!roomId) {
      return NextResponse.json({ 
        error: 'Room ID is required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(
        'DELETE FROM rooms WHERE id = $1 RETURNING name, type',
        [roomId]
      );

      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Room not found' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Room deleted successfully'
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete room' 
    }, { status: 500 });
  }
}