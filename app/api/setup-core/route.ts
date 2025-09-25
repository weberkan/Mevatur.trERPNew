import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
})

export async function GET() {
  let client
  
  try {
    client = await pool.connect()
    
    // Create core tables in order
    await client.query(`
      -- Groups table (core for group management)
      CREATE TABLE IF NOT EXISTS groups (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          type VARCHAR(20) DEFAULT 'Hac',
          start_date DATE,
          end_date DATE,
          capacity INTEGER DEFAULT 50,
          currency VARCHAR(3) DEFAULT 'TRY',
          fees_by_duration JSONB DEFAULT '{}',
          notes TEXT,
          status VARCHAR(20) DEFAULT 'planning',
          guide_name VARCHAR(100),
          guide_phone VARCHAR(20),
          total_price DECIMAL(12,2) DEFAULT 0.00,
          created_by INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    await client.query(`
      -- Participants table
      CREATE TABLE IF NOT EXISTS participants (
          id SERIAL PRIMARY KEY,
          group_id INTEGER,
          tc_no VARCHAR(11),
          full_name VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          email VARCHAR(100),
          birth_date DATE,
          gender VARCHAR(10),
          passport_no VARCHAR(20),
          passport_expiry DATE,
          room_preference VARCHAR(50),
          room_number VARCHAR(10),
          total_amount DECIMAL(10,2) DEFAULT 0.00,
          paid_amount DECIMAL(10,2) DEFAULT 0.00,
          remaining_amount DECIMAL(10,2) DEFAULT 0.00,
          status VARCHAR(20) DEFAULT 'registered',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    await client.query(`
      -- Payments table
      CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          participant_id INTEGER,
          group_id INTEGER,
          amount DECIMAL(10,2) NOT NULL,
          payment_type VARCHAR(20) DEFAULT 'cash',
          payment_date DATE DEFAULT CURRENT_DATE,
          description TEXT,
          receipt_number VARCHAR(50),
          created_by INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    await client.query(`
      -- Expenses table
      CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          group_id INTEGER,
          category VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          expense_date DATE DEFAULT CURRENT_DATE,
          vendor VARCHAR(100),
          receipt_number VARCHAR(50),
          created_by INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    await client.query(`
      -- Rooms table
      CREATE TABLE IF NOT EXISTS rooms (
          id SERIAL PRIMARY KEY,
          group_id INTEGER,
          room_number VARCHAR(20) NOT NULL,
          room_type VARCHAR(50) NOT NULL,
          hotel_name VARCHAR(100),
          capacity INTEGER DEFAULT 1,
          price_per_person DECIMAL(10,2) DEFAULT 0.00,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    await client.query(`
      -- Company entries table
      CREATE TABLE IF NOT EXISTS company_entries (
          id SERIAL PRIMARY KEY,
          entry_type VARCHAR(20) NOT NULL,
          category VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          entry_date DATE DEFAULT CURRENT_DATE,
          reference_number VARCHAR(50),
          group_id INTEGER,
          created_by INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    await client.query(`
      -- Rates table for currency exchange
      CREATE TABLE IF NOT EXISTS rates (
          id SERIAL PRIMARY KEY,
          from_currency VARCHAR(3) NOT NULL,
          to_currency VARCHAR(3) NOT NULL,
          rate DECIMAL(10,4) NOT NULL,
          rate_date DATE DEFAULT CURRENT_DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Add some basic indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
      CREATE INDEX IF NOT EXISTS idx_participants_group_id ON participants(group_id);
      CREATE INDEX IF NOT EXISTS idx_payments_group_id ON payments(group_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
      CREATE INDEX IF NOT EXISTS idx_rooms_group_id ON rooms(group_id);
    `)
    
    // Get table stats
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    const tableStats = []
    for (const table of tablesResult.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table.table_name}`)
        tableStats.push({
          table_name: table.table_name,
          record_count: parseInt(countResult.rows[0].count)
        })
      } catch (e) {
        tableStats.push({
          table_name: table.table_name,
          record_count: 'error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Core database tables created successfully',
      tables: tableStats
    })

  } catch (error) {
    console.error('Core schema setup error:', error)
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