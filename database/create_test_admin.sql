-- Test Admin Oluşturma Scripti
-- Password: admin123 (SHA256 hash: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9)

USE speaking_partner;

-- Önce mevcut admin'i sil (eğer varsa)
DELETE FROM admins WHERE username = 'admin';

-- Test admin oluştur
INSERT INTO admins (username, email, password_hash, full_name, role, is_active) 
VALUES (
    'admin',
    'admin@test.com',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',  -- admin123 SHA256 hash
    'Test Administrator',
    'super_admin',
    TRUE
);

-- Sonucu kontrol et
SELECT 
    admin_id,
    username,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM admins
WHERE username = 'admin';



