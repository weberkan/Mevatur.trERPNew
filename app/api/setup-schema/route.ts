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
    
    // Execute schema in proper order to handle foreign key constraints
    
    // First, create tables without foreign key constraints
    await client.query(`
      -- Gruplar tablosu (API compatible)
      CREATE TABLE IF NOT EXISTS groups (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          type VARCHAR(20) DEFAULT 'hac',
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
          company_id INTEGER,
          archived_at TIMESTAMP WITH TIME ZONE,
          archive_path VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    await client.query(`
      -- Katılımcılar tablosu  
      CREATE TABLE IF NOT EXISTS participants (
          id SERIAL PRIMARY KEY,
          group_id INTEGER,
          tc_no VARCHAR(11) UNIQUE,
          full_name VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          email VARCHAR(100),
          emergency_contact VARCHAR(100),
          emergency_phone VARCHAR(20),
          birth_date DATE,
          gender VARCHAR(10),
          passport_no VARCHAR(20),
          passport_expiry DATE,
          medical_notes TEXT,
          room_preference VARCHAR(50),
          room_number VARCHAR(10),
          total_amount DECIMAL(10,2) DEFAULT 0.00,
          paid_amount DECIMAL(10,2) DEFAULT 0.00,
          remaining_amount DECIMAL(10,2) DEFAULT 0.00,
          status VARCHAR(20) DEFAULT 'registered',
          registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    await client.query(`
      -- Katılımcı ödemeleri tablosu
      CREATE TABLE IF NOT EXISTS participant_payments (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(20) DEFAULT 'nakit', -- 'nakit', 'kart', 'havale', 'eft'
    payment_date DATE DEFAULT CURRENT_DATE,
    installment_number INTEGER DEFAULT 1,
    description TEXT,
    receipt_number VARCHAR(50),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Grup giderleri tablosu
CREATE TABLE IF NOT EXISTS group_expenses (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'ulasim', 'konaklama', 'yemek', 'rehberlik', 'sigorta', 'diger'
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    vendor_name VARCHAR(100),
    invoice_number VARCHAR(50),
    payment_method VARCHAR(20) DEFAULT 'nakit', -- 'nakit', 'kart', 'havale', 'eft'
    is_paid BOOLEAN DEFAULT false,
    paid_date DATE,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Grup gelirleri tablosu
CREATE TABLE IF NOT EXISTS group_incomes (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL, -- 'sponsor', 'bagis', 'ek_hizmet', 'diger'
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    income_date DATE DEFAULT CURRENT_DATE,
    source_contact VARCHAR(100),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Oda yönetimi tablosu
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    room_type VARCHAR(50) NOT NULL, -- 'single', 'double', 'triple', 'quad'
    hotel_name VARCHAR(100),
    capacity INTEGER DEFAULT 1,
    price_per_person DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ödeme takibi tablosu
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER REFERENCES participants(id),
    group_id INTEGER REFERENCES groups(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(20) DEFAULT 'cash', -- 'cash', 'card', 'transfer', 'other'
    payment_date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    receipt_number VARCHAR(50),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Gider takibi tablosu
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id),
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    vendor VARCHAR(100),
    receipt_number VARCHAR(50),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Şirket kayıtları tablosu
CREATE TABLE IF NOT EXISTS company_entries (
    id SERIAL PRIMARY KEY,
    entry_type VARCHAR(20) NOT NULL, -- 'income', 'expense'
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    entry_date DATE DEFAULT CURRENT_DATE,
    reference_number VARCHAR(50),
    group_id INTEGER REFERENCES groups(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rates tablosu (kur bilgileri için)
CREATE TABLE IF NOT EXISTS rates (
    id SERIAL PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(10,4) NOT NULL,
    rate_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(type);
CREATE INDEX IF NOT EXISTS idx_groups_start_date ON groups(start_date);
CREATE INDEX IF NOT EXISTS idx_participants_group_id ON participants(group_id);
CREATE INDEX IF NOT EXISTS idx_participants_tc_no ON participants(tc_no);
CREATE INDEX IF NOT EXISTS idx_participant_payments_participant_id ON participant_payments(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_payments_group_id ON participant_payments(group_id);
CREATE INDEX IF NOT EXISTS idx_group_expenses_group_id ON group_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_group_incomes_group_id ON group_incomes(group_id);
CREATE INDEX IF NOT EXISTS idx_rooms_group_id ON rooms(group_id);
CREATE INDEX IF NOT EXISTS idx_payments_participant_id ON payments(participant_id);
CREATE INDEX IF NOT EXISTS idx_payments_group_id ON payments(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_company_entries_group_id ON company_entries(group_id);

-- Trigger'lar
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants  
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `

    // Execute the schema
    await client.query(schemaSQL)
    
    // Check created tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    // Count records in each table
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
      message: 'Complete database schema applied successfully',
      tables: tableStats
    })

  } catch (error) {
    console.error('Schema setup error:', error)
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