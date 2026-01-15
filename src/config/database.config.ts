/**
 * Database Configuration
 * MySQL bağlantı ayarları
 */

export const dbConfig = {
    // MySQL Bağlantı Ayarları (XAMPP)
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'speaking_partner',
    
    // Bağlantı Havuzu Ayarları
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    
    // Zaman Aşımı Ayarları
    connectTimeout: 10000,
    acquireTimeout: 10000,
    
    // Karakter Seti
    charset: 'utf8mb4'
};

export default dbConfig;
