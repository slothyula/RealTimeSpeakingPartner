-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║     REAL-TIME SPEAKING PARTNER - MYSQL DATABASE SCHEMA                       ║
-- ║     Admin Panel Odaklı Veritabanı Tasarımı                                   ║
-- ║     XAMPP / phpMyAdmin Uyumlu                                                ║
-- ║     Created: 2026-01-09                                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- =============================================================================
-- VERITABANI OLUŞTURMA
-- =============================================================================
-- utf8mb4: Türkçe karakterler ve emojiler için gerekli
-- unicode_ci: Büyük/küçük harf duyarsız karşılaştırma

CREATE DATABASE IF NOT EXISTS speaking_partner
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE speaking_partner;

-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 1: USERS (Kullanıcılar)                                               │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Uygulamayı kullanan tüm kullanıcıların bilgilerini saklar.            │
-- │                                                                              │
-- │ ADMIN PANELİ İÇİN ÖNEMİ:                                                    │
-- │ - Tüm kullanıcıları listelemek                                              │
-- │ - Kullanıcı detaylarını görüntülemek                                        │
-- │ - Aktif/pasif kullanıcıları filtrelemek                                     │
-- │ - Seviyeye göre kullanıcı istatistikleri                                    │
-- │ - Kayıt tarihine göre sıralama ve filtreleme                                │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    -- PRIMARY KEY: Her kullanıcının benzersiz kimliği
    -- AUTO_INCREMENT: MySQL otomatik olarak 1, 2, 3... şeklinde arttırır
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Kullanıcının adı soyadı (zorunlu alan)
    -- VARCHAR(100): Maksimum 100 karakter
    name VARCHAR(100) NOT NULL,
    
    -- Email adresi (zorunlu ve benzersiz)
    -- UNIQUE: Aynı email ile iki kullanıcı olamaz
    email VARCHAR(255) NOT NULL UNIQUE,
    
    -- Şifre hash'i (bcrypt ile şifrelenmiş)
    -- Güvenlik: Asla düz şifre saklamayın!
    password_hash VARCHAR(255) NOT NULL,
    
    -- İngilizce seviyesi
    -- ENUM: Sadece belirtilen değerler kabul edilir
    -- Admin panelinde filtreleme için kullanışlı
    proficiency_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
    
    -- Ana dil (varsayılan Türkçe)
    native_language VARCHAR(50) DEFAULT 'Turkish',
    
    -- ═══ İSTATİSTİK ALANLARI (Admin Dashboard için) ═══
    -- Bu alanlar her işlemde güncellenir, böylece anlık istatistik alınabilir
    
    total_practice_minutes INT DEFAULT 0,    -- Toplam pratik süresi (dakika)
    total_conversations INT DEFAULT 0,        -- Toplam konuşma sayısı
    total_messages INT DEFAULT 0,             -- Toplam mesaj sayısı
    
    -- Kullanıcı aktif mi? (soft delete için)
    -- Admin panelinde aktif/pasif filtreleme
    is_active BOOLEAN DEFAULT TRUE,
    
    -- ═══ TARİH ALANLARI (Filtreleme ve Sıralama için) ═══
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,           -- Kayıt tarihi
    last_login_at TIMESTAMP NULL,                             -- Son giriş tarihi
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- ═══ INDEX'LER (Sorgu Performansı için) ═══
    -- Index: Veritabanının belirli sütunlarda hızlı arama yapmasını sağlar
    
    INDEX idx_email (email),                    -- Email ile arama
    INDEX idx_created_at (created_at),          -- Tarihe göre sıralama
    INDEX idx_is_active (is_active),            -- Aktif kullanıcıları filtreleme
    INDEX idx_proficiency (proficiency_level)   -- Seviyeye göre filtreleme
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 2: ADMINS (Yöneticiler)                                               │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Admin paneline giriş yapacak yöneticileri saklar.                     │
-- │                                                                              │
-- │ NEDEN AYRI TABLO?                                                           │
-- │ - Güvenlik: Adminler ve kullanıcılar farklı yetkilere sahip                 │
-- │ - Rol sistemi: super_admin, moderator, viewer                               │
-- │ - Adminler kullanıcı verilerini görür ama sahip olmaz                       │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Giriş için kullanıcı adı (benzersiz)
    username VARCHAR(50) NOT NULL UNIQUE,
    
    -- Email adresi
    email VARCHAR(255) NOT NULL UNIQUE,
    
    -- Şifre hash'i
    password_hash VARCHAR(255) NOT NULL,
    
    -- Tam ad (dashboard'da gösterilir)
    full_name VARCHAR(100) NOT NULL,
    
    -- Yetki seviyesi
    -- super_admin: Tam yetki (silme, düzenleme dahil)
    -- moderator: Görüntüleme + düzenleme
    -- viewer: Sadece görüntüleme
    role ENUM('super_admin', 'moderator', 'viewer') DEFAULT 'viewer',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 3: TOPICS (Konuşma Konuları)                                          │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Kullanıcıların pratik yapabileceği konuları saklar.                   │
-- │                                                                              │
-- │ ADMIN PANELİ İÇİN ÖNEMİ:                                                    │
-- │ - Yeni konular eklemek                                                       │
-- │ - Hangi konuların popüler olduğunu görmek (usage_count)                     │
-- │ - Konuları kategoriye ve zorluğa göre yönetmek                              │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS topics (
    topic_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Konu başlığı
    name VARCHAR(100) NOT NULL,
    
    -- Konu açıklaması
    -- TEXT: Uzun metinler için (65,535 karakter)
    description TEXT,
    
    -- Kategori (filtreleme için)
    -- Örnek: General, Professional, Travel, Academic
    category VARCHAR(50) NOT NULL,
    
    -- Zorluk seviyesi (kullanıcı seviyesiyle eşleştirmek için)
    difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
    
    -- Örnek sorular (JSON formatında)
    -- JSON: Esnek veri yapısı, dizi olarak sorular saklanabilir
    sample_questions JSON,
    
    -- Konu aktif mi?
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Kullanım sayısı (popülerlik için)
    -- Admin panelinde "En Popüler Konular" listesi için
    usage_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category),
    INDEX idx_difficulty (difficulty),
    INDEX idx_is_active (is_active),
    INDEX idx_usage_count (usage_count)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 4: CONVERSATIONS (Konuşmalar)                                         │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Kullanıcı ile AI arasındaki her konuşma oturumunu saklar.             │
-- │                                                                              │
-- │ İLİŞKİLER:                                                                   │
-- │ - Bir kullanıcının MANY konuşması olabilir (1:N)                            │
-- │ - Her konuşma bir konuya (topic) ait olabilir                               │
-- │                                                                              │
-- │ ADMIN PANELİ İÇİN ÖNEMİ:                                                    │
-- │ - Tüm konuşmaları listelemek                                                │
-- │ - Kullanıcıya göre filtrelemek                                              │
-- │ - Tarihe göre filtrelemek                                                    │
-- │ - Konuşma performans skorlarını görmek                                      │
-- │ - Konuşma durumunu takip etmek (aktif/tamamlanmış/terkedilmiş)             │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversations (
    conversation_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- ═══ İLİŞKİ ALANLARI (Foreign Keys) ═══
    
    -- Hangi kullanıcıya ait?
    -- NOT NULL: Her konuşmanın bir sahibi olmalı
    user_id INT NOT NULL,
    
    -- Hangi konuda? (opsiyonel)
    -- NULL olabilir: Serbest konuşma
    topic_id INT NULL,
    
    -- Konuşma başlığı (otomatik oluşturulabilir)
    title VARCHAR(255),
    
    -- ═══ DURUM ALANLARI ═══
    
    -- Konuşma durumu
    -- active: Devam ediyor
    -- completed: Tamamlandı
    -- abandoned: Yarıda bırakıldı
    status ENUM('active', 'completed', 'abandoned') DEFAULT 'active',
    
    -- Mesaj sayısı (hızlı istatistik için)
    -- Her mesaj eklendiğinde güncellenir
    message_count INT DEFAULT 0,
    
    -- Konuşma süresi (saniye)
    duration_seconds INT DEFAULT 0,
    
    -- ═══ PERFORMANS SKORLARI (0-100) ═══
    -- Admin panelinde kullanıcı performansını görmek için
    
    overall_score DECIMAL(5,2) DEFAULT NULL,        -- Genel skor
    grammar_score DECIMAL(5,2) DEFAULT NULL,        -- Gramer skoru
    fluency_score DECIMAL(5,2) DEFAULT NULL,        -- Akıcılık skoru
    
    -- ═══ TARİH ALANLARI ═══
    
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Başlangıç zamanı
    ended_at TIMESTAMP NULL,                         -- Bitiş zamanı (NULL = devam ediyor)
    
    -- ═══ FOREIGN KEY TANIMLARI ═══
    -- ON DELETE CASCADE: Kullanıcı silinirse konuşmaları da silinir
    -- ON DELETE SET NULL: Konu silinirse topic_id NULL olur
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE SET NULL,
    
    -- ═══ INDEX'LER ═══
    
    INDEX idx_user_id (user_id),              -- Kullanıcıya göre filtreleme
    INDEX idx_topic_id (topic_id),            -- Konuya göre filtreleme
    INDEX idx_status (status),                -- Duruma göre filtreleme
    INDEX idx_started_at (started_at),        -- Tarihe göre sıralama
    INDEX idx_user_date (user_id, started_at) -- Kullanıcı + tarih kombinasyonu
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 5: MESSAGES (Mesajlar)                                                │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Bir konuşma içindeki her mesajı (kullanıcı + AI) saklar.              │
-- │                                                                              │
-- │ İLİŞKİLER:                                                                   │
-- │ - Bir konuşmanın MANY mesajı olabilir (1:N)                                 │
-- │ - Her mesajın bir gönderen tipi var: user veya assistant                    │
-- │                                                                              │
-- │ ADMIN PANELİ İÇİN ÖNEMİ:                                                    │
-- │ - Konuşma detaylarında tüm mesajları görmek                                 │
-- │ - Gramer hatası olan mesajları işaretlemek                                  │
-- │ - AI yanıt sürelerini analiz etmek                                          │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Hangi konuşmaya ait?
    conversation_id INT NOT NULL,
    
    -- Gönderen tipi
    -- user: Kullanıcının mesajı
    -- assistant: AI'ın yanıtı
    sender_type ENUM('user', 'assistant') NOT NULL,
    
    -- Mesaj içeriği
    content TEXT NOT NULL,
    
    -- Ses dosyası URL'i (opsiyonel)
    -- Kullanıcı sesli mesaj gönderdiyse
    audio_url VARCHAR(500) DEFAULT NULL,
    
    -- Gramer hatası var mı?
    -- Admin panelinde hatalı mesajları filtrelemek için
    has_grammar_error BOOLEAN DEFAULT FALSE,
    
    -- AI yanıt süresi (milisaniye)
    -- Performans analizi için
    response_time_ms INT DEFAULT NULL,
    
    -- Mesaj zamanı
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    
    INDEX idx_conversation_id (conversation_id),  -- Konuşmaya göre mesajları getir
    INDEX idx_sender_type (sender_type),          -- Kullanıcı/AI mesajlarını filtrele
    INDEX idx_created_at (created_at),            -- Zamana göre sırala
    INDEX idx_has_error (has_grammar_error)       -- Hatalı mesajları filtrele
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 6: GRAMMAR_MISTAKES (Gramer Hataları)                                 │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Kullanıcıların yaptığı gramer hatalarını detaylı saklar.              │
-- │                                                                              │
-- │ ADMIN PANELİ İÇİN ÖNEMİ:                                                    │
-- │ - En sık yapılan hata türlerini görmek                                      │
-- │ - Kullanıcı bazlı hata analizi                                              │
-- │ - Tekrarlanan hataları tespit etmek                                         │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS grammar_mistakes (
    mistake_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Hangi mesajda yapıldı?
    message_id INT NOT NULL,
    
    -- Hangi kullanıcı yaptı? (hızlı sorgulama için)
    user_id INT NOT NULL,
    
    -- Orijinal (hatalı) metin
    original_text TEXT NOT NULL,
    
    -- Düzeltilmiş metin
    corrected_text TEXT NOT NULL,
    
    -- Hata türü
    -- Örnek: tense, article, preposition, word_order, spelling
    mistake_type VARCHAR(50),
    
    -- Açıklama (kullanıcıya gösterilecek)
    explanation TEXT,
    
    -- Bu hata daha önce yapıldı mı?
    -- Tekrarlanan hataları tespit etmek için
    was_repeated BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_user_id (user_id),           -- Kullanıcı hataları
    INDEX idx_mistake_type (mistake_type), -- Hata türüne göre filtreleme
    INDEX idx_created_at (created_at),     -- Tarihe göre sıralama
    INDEX idx_repeated (was_repeated)      -- Tekrarlanan hatalar
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 7: USER_SESSIONS (Oturum Takibi)                                      │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Kullanıcı giriş/çıkışlarını ve aktif oturumları takip eder.           │
-- │                                                                              │
-- │ ADMIN PANELİ İÇİN ÖNEMİ:                                                    │
-- │ - Şu an online olan kullanıcıları görmek                                    │
-- │ - Güvenlik: Şüpheli girişleri tespit etmek                                  │
-- │ - Kullanıcı aktivitesini izlemek                                            │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    
    user_id INT NOT NULL,
    
    -- Oturum token'ı (benzersiz)
    session_token VARCHAR(255) NOT NULL UNIQUE,
    
    -- IP adresi (güvenlik için)
    -- VARCHAR(45): IPv6 adreslerini de destekler
    ip_address VARCHAR(45),
    
    -- Tarayıcı bilgisi
    user_agent TEXT,
    
    -- Oturum aktif mi?
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Oturum bitiş zamanı (varsayılan: 24 saat sonra)
    expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 24 HOUR),
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_token (session_token),
    INDEX idx_is_active (is_active),
    INDEX idx_expires (expires_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 8: USER_PROGRESS (Kullanıcı İlerlemesi)                               │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Kullanıcının günlük ilerlemesini saklar (analitik için).              │
-- │                                                                              │
-- │ ADMIN PANELİ İÇİN ÖNEMİ:                                                    │
-- │ - Günlük/haftalık/aylık kullanım grafikleri                                 │
-- │ - Kullanıcı aktivite trendleri                                               │
-- │ - Performans değişimlerini izlemek                                          │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    
    user_id INT NOT NULL,
    
    -- Tarih (her gün için bir kayıt)
    date DATE NOT NULL,
    
    -- Günlük istatistikler
    practice_minutes INT DEFAULT 0,        -- O gün pratik süresi
    conversations_completed INT DEFAULT 0,  -- Tamamlanan konuşma sayısı
    messages_sent INT DEFAULT 0,            -- Gönderilen mesaj sayısı
    avg_score DECIMAL(5,2) DEFAULT NULL,    -- Ortalama skor
    grammar_mistakes_count INT DEFAULT 0,   -- Yapılan hata sayısı
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Her kullanıcı için her gün tek kayıt olmalı
    UNIQUE KEY unique_user_date (user_id, date),
    
    INDEX idx_user_id (user_id),
    INDEX idx_date (date)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 9: ADMIN_ACTIVITY_LOG (Admin İşlem Geçmişi)                           │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Adminlerin yaptığı işlemleri loglar (audit trail).                    │
-- │                                                                              │
-- │ GÜVENLİK İÇİN ÖNEMİ:                                                        │
-- │ - Kim ne zaman ne yaptı?                                                    │
-- │ - Şüpheli aktiviteleri tespit etmek                                         │
-- │ - Hesap verebilirlik                                                        │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_activity_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    
    admin_id INT NOT NULL,
    
    -- İşlem türü
    action_type ENUM('login', 'logout', 'view', 'create', 'update', 'delete') NOT NULL,
    
    -- Hangi tablo üzerinde işlem yapıldı?
    target_table VARCHAR(50),
    
    -- Hangi kayıt üzerinde? (örn: user_id=5)
    target_id INT,
    
    -- İşlem detayları (JSON formatında)
    details JSON,
    
    -- IP adresi
    ip_address VARCHAR(45),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE CASCADE,
    
    INDEX idx_admin_id (admin_id),
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at),
    INDEX idx_target (target_table, target_id)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║                           ÖRNEK VERİLER                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
-- =============================================================================

-- ═══ ADMIN KULLANICISI ═══
-- Not: Role-based control kullanılmadığı için sadece bir admin kaydı yeterli
-- Admin password'u SHA256 ile hash'lenmiş olmalı: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9 (admin123)
-- Test admin oluşturmak için: npm run create-admin

-- ═══ KONULAR ═══
INSERT INTO topics (name, description, category, difficulty, sample_questions) VALUES
('Daily Conversations', 
 'Practice everyday English conversations about daily routines, weather, and common situations.', 
 'General', 'beginner', 
 '["How was your day?", "What did you have for breakfast?", "What are your plans for the weekend?"]'),
 
('Business English', 
 'Professional English for meetings, presentations, and workplace communication.', 
 'Professional', 'advanced',
 '["Can you tell me about your work experience?", "What challenges have you faced in your career?", "How do you handle difficult clients?"]'),
 
('Travel and Tourism', 
 'English for travelers - booking hotels, asking directions, and exploring new places.', 
 'Travel', 'intermediate',
 '["Have you traveled abroad?", "What is your favorite destination?", "How do you plan your trips?"]'),
 
('Academic Discussions', 
 'English for academic purposes - discussing research, giving opinions, and debating topics.', 
 'Academic', 'advanced',
 '["What do you think about climate change?", "Can you summarize a recent article you read?", "What is your opinion on online education?"]'),

('Food and Cooking', 
 'Talk about cuisines, recipes, restaurants, and food culture.', 
 'Lifestyle', 'beginner',
 '["What is your favorite food?", "Can you cook?", "Have you tried any exotic cuisines?"]'),

('Movies and Entertainment', 
 'Discuss films, TV shows, music, and pop culture.', 
 'Entertainment', 'intermediate',
 '["What is the last movie you watched?", "Who is your favorite actor?", "Do you prefer movies or TV series?"]'),

('Health and Fitness', 
 'Conversations about exercise, healthy lifestyle, and wellness.', 
 'Health', 'intermediate',
 '["Do you exercise regularly?", "What do you do to stay healthy?", "Have you tried any sports?"]'),

('Technology', 
 'Discuss gadgets, apps, social media, and tech trends.', 
 'Technology', 'intermediate',
 '["What smartphone do you use?", "How has technology changed your life?", "What do you think about AI?"]');

-- ═══ TEST KULLANICILARI ═══
INSERT INTO users (name, email, password_hash, proficiency_level, native_language, total_conversations, total_messages) VALUES
('Test User', 'test@example.com', '$2b$10$example_hashed_password', 'intermediate', 'Turkish', 5, 47),
('Ahmet Yılmaz', 'ahmet@example.com', '$2b$10$example_hashed_password', 'beginner', 'Turkish', 3, 25),
('Zeynep Kaya', 'zeynep@example.com', '$2b$10$example_hashed_password', 'advanced', 'Turkish', 12, 156);

-- ═══ ÖRNEK KONUŞMALAR ═══
INSERT INTO conversations (user_id, topic_id, title, status, message_count, duration_seconds, overall_score) VALUES
(1, 1, 'Morning Routine Discussion', 'completed', 8, 420, 75.50),
(1, 3, 'Planning a Trip to London', 'completed', 12, 680, 82.00),
(2, 5, 'My Favorite Foods', 'completed', 6, 320, 68.25),
(3, 2, 'Job Interview Practice', 'completed', 15, 890, 91.50);

-- ═══ ÖRNEK MESAJLAR ═══
INSERT INTO messages (conversation_id, sender_type, content, has_grammar_error) VALUES
(1, 'assistant', 'Hello! Let''s talk about your daily routine. What time do you usually wake up?', FALSE),
(1, 'user', 'I wake up at 7 oclock every day.', TRUE),
(1, 'assistant', 'Great! I noticed a small thing - we usually write "7 o''clock" with an apostrophe. What do you do after waking up?', FALSE),
(1, 'user', 'First, I take a shower and then I have breakfast.', FALSE),
(2, 'assistant', 'Let''s plan a trip to London! Have you ever been there before?', FALSE),
(2, 'user', 'No, I have never been to London but I want to go there.', FALSE);

-- ═══ ÖRNEK GRAMER HATALARI ═══
INSERT INTO grammar_mistakes (message_id, user_id, original_text, corrected_text, mistake_type, explanation) VALUES
(2, 1, '7 oclock', '7 o''clock', 'punctuation', 'In English, "o''clock" is written with an apostrophe.');


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 10: FLUENCY_SCORES (Akıcılık Değerlendirmesi)                         │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Kullanıcının konuşma akıcılığını detaylı ölçer.                       │
-- │                                                                              │
-- │ FR11: Konuşma hızı, duraksama ve tutarlılık ölçümü                          │
-- │                                                                              │
-- │ ÖLÇÜLEN METRIKLER:                                                          │
-- │ - Words per minute (dakikada kelime)                                        │
-- │ - Pause count (duraksama sayısı)                                            │
-- │ - Filler words (ıı, ee, hmm gibi dolgu kelimeler)                           │
-- │ - Coherence score (tutarlılık skoru)                                        │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS fluency_scores (
    fluency_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Hangi mesaja ait?
    message_id INT NOT NULL,
    
    -- Hangi kullanıcı? (hızlı sorgulama için)
    user_id INT NOT NULL,
    
    -- Hangi konuşmaya ait?
    conversation_id INT NOT NULL,
    
    -- ═══ AKICILIK METRİKLERİ ═══
    
    -- Dakikada kelime sayısı (normal: 120-150 WPM)
    words_per_minute DECIMAL(5,2) DEFAULT NULL,
    
    -- Toplam duraksama sayısı
    pause_count INT DEFAULT 0,
    
    -- Toplam duraksama süresi (saniye)
    total_pause_duration DECIMAL(6,2) DEFAULT 0,
    
    -- Dolgu kelime sayısı (uh, um, ee, ıı)
    filler_word_count INT DEFAULT 0,
    
    -- Kullanılan dolgu kelimeler (JSON array)
    filler_words_used JSON,
    
    -- Cümle tamamlama oranı (0-100)
    sentence_completion_rate DECIMAL(5,2) DEFAULT NULL,
    
    -- Tutarlılık skoru (0-100)
    coherence_score DECIMAL(5,2) DEFAULT NULL,
    
    -- Genel akıcılık skoru (0-100)
    overall_fluency_score DECIMAL(5,2) DEFAULT NULL,
    
    -- Konuşma süresi (saniye)
    speech_duration_seconds DECIMAL(6,2) DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_fluency_score (overall_fluency_score),
    INDEX idx_created_at (created_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 11: VOCABULARY_USAGE (Kelime Kullanımı)                               │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Kullanıcının kelime dağarcığını ve kullanım kalıplarını takip eder.   │
-- │                                                                              │
-- │ FR19: Alternatif ifade ve kelime önerileri                                  │
-- │                                                                              │
-- │ KULLANIM ALANLARI:                                                          │
-- │ - Kelime çeşitliliği analizi                                                │
-- │ - Sık kullanılan kelimeler                                                   │
-- │ - Seviyeye uygun kelime önerileri                                           │
-- │ - Vocabulary growth tracking                                                 │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS vocabulary_usage (
    vocab_id INT AUTO_INCREMENT PRIMARY KEY,
    
    user_id INT NOT NULL,
    
    -- Kullanılan kelime
    word VARCHAR(100) NOT NULL,
    
    -- Kelimenin kökü (lemma)
    word_lemma VARCHAR(100),
    
    -- Kelime türü (noun, verb, adjective, etc.)
    part_of_speech ENUM('noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'other') DEFAULT 'other',
    
    -- Kelime seviyesi (CEFR)
    word_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') DEFAULT NULL,
    
    -- Kullanım sayısı
    usage_count INT DEFAULT 1,
    
    -- Doğru kullanım sayısı
    correct_usage_count INT DEFAULT 0,
    
    -- Yanlış kullanım sayısı
    incorrect_usage_count INT DEFAULT 0,
    
    -- İlk kullanım tarihi
    first_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Son kullanım tarihi
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Önerilen alternatif kelimeler (JSON array)
    suggested_alternatives JSON,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Her kullanıcı için her kelime benzersiz
    UNIQUE KEY unique_user_word (user_id, word),
    
    INDEX idx_user_id (user_id),
    INDEX idx_word (word),
    INDEX idx_usage_count (usage_count),
    INDEX idx_word_level (word_level)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 12: USER_FEEDBACK (Kullanıcı Geri Bildirimi)                          │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: AI yanıtlarına kullanıcı geri bildirimi toplar.                       │
-- │                                                                              │
-- │ FR20: AI yanıtlarını beğenme/puanlama                                       │
-- │                                                                              │
-- │ KULLANIM ALANLARI:                                                          │
-- │ - AI kalitesini iyileştirme                                                 │
-- │ - Kişiselleştirme                                                           │
-- │ - Kullanıcı memnuniyeti ölçümü                                              │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    
    user_id INT NOT NULL,
    
    -- Hangi mesaja geri bildirim?
    message_id INT NOT NULL,
    
    -- Hangi konuşmada?
    conversation_id INT NOT NULL,
    
    -- ═══ GERİ BİLDİRİM TİPLERİ ═══
    
    -- Beğeni durumu (like/dislike/neutral)
    rating_type ENUM('like', 'dislike', 'neutral') DEFAULT 'neutral',
    
    -- Yıldız puanı (1-5)
    star_rating TINYINT CHECK (star_rating >= 1 AND star_rating <= 5),
    
    -- Geri bildirim kategorisi
    feedback_category ENUM(
        'helpful',           -- Yardımcı oldu
        'not_helpful',       -- Yardımcı olmadı
        'too_fast',          -- Çok hızlı
        'too_slow',          -- Çok yavaş
        'too_difficult',     -- Çok zor
        'too_easy',          -- Çok kolay
        'irrelevant',        -- Konuyla ilgisiz
        'great_feedback',    -- Harika geri bildirim
        'other'              -- Diğer
    ) DEFAULT NULL,
    
    -- Yazılı yorum (opsiyonel)
    comment TEXT,
    
    -- AI yanıtı faydalı mıydı?
    was_helpful BOOLEAN DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    
    -- Her mesaja tek geri bildirim
    UNIQUE KEY unique_user_message (user_id, message_id),
    
    INDEX idx_user_id (user_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_rating_type (rating_type),
    INDEX idx_created_at (created_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 13: LEARNING_GOALS (Öğrenme Hedefleri)                                │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Kişiselleştirilmiş öğrenme yolları için hedef belirleme.              │
-- │                                                                              │
-- │ KULLANIM ALANLARI:                                                          │
-- │ - Haftalık/aylık hedefler                                                   │
-- │ - İlerleme motivasyonu                                                      │
-- │ - Kişiselleştirilmiş içerik önerisi                                         │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS learning_goals (
    goal_id INT AUTO_INCREMENT PRIMARY KEY,
    
    user_id INT NOT NULL,
    
    -- Hedef başlığı
    title VARCHAR(200) NOT NULL,
    
    -- Hedef açıklaması
    description TEXT,
    
    -- Hedef türü
    goal_type ENUM(
        'daily_practice',      -- Günlük pratik süresi
        'weekly_conversations', -- Haftalık konuşma sayısı
        'vocabulary_target',    -- Kelime hedefi
        'fluency_improvement',  -- Akıcılık iyileştirme
        'grammar_accuracy',     -- Gramer doğruluğu
        'topic_completion',     -- Konu tamamlama
        'streak',               -- Ardışık gün hedefi
        'custom'                -- Özel hedef
    ) NOT NULL,
    
    -- Hedef değeri (örn: 30 dakika, 5 konuşma, 50 kelime)
    target_value INT NOT NULL,
    
    -- Mevcut ilerleme
    current_value INT DEFAULT 0,
    
    -- Ölçü birimi
    unit VARCHAR(50) DEFAULT 'count',
    
    -- Hedef durumu
    status ENUM('active', 'completed', 'failed', 'paused') DEFAULT 'active',
    
    -- Başlangıç tarihi
    start_date DATE NOT NULL,
    
    -- Bitiş tarihi
    end_date DATE NOT NULL,
    
    -- Tamamlanma tarihi
    completed_at TIMESTAMP NULL,
    
    -- Hatırlatma aktif mi?
    reminder_enabled BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_goal_type (goal_type),
    INDEX idx_status (status),
    INDEX idx_end_date (end_date)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 14: SESSION_REPORTS (Oturum Raporları)                                │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Her konuşma oturumu sonrası detaylı performans raporu.                │
-- │                                                                              │
-- │ FR12: Detaylı geri bildirim (telaffuz, gramer, akıcılık)                    │
-- │ FR13: Özet format (skor veya derecelendirme)                                │
-- │                                                                              │
-- │ KULLANIM ALANLARI:                                                          │
-- │ - Oturum sonu özeti                                                         │
-- │ - Güçlü/zayıf yönler analizi                                                │
-- │ - İyileştirme önerileri                                                     │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS session_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    
    -- ═══ GENEL SKORLAR ═══
    
    overall_score DECIMAL(5,2) NOT NULL,
    grammar_score DECIMAL(5,2) DEFAULT NULL,
    fluency_score DECIMAL(5,2) DEFAULT NULL,
    vocabulary_score DECIMAL(5,2) DEFAULT NULL,
    comprehension_score DECIMAL(5,2) DEFAULT NULL,
    
    -- ═══ OTURUM İSTATİSTİKLERİ ═══
    
    total_messages INT DEFAULT 0,
    user_messages INT DEFAULT 0,
    ai_messages INT DEFAULT 0,
    total_words_spoken INT DEFAULT 0,
    unique_words_used INT DEFAULT 0,
    average_response_time_ms INT DEFAULT NULL,
    
    -- ═══ HATA ANALİZİ ═══
    
    grammar_mistakes_count INT DEFAULT 0,
    repeated_mistakes_count INT DEFAULT 0,
    
    -- En sık yapılan hata türleri (JSON)
    common_mistake_types JSON,
    
    -- ═══ GÜÇLÜ VE ZAYIF YÖNLER ═══
    
    -- Güçlü yönler (JSON array)
    strengths JSON,
    
    -- Geliştirilmesi gereken alanlar (JSON array)
    areas_to_improve JSON,
    
    -- ═══ ÖNERİLER ═══
    
    -- AI tarafından oluşturulan öneriler (JSON)
    recommendations JSON,
    
    -- Önerilen sonraki konular (JSON array of topic_ids)
    suggested_topics JSON,
    
    -- ═══ PERFORMANS DEĞİŞİMİ ═══
    
    -- Önceki oturuma göre değişim
    score_change DECIMAL(5,2) DEFAULT NULL,
    
    -- İlerleme durumu
    progress_status ENUM('improving', 'stable', 'declining') DEFAULT 'stable',
    
    -- Detaylı rapor metni (AI tarafından oluşturulan)
    detailed_feedback TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Her konuşma için tek rapor
    UNIQUE KEY unique_conversation_report (conversation_id),
    
    INDEX idx_user_id (user_id),
    INDEX idx_overall_score (overall_score),
    INDEX idx_created_at (created_at),
    INDEX idx_progress_status (progress_status)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TABLO 15: WORD_HIGHLIGHTS (Hatalı Kelime İşaretleme)                        │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ AMAÇ: Mesajlardaki hatalı kelimeleri/cümleleri işaretler.                   │
-- │                                                                              │
-- │ FR16: Hatalı kelime/cümle vurgulama                                         │
-- │                                                                              │
-- │ KULLANIM ALANLARI:                                                          │
-- │ - Frontend'de kırmızı/sarı vurgulama                                        │
-- │ - Tooltip ile düzeltme gösterme                                             │
-- │ - Öğrenme için tekrar sistemi                                               │
-- └─────────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

CREATE TABLE IF NOT EXISTS word_highlights (
    highlight_id INT AUTO_INCREMENT PRIMARY KEY,
    
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    
    -- ═══ KONUM BİLGİSİ ═══
    
    -- Hatalı metnin başlangıç pozisyonu (karakter)
    start_position INT NOT NULL,
    
    -- Hatalı metnin bitiş pozisyonu (karakter)
    end_position INT NOT NULL,
    
    -- Hatalı metin parçası
    highlighted_text VARCHAR(500) NOT NULL,
    
    -- ═══ HATA BİLGİSİ ═══
    
    -- Hata türü
    error_type ENUM(
        'grammar',          -- Gramer hatası
        'spelling',         -- Yazım hatası
        'word_choice',      -- Kelime seçimi
        'word_order',       -- Kelime sırası
        'missing_word',     -- Eksik kelime
        'extra_word',       -- Fazla kelime
        'tense',            -- Zaman hatası
        'article',          -- Article hatası (a/an/the)
        'preposition',      -- Edat hatası
        'punctuation',      -- Noktalama hatası
        'capitalization',   -- Büyük/küçük harf
        'other'             -- Diğer
    ) NOT NULL,
    
    -- Hata şiddeti
    severity ENUM('minor', 'moderate', 'major') DEFAULT 'moderate',
    
    -- Vurgu rengi (frontend için)
    highlight_color ENUM('red', 'orange', 'yellow') DEFAULT 'orange',
    
    -- ═══ DÜZELTME BİLGİSİ ═══
    
    -- Önerilen düzeltme
    correction VARCHAR(500) NOT NULL,
    
    -- Açıklama (tooltip için)
    explanation TEXT,
    
    -- Kural açıklaması (detaylı öğrenme için)
    grammar_rule TEXT,
    
    -- ═══ KULLANICI ETKİLEŞİMİ ═══
    
    -- Kullanıcı bu düzeltmeyi gördü mü?
    was_viewed BOOLEAN DEFAULT FALSE,
    
    -- Kullanıcı anladığını işaretledi mi?
    was_acknowledged BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    viewed_at TIMESTAMP NULL,
    
    FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_message_id (message_id),
    INDEX idx_user_id (user_id),
    INDEX idx_error_type (error_type),
    INDEX idx_severity (severity),
    INDEX idx_was_viewed (was_viewed)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ═══ ÖRNEK VERİLER (YENİ TABLOLAR İÇİN) ═══

-- Örnek Akıcılık Skoru
INSERT INTO fluency_scores (message_id, user_id, conversation_id, words_per_minute, pause_count, filler_word_count, overall_fluency_score) VALUES
(2, 1, 1, 95.5, 3, 1, 72.00),
(4, 1, 1, 110.2, 1, 0, 85.50);

-- Örnek Kelime Kullanımı
INSERT INTO vocabulary_usage (user_id, word, word_lemma, part_of_speech, word_level, usage_count, correct_usage_count) VALUES
(1, 'breakfast', 'breakfast', 'noun', 'A1', 3, 3),
(1, 'shower', 'shower', 'noun', 'A2', 2, 2),
(1, 'usually', 'usually', 'adverb', 'A2', 4, 4);

-- Örnek Kullanıcı Geri Bildirimi
INSERT INTO user_feedback (user_id, message_id, conversation_id, rating_type, star_rating, feedback_category, was_helpful) VALUES
(1, 3, 1, 'like', 5, 'great_feedback', TRUE);

-- Örnek Öğrenme Hedefi
INSERT INTO learning_goals (user_id, title, goal_type, target_value, current_value, unit, start_date, end_date) VALUES
(1, 'Weekly Practice Goal', 'weekly_conversations', 5, 2, 'conversations', '2026-01-06', '2026-01-12'),
(1, 'Vocabulary Building', 'vocabulary_target', 50, 15, 'words', '2026-01-01', '2026-01-31');

-- Örnek Oturum Raporu
INSERT INTO session_reports (conversation_id, user_id, overall_score, grammar_score, fluency_score, vocabulary_score, total_messages, user_messages, grammar_mistakes_count, strengths, areas_to_improve, recommendations) VALUES
(1, 1, 75.50, 70.00, 78.00, 80.00, 8, 4, 1, 
 '["Good vocabulary usage", "Natural conversation flow"]',
 '["Punctuation in time expressions", "Use of articles"]',
 '["Practice telling time with o''clock", "Review article usage rules"]');

-- Örnek Kelime İşaretleme
INSERT INTO word_highlights (message_id, user_id, start_position, end_position, highlighted_text, error_type, severity, highlight_color, correction, explanation) VALUES
(2, 1, 14, 21, 'oclock', 'punctuation', 'minor', 'yellow', 'o''clock', 'The word "o''clock" needs an apostrophe. It''s a contraction of "of the clock".');


-- =============================================================================
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║              ADMIN PANELİ İÇİN ÖRNEK SORGULAR                               ║
-- ║              (Bu sorgular phpMyAdmin'da test edilebilir)                    ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
-- =============================================================================

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SORGU 1: Tüm Kullanıcıları Listele                                          │
-- │ Kullanım: Admin paneli ana kullanıcı listesi                                │
-- └─────────────────────────────────────────────────────────────────────────────┘
/*
SELECT 
    user_id,
    name,
    email,
    proficiency_level,
    total_conversations,
    total_messages,
    is_active,
    created_at,
    last_login_at
FROM users
ORDER BY created_at DESC;
*/

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SORGU 2: Kullanıcı Detayı (ID ile)                                          │
-- │ Kullanım: Kullanıcı profil sayfası                                          │
-- └─────────────────────────────────────────────────────────────────────────────┘
/*
SELECT * FROM users WHERE user_id = 1;
*/

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SORGU 3: Bir Kullanıcının Tüm Konuşmaları                                   │
-- │ Kullanım: Kullanıcı detay sayfasında konuşma listesi                        │
-- └─────────────────────────────────────────────────────────────────────────────┘
/*
SELECT 
    c.conversation_id,
    c.title,
    t.name AS topic_name,
    c.status,
    c.message_count,
    c.overall_score,
    c.started_at,
    c.ended_at
FROM conversations c
LEFT JOIN topics t ON c.topic_id = t.topic_id
WHERE c.user_id = 1
ORDER BY c.started_at DESC;
*/

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SORGU 4: Bir Konuşmadaki Tüm Mesajlar                                       │
-- │ Kullanım: Konuşma detay sayfası                                             │
-- └─────────────────────────────────────────────────────────────────────────────┘
/*
SELECT 
    message_id,
    sender_type,
    content,
    has_grammar_error,
    created_at
FROM messages
WHERE conversation_id = 1
ORDER BY created_at ASC;
*/

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SORGU 5: Dashboard İstatistikleri                                           │
-- │ Kullanım: Admin dashboard özet kartları                                     │
-- └─────────────────────────────────────────────────────────────────────────────┘
/*
SELECT 
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS total_users,
    (SELECT COUNT(*) FROM conversations) AS total_conversations,
    (SELECT COUNT(*) FROM messages) AS total_messages,
    (SELECT COUNT(*) FROM conversations WHERE status = 'active') AS active_conversations,
    (SELECT COUNT(*) FROM grammar_mistakes) AS total_grammar_mistakes;
*/

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SORGU 6: Son 7 Günün Aktivitesi                                             │
-- │ Kullanım: Dashboard grafiği                                                 │
-- └─────────────────────────────────────────────────────────────────────────────┘
/*
SELECT 
    DATE(started_at) AS date,
    COUNT(*) AS conversation_count
FROM conversations
WHERE started_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY DATE(started_at)
ORDER BY date;
*/

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SORGU 7: En Aktif Kullanıcılar (Top 10)                                     │
-- │ Kullanım: Admin dashboard                                                   │
-- └─────────────────────────────────────────────────────────────────────────────┘
/*
SELECT 
    u.user_id,
    u.name,
    u.email,
    u.total_conversations,
    u.total_messages,
    COUNT(c.conversation_id) AS recent_conversations
FROM users u
LEFT JOIN conversations c ON u.user_id = c.user_id 
    AND c.started_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY u.user_id
ORDER BY recent_conversations DESC
LIMIT 10;
*/

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SORGU 8: En Popüler Konular                                                 │
-- │ Kullanım: Konu analizi                                                      │
-- └─────────────────────────────────────────────────────────────────────────────┘
/*
SELECT 
    t.topic_id,
    t.name,
    t.category,
    t.usage_count,
    COUNT(c.conversation_id) AS total_conversations
FROM topics t
LEFT JOIN conversations c ON t.topic_id = c.topic_id
GROUP BY t.topic_id
ORDER BY total_conversations DESC;
*/

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SORGU 9: En Sık Yapılan Gramer Hataları                                     │
-- │ Kullanım: Hata analizi sayfası                                              │
-- └─────────────────────────────────────────────────────────────────────────────┘
/*
SELECT 
    mistake_type,
    COUNT(*) AS occurrence_count
FROM grammar_mistakes
GROUP BY mistake_type
ORDER BY occurrence_count DESC;
*/

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SORGU 10: Konuşmaları Tarih Aralığına Göre Filtrele                         │
-- │ Kullanım: Admin paneli filtreleme                                           │
-- └─────────────────────────────────────────────────────────────────────────────┘
/*
SELECT 
    c.conversation_id,
    u.name AS user_name,
    t.name AS topic_name,
    c.status,
    c.overall_score,
    c.started_at
FROM conversations c
JOIN users u ON c.user_id = u.user_id
LEFT JOIN topics t ON c.topic_id = t.topic_id
WHERE c.started_at BETWEEN '2026-01-01' AND '2026-01-31'
ORDER BY c.started_at DESC;
*/


-- =============================================================================
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║                              ŞEMA TAMAMLANDI                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
-- =============================================================================
