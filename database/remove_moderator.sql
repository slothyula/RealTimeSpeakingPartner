-- Moderator Admin Kaydını Silme Scripti
-- Role-based control kullanılmadığı için gereksiz moderator kaydını siler

USE speaking_partner;

-- Moderator kaydını sil
DELETE FROM admins WHERE username = 'moderator';

-- Sonucu kontrol et (sadece admin kalmalı)
SELECT 
    admin_id,
    username,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM admins
ORDER BY admin_id;



