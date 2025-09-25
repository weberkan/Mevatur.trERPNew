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
    
    const steps = []
    
    // Step 1: Create groups table first (no dependencies)
    steps.push("Creating groups table...")
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
          company_id INTEGER,
          archived_at TIMESTAMP WITH TIME ZONE,
          archive_path VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Step 2: Create rooms table (depends on groups)
    steps.push("Creating rooms table...")
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          group_id UUID,
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
    
    // Step 3: Create participants table (depends on groups and rooms)
    steps.push("Creating participants table...")
    await client.query(`
      CREATE TABLE IF NOT EXISTS participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          group_id UUID,
          full_name VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          email VARCHAR(100),
          id_number VARCHAR(11),
          passport_no VARCHAR(20),
          passport_valid_until DATE,
          birth_date DATE,
          gender VARCHAR(10),
          room_type VARCHAR(50),
          day_count INTEGER DEFAULT 7,
          discount DECIMAL(10,2) DEFAULT 0.00,
          room_id UUID,
          reference VARCHAR(100),
          total_amount DECIMAL(10,2) DEFAULT 0.00,
          paid_amount DECIMAL(10,2) DEFAULT 0.00,
          remaining_amount DECIMAL(10,2) DEFAULT 0.00,
          status VARCHAR(20) DEFAULT 'registered',
          registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Step 4: Create payments table (depends on participants and groups)  
    steps.push("Creating payments table...")
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          participant_id UUID,
          group_id UUID,
          amount DECIMAL(10,2) NOT NULL,
          payment_type VARCHAR(20) DEFAULT 'cash',
          payment_date DATE DEFAULT CURRENT_DATE,
          currency VARCHAR(3) DEFAULT 'TRY',
          amount_try DECIMAL(10,2),
          method VARCHAR(50) DEFAULT 'Nakit',
          description TEXT,
          receipt_number VARCHAR(50),
          notes TEXT,
          created_by INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Step 5: Create expenses table (depends on groups)
    steps.push("Creating expenses table...")
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          group_id UUID,
          category VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          expense_date DATE DEFAULT CURRENT_DATE,
          vendor VARCHAR(100),
          invoice_number VARCHAR(50),
          payment_method VARCHAR(20) DEFAULT 'cash',
          receipt_number VARCHAR(50),
          is_paid BOOLEAN DEFAULT false,
          paid_date DATE,
          notes TEXT,
          created_by INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Step 6: Create company_entries table (depends on groups)
    steps.push("Creating company_entries table...")
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entry_type VARCHAR(20) NOT NULL,
          category VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          entry_date DATE DEFAULT CURRENT_DATE,
          reference_number VARCHAR(50),
          group_id UUID,
          created_by INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Step 7: Create rates table (no dependencies)
    steps.push("Creating rates table...")
    await client.query(`
      CREATE TABLE IF NOT EXISTS rates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          from_currency VARCHAR(3) NOT NULL,
          to_currency VARCHAR(3) NOT NULL,
          rate DECIMAL(10,4) NOT NULL,
          rate_date DATE DEFAULT CURRENT_DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Step 8: Add indexes
    steps.push("Creating indexes...")
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
      CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(type);
      CREATE INDEX IF NOT EXISTS idx_participants_group_id ON participants(group_id);
      CREATE INDEX IF NOT EXISTS idx_payments_group_id ON payments(group_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
      CREATE INDEX IF NOT EXISTS idx_rooms_group_id ON rooms(group_id);
    `)
    
    // Step 9: Add default data
    steps.push("Inserting default rates...")
    await client.query(`
      INSERT INTO rates (from_currency, to_currency, rate) VALUES 
      ('USD', 'TRY', 32.50),
      ('EUR', 'TRY', 35.20), 
      ('SAR', 'TRY', 8.67),
      ('TRY', 'TRY', 1.00)
      ON CONFLICT DO NOTHING;
    `)
    
    // Step 10: Create triggers
    steps.push("Creating triggers...")
    await client.query(`
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
    `)
    
    steps.push("Database setup completed successfully!")
    
    return NextResponse.json({
      success: true,
      message: 'Step-by-step database setup completed successfully!',
      steps: steps,
      note: 'All tables created without foreign key constraints to avoid dependency issues'
    })

  } catch (error) {
    console.error('Step by step database setup error:', error)
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