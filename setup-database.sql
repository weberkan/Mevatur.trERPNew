-- Complete database setup for production
-- Run this file with: psql -h host -U user -d database < setup-database.sql

-- Meva ERP Database Schema
-- Created for authentication and user management system

-- Roles tablosu (sistem rolleri)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users tablosu (kullanıcı bilgileri)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Sessions tablosu (JWT token yönetimi)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Company/Organization tablosu (gelecekte multi-tenant için)
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User-Company ilişkisi (gelecekte multi-company desteği için)
CREATE TABLE IF NOT EXISTS user_companies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, company_id)
);

-- Audit log tablosu (kullanıcı aktivitelerini takip için)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at fields
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================================
-- INITIAL DATA (SEEDS)
-- ======================================

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES 
('admin', 'System Administrator', '{"users": {"create": true, "read": true, "update": true, "delete": true}, "companies": {"create": true, "read": true, "update": true, "delete": true}, "reports": {"create": true, "read": true, "update": true, "delete": true}}'),
('manager', 'Manager Role', '{"users": {"create": true, "read": true, "update": true, "delete": false}, "companies": {"create": false, "read": true, "update": true, "delete": false}, "reports": {"create": true, "read": true, "update": true, "delete": false}}'),
('user', 'Standard User', '{"users": {"create": false, "read": true, "update": false, "delete": false}, "companies": {"create": false, "read": true, "update": false, "delete": false}, "reports": {"create": true, "read": true, "update": true, "delete": false}}'),
('viewer', 'Read Only User', '{"users": {"create": false, "read": true, "update": false, "delete": false}, "companies": {"create": false, "read": true, "update": false, "delete": false}, "reports": {"create": false, "read": true, "update": false, "delete": false}}')
ON CONFLICT (name) DO NOTHING;

-- Insert default company
INSERT INTO companies (name, code, address, phone, email, website) VALUES 
('Meva Turizm', 'MEVA', 'İstanbul, Türkiye', '+90 212 XXX XX XX', 'info@meva.com', 'https://meva.com')
ON CONFLICT (code) DO NOTHING;

-- Insert admin user (password: Ptt2026Meva+- - hashed with bcrypt)
-- Note: Change this password if needed
INSERT INTO users (username, email, password_hash, full_name, role_id, is_active) VALUES 
('admin', 'admin@meva.com', '$2b$12$b/94JmhjkputElp9NIROO.4QYotzzUnk2kNhMiX4KDYMWWE0c95Ga', 'System Administrator',
 (SELECT id FROM roles WHERE name = 'admin'), true)
ON CONFLICT (username) DO NOTHING;

-- Insert admin into default company
INSERT INTO user_companies (user_id, company_id, is_default) VALUES 
((SELECT id FROM users WHERE username = 'admin'), (SELECT id FROM companies WHERE code = 'MEVA'), true)
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Verify setup
SELECT 'Database setup complete!' as status;
SELECT 'Users created:' as info, count(*) as count FROM users;
SELECT 'Roles created:' as info, count(*) as count FROM roles;
SELECT 'Companies created:' as info, count(*) as count FROM companies;