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
        amount,
        currency,
        amount_try as "amountTRY",
        category,
        description,
        group_id as "groupId",
        created_at,
        updated_at
      FROM expenses
      ORDER BY date DESC, created_at DESC
    `);
    
    client.release();
    
    return NextResponse.json({ 
      success: true, 
      expenses: result.rows 
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch expenses' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, amount, currency, category, description, notes, amountTRY, groupId } = await request.json();

    if (!date || !amount || !currency || !category) {
      return NextResponse.json({ 
        error: 'Date, amount, currency, and category are required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        INSERT INTO expenses (date, amount, currency, amount_try, category, description, group_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING 
          id,
          date,
          amount,
          currency,
          amount_try as "amountTRY",
          category,
          description,
          group_id as "groupId",
          created_at,
          updated_at
      `, [date, amount, currency, amountTRY || amount, category, description || null, groupId || null]);

      client.release();

      return NextResponse.json({ 
        success: true, 
        message: 'Expense created successfully',
        expense: result.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ 
      error: 'Failed to create expense' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, date, amount, currency, category, description, notes, amountTRY, groupId } = await request.json();

    if (!id || !date || !amount || !currency || !category) {
      return NextResponse.json({ 
        error: 'ID, date, amount, currency, and category are required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        UPDATE expenses 
        SET date = $1, amount = $2, currency = $3, amount_try = $4, category = $5, description = $6, group_id = $7
        WHERE id = $8
        RETURNING 
          id,
          date,
          amount,
          currency,
          amount_try as "amountTRY",
          category,
          description,
          group_id as "groupId",
          created_at,
          updated_at
      `, [date, amount, currency, amountTRY || amount, category, description || null, groupId || null, id]);

      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Expense not found' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Expense updated successfully',
        expense: result.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json({ 
      error: 'Failed to update expense' 
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
    const expenseId = url.searchParams.get('id');

    if (!expenseId) {
      return NextResponse.json({ 
        error: 'Expense ID is required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(
        'DELETE FROM expenses WHERE id = $1 RETURNING amount, category',
        [expenseId]
      );

      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Expense not found' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Expense deleted successfully'
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete expense' 
    }, { status: 500 });
  }
}