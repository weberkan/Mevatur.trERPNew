-- Initial data for Meva ERP System
-- Run this after schema.sql

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