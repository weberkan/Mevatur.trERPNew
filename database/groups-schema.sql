-- Grup Yönetimi Sistem Şeması
-- Hac/Umre grupları, katılımcılar, ödemeler ve arşivleme için

-- Gruplar tablosu
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'hac', -- 'hac', 'umre', 'diger'
    description TEXT,
    start_date DATE,
    end_date DATE,
    max_participants INTEGER DEFAULT 50,
    guide_name VARCHAR(100),
    guide_phone VARCHAR(20),
    total_price DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'planning', -- 'planning', 'active', 'completed', 'archived', 'cancelled'
    created_by INTEGER REFERENCES users(id),
    company_id INTEGER REFERENCES companies(id),
    archived_at TIMESTAMP WITH TIME ZONE,
    archive_path VARCHAR(255), -- Arşiv klasörü yolu
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Katılımcılar tablosu
CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    tc_no VARCHAR(11) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(10), -- 'erkek', 'kadın'
    passport_no VARCHAR(20),
    passport_expiry DATE,
    medical_notes TEXT,
    room_preference VARCHAR(50), -- 'tekli', 'ikili', 'üçlü', 'dörtlü'
    room_number VARCHAR(10),
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    remaining_amount DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'registered', -- 'registered', 'confirmed', 'cancelled'
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- Grup gelirleri tablosu (katılımcı ödemeleri dışında)
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

-- Grup arşiv kayıtları
CREATE TABLE IF NOT EXISTS group_archives (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    archive_name VARCHAR(100) NOT NULL,
    archive_path VARCHAR(255) NOT NULL,
    file_count INTEGER DEFAULT 0,
    total_size_mb DECIMAL(8,2) DEFAULT 0,
    archived_by INTEGER REFERENCES users(id),
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
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
CREATE INDEX IF NOT EXISTS idx_group_expenses_category ON group_expenses(category);
CREATE INDEX IF NOT EXISTS idx_group_incomes_group_id ON group_incomes(group_id);
CREATE INDEX IF NOT EXISTS idx_group_archives_group_id ON group_archives(group_id);

-- Trigger'lar için updated_at fonksiyonu zaten mevcut, sadece trigger'ları ekleyelim
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Katılımcı kalan tutarını otomatik hesaplama trigger'ı
CREATE OR REPLACE FUNCTION update_participant_remaining_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Toplam ödenen tutarı hesapla
    SELECT COALESCE(SUM(amount), 0) INTO NEW.paid_amount
    FROM participant_payments 
    WHERE participant_id = NEW.id;
    
    -- Kalan tutarı hesapla
    NEW.remaining_amount = NEW.total_amount - NEW.paid_amount;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ödeme eklendiğinde katılımcının kalan tutarını güncelle
CREATE OR REPLACE FUNCTION update_participant_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE participants 
    SET 
        paid_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM participant_payments 
            WHERE participant_id = NEW.participant_id
        ),
        remaining_amount = total_amount - (
            SELECT COALESCE(SUM(amount), 0) 
            FROM participant_payments 
            WHERE participant_id = NEW.participant_id
        )
    WHERE id = NEW.participant_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_participant_balance 
    AFTER INSERT OR UPDATE OR DELETE ON participant_payments
    FOR EACH ROW EXECUTE FUNCTION update_participant_balance_on_payment();