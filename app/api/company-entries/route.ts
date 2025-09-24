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
        date,
        type,
        currency,
        amount,
        amount_try as "amountTRY",
        category,
        description,
        readonly,
        created_at,
        updated_at
      FROM company_entries 
      ORDER BY date DESC, created_at DESC
    `);
    
    client.release();
    
    return NextResponse.json({ 
      success: true, 
      entries: result.rows 
    });

  } catch (error) {
    console.error('Get company entries error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch company entries' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, type, currency, amount, amountTRY, category, description, readonly } = await request.json();

    if (!date || !type || !currency || !amount || !category) {
      return NextResponse.json({ 
        error: 'Date, type, currency, amount, and category are required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        INSERT INTO company_entries (date, type, currency, amount, amount_try, category, description, readonly, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING 
          id,
          date,
          type,
          currency,
          amount,
          amount_try as "amountTRY",
          category,
          description,
          readonly,
          created_at,
          updated_at
      `, [date, type, currency, amount, amountTRY || amount, category, description || null, readonly || false, currentUser.id]);

      client.release();

      return NextResponse.json({ 
        success: true, 
        message: 'Company entry created successfully',
        entry: result.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Create company entry error:', error);
    return NextResponse.json({ 
      error: 'Failed to create company entry' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, date, type, currency, amount, amountTRY, category, description, readonly } = await request.json();

    if (!id || !date || !type || !currency || !amount || !category) {
      return NextResponse.json({ 
        error: 'ID, date, type, currency, amount, and category are required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        UPDATE company_entries 
        SET date = $1, type = $2, currency = $3, amount = $4, amount_try = $5, category = $6, description = $7, readonly = $8
        WHERE id = $9
        RETURNING 
          id,
          date,
          type,
          currency,
          amount,
          amount_try as "amountTRY",
          category,
          description,
          readonly,
          created_at,
          updated_at
      `, [date, type, currency, amount, amountTRY || amount, category, description || null, readonly || false, id]);

      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Company entry not found' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Company entry updated successfully',
        entry: result.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Update company entry error:', error);
    return NextResponse.json({ 
      error: 'Failed to update company entry' 
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
    const entryId = url.searchParams.get('id');

    if (!entryId) {
      return NextResponse.json({ 
        error: 'Entry ID is required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      // Check if readonly before deleting
      const checkResult = await client.query(
        'SELECT readonly FROM company_entries WHERE id = $1',
        [entryId]
      );

      if (checkResult.rows.length === 0) {
        client.release();
        return NextResponse.json({ 
          error: 'Company entry not found' 
        }, { status: 404 });
      }

      if (checkResult.rows[0].readonly) {
        client.release();
        return NextResponse.json({ 
          error: 'Cannot delete readonly entry' 
        }, { status: 403 });
      }

      const result = await client.query(
        'DELETE FROM company_entries WHERE id = $1 RETURNING amount, category',
        [entryId]
      );

      client.release();

      return NextResponse.json({ 
        success: true, 
        message: 'Company entry deleted successfully'
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Delete company entry error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete company entry' 
    }, { status: 500 });
  }
}