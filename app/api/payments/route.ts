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
    // TEMPORARY: Disable auth for testing
    // const currentUser = await getUserFromToken(request);
    // if (!currentUser) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    const currentUser = { id: 1 }; // Fake user for testing

    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        id,
        participant_id as "participantId",
        date,
        amount,
        currency,
        amount_try as "amountTRY",
        method,
        notes,
        created_at,
        updated_at
      FROM payments 
      ORDER BY date DESC, created_at DESC
    `);
    
    client.release();
    
    return NextResponse.json({ 
      success: true, 
      payments: result.rows 
    });

  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch payments' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // TEMPORARY: Disable auth for testing
    // const currentUser = await getUserFromToken(request);
    // if (!currentUser) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    const currentUser = { id: 1 }; // Fake user for testing

    const { participantId, date, amount, currency, amountTRY, method, notes } = await request.json();

    if (!participantId || !date || !amount) {
      return NextResponse.json({ 
        error: 'Participant ID, date, and amount are required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        INSERT INTO payments (participant_id, date, amount, currency, amount_try, method, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING 
          id,
          participant_id as "participantId",
          date,
          amount,
          currency,
          amount_try as "amountTRY",
          method,
          notes,
          created_at,
          updated_at
      `, [participantId, date, amount, currency || 'TRY', amountTRY || amount, method || 'Nakit', notes || null]);

      client.release();

      return NextResponse.json({ 
        success: true, 
        message: 'Payment created successfully',
        payment: result.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json({ 
      error: 'Failed to create payment' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // TEMPORARY: Disable auth for testing
    // const currentUser = await getUserFromToken(request);
    // if (!currentUser) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    const currentUser = { id: 1 }; // Fake user for testing

    const { id, participantId, date, amount, currency, amountTRY, method, notes } = await request.json();

    if (!id || !participantId || !date || !amount) {
      return NextResponse.json({ 
        error: 'ID, participant ID, date, and amount are required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        UPDATE payments 
        SET participant_id = $1, date = $2, amount = $3, currency = $4, amount_try = $5, method = $6, notes = $7
        WHERE id = $8
        RETURNING 
          id,
          participant_id as "participantId",
          date,
          amount,
          currency,
          amount_try as "amountTRY",
          method,
          notes,
          created_at,
          updated_at
      `, [participantId, date, amount, currency || 'TRY', amountTRY || amount, method || 'Nakit', notes || null, id]);

      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Payment not found' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Payment updated successfully',
        payment: result.rows[0]
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Update payment error:', error);
    return NextResponse.json({ 
      error: 'Failed to update payment' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // TEMPORARY: Disable auth for testing
    // const currentUser = await getUserFromToken(request);
    // if (!currentUser) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    const currentUser = { id: 1 }; // Fake user for testing

    const url = new URL(request.url);
    const paymentId = url.searchParams.get('id');

    if (!paymentId) {
      return NextResponse.json({ 
        error: 'Payment ID is required' 
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(
        'DELETE FROM payments WHERE id = $1 RETURNING amount, method',
        [paymentId]
      );

      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Payment not found' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Payment deleted successfully'
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Delete payment error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete payment' 
    }, { status: 500 });
  }
}