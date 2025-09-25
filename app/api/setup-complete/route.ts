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
    
    // Complete database setup script - all tables needed for production
    const setupSQL = `
-- ========================================
-- COMPLETE MEVA ERP DATABASE SETUP
-- ========================================

-- Drop existing tables if needed (careful!)
-- DROP TABLE IF EXISTS participant_payments CASCADE;
-- DROP TABLE IF EXISTS group_expenses CASCADE;
-- DROP TABLE IF EXISTS group_incomes CASCADE;
-- DROP TABLE IF EXISTS participants CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS expenses CASCADE;
-- DROP TABLE IF EXISTS rooms CASCADE;
-- DROP TABLE IF EXISTS company_entries CASCADE;
-- DROP TABLE IF EXISTS rates CASCADE;
-- DROP TABLE IF EXISTS groups CASCADE;

-- Groups table (main entity)
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'Hac', -- 'Hac', 'Umre', 'Gezi'
    start_date DATE,
    end_date DATE,
    capacity INTEGER DEFAULT 50,
    currency VARCHAR(3) DEFAULT 'TRY', -- 'TRY', 'USD', 'SAR'
    fees_by_duration JSONB DEFAULT '{}',
    notes TEXT,
    status VARCHAR(20) DEFAULT 'planning', -- 'planning', 'active', 'completed', 'archived', 'cancelled'
    guide_name VARCHAR(100),
    guide_phone VARCHAR(20),
    total_price DECIMAL(12,2) DEFAULT 0.00,
    created_by INTEGER REFERENCES users(id),
    company_id INTEGER REFERENCES companies(id),
    archived_at TIMESTAMP WITH TIME ZONE,
    archive_path VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    id_number VARCHAR(11), -- TC No
    passport_no VARCHAR(20),
    passport_valid_until DATE,
    birth_date DATE,
    gender VARCHAR(10), -- 'erkek', 'kadın'
    room_type VARCHAR(50), -- 'tekli', 'ikili', 'üçlü', 'dörtlü'
    day_count INTEGER DEFAULT 7,
    discount DECIMAL(10,2) DEFAULT 0.00,
    room_id UUID REFERENCES rooms(id),
    reference VARCHAR(100),
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    remaining_amount DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'registered', -- 'registered', 'confirmed', 'cancelled'
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    room_type VARCHAR(50) NOT NULL, -- 'single', 'double', 'triple', 'quad'
    hotel_name VARCHAR(100),
    capacity INTEGER DEFAULT 1,
    price_per_person DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(20) DEFAULT 'cash', -- 'cash', 'card', 'transfer', 'other'
    payment_date DATE DEFAULT CURRENT_DATE,
    currency VARCHAR(3) DEFAULT 'TRY',
    amount_try DECIMAL(10,2), -- TRY equivalent
    method VARCHAR(50) DEFAULT 'Nakit', -- Payment method
    description TEXT,
    receipt_number VARCHAR(50),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'ulaşım', 'konaklama', 'yemek', 'rehberlik', 'sigorta', 'diğer'
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    vendor VARCHAR(100),
    invoice_number VARCHAR(50),
    payment_method VARCHAR(20) DEFAULT 'cash', -- 'cash', 'card', 'transfer', 'other'
    receipt_number VARCHAR(50),
    is_paid BOOLEAN DEFAULT false,
    paid_date DATE,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Company entries table (for company-wide income/expense tracking)
CREATE TABLE IF NOT EXISTS company_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type VARCHAR(20) NOT NULL, -- 'income', 'expense'
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    entry_date DATE DEFAULT CURRENT_DATE,
    reference_number VARCHAR(50),
    group_id UUID REFERENCES groups(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rates table (for currency exchange)
CREATE TABLE IF NOT EXISTS rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL, -- 'USD', 'EUR', 'SAR'
    to_currency VARCHAR(3) NOT NULL, -- 'TRY'
    rate DECIMAL(10,4) NOT NULL,
    rate_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(type);
CREATE INDEX IF NOT EXISTS idx_groups_start_date ON groups(start_date);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at);

CREATE INDEX IF NOT EXISTS idx_participants_group_id ON participants(group_id);
CREATE INDEX IF NOT EXISTS idx_participants_id_number ON participants(id_number);
CREATE INDEX IF NOT EXISTS idx_participants_full_name ON participants(full_name);

CREATE INDEX IF NOT EXISTS idx_payments_participant_id ON payments(participant_id);
CREATE INDEX IF NOT EXISTS idx_payments_group_id ON payments(group_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);

CREATE INDEX IF NOT EXISTS idx_rooms_group_id ON rooms(group_id);
CREATE INDEX IF NOT EXISTS idx_company_entries_group_id ON company_entries(group_id);
CREATE INDEX IF NOT EXISTS idx_company_entries_entry_date ON company_entries(entry_date);

-- Triggers for updated_at fields
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants  
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default rates
INSERT INTO rates (from_currency, to_currency, rate) VALUES 
('USD', 'TRY', 32.50),
('EUR', 'TRY', 35.20),
('SAR', 'TRY', 8.67),
('TRY', 'TRY', 1.00)
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Complete database schema setup successful!' as message;
    `;

    // Execute the complete setup
    await client.query(setupSQL);

    // Get final table list and counts
    const tablesResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);

    return NextResponse.json({
      success: true,
      message: 'Complete production database setup completed successfully!',
      tables: tablesResult.rows,
      note: 'All tables created with proper relationships, indexes, and triggers'
    });

  } catch (error) {
    console.error('Complete database setup error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}