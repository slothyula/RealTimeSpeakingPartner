-- =============================================================================
-- MULTILANGUAGE SUPPORT MIGRATION
-- Bu script, projeyi çok dilli destek için günceller
-- =============================================================================

USE speaking_partner;

-- =============================================================================
-- 1. USERS Tablosuna target_language kolonu ekle
-- =============================================================================
-- Kullanıcının öğrenmek istediği dil (hedef dil)
ALTER TABLE users 
ADD COLUMN target_language VARCHAR(50) DEFAULT 'English' AFTER native_language,
ADD INDEX idx_target_language (target_language);

-- Mevcut kayıtları güncelle (varsayılan İngilizce)
UPDATE users SET target_language = 'English' WHERE target_language IS NULL;

-- =============================================================================
-- 2. TOPICS Tablosuna target_language kolonu ekle
-- =============================================================================
-- Bu topic hangi dil için konuşma pratiği yapılıyor
ALTER TABLE topics 
ADD COLUMN target_language VARCHAR(50) DEFAULT 'English' AFTER difficulty,
ADD INDEX idx_target_language (target_language);

-- Mevcut kayıtları güncelle (varsayılan İngilizce)
UPDATE topics SET target_language = 'English' WHERE target_language IS NULL;

-- =============================================================================
-- 3. CONVERSATIONS Tablosuna target_language kolonu ekle (opsiyonel - analiz için)
-- =============================================================================
-- Bu konuşma hangi dil için yapıldı
ALTER TABLE conversations 
ADD COLUMN target_language VARCHAR(50) DEFAULT 'English' AFTER topic_id,
ADD INDEX idx_target_language (target_language);

-- Mevcut kayıtları güncelle
UPDATE conversations SET target_language = 'English' WHERE target_language IS NULL;

-- =============================================================================
-- NOT: Desteklenen diller (ISO 639-1 kodları veya tam isimler)
-- =============================================================================
-- 'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 
-- 'Russian', 'Chinese', 'Japanese', 'Korean', 'Turkish', 'Arabic', vb.
-- 
-- Frontend'de bu dillerin listesi gösterilecek ve kullanıcı seçim yapabilecek
-- =============================================================================



