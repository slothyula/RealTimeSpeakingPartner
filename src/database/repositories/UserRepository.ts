/**
 * User Repository
 * Kullanıcı veritabanı işlemleri
 */

import { RowDataPacket } from 'mysql2/promise';
import MySQLConnection from '../MySQLConnection';

export interface UserRow extends RowDataPacket {
    user_id: number;
    name: string;
    email: string;
    password_hash: string;
    proficiency_level: 'beginner' | 'intermediate' | 'advanced';
    native_language: string;
    target_language: string; // Kullanıcının öğrenmek istediği dil (English, Spanish, French, vb.)
    total_practice_minutes: number;
    total_conversations: number;
    total_messages: number;
    is_active: boolean;
    created_at: Date;
    last_login_at: Date | null;
    updated_at: Date;
}

export class UserRepository {
    private db: MySQLConnection;

    constructor() {
        this.db = MySQLConnection.getInstance();
    }

    /**
     * Yeni kullanıcı oluştur
     */
    async createUser(name: string, email: string, passwordHash: string, proficiencyLevel: string = 'intermediate', targetLanguage: string = 'English'): Promise<number | null> {
        try {
            const sql = `
                INSERT INTO users (name, email, password_hash, proficiency_level, target_language)
                VALUES (?, ?, ?, ?, ?)
            `;
            const result = await this.db.execute(sql, [name, email, passwordHash, proficiencyLevel, targetLanguage]);
            console.log(`UserRepository: User created with ID ${result.insertId}`);
            return result.insertId;
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                console.log('UserRepository: Email already exists');
            } else {
                console.error('UserRepository: Error creating user:', error);
            }
            return null;
        }
    }

    /**
     * Email ile kullanıcı bul
     */
    async findByEmail(email: string): Promise<UserRow | null> {
        const sql = 'SELECT * FROM users WHERE email = ? AND is_active = TRUE';
        const rows = await this.db.query<UserRow[]>(sql, [email]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * ID ile kullanıcı bul
     */
    async findById(userId: number): Promise<UserRow | null> {
        const sql = 'SELECT * FROM users WHERE user_id = ?';
        const rows = await this.db.query<UserRow[]>(sql, [userId]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Tüm kullanıcıları listele (Admin Panel için)
     */
    async findAll(limit: number = 50, offset: number = 0): Promise<UserRow[]> {
        const sql = `
            SELECT * FROM users 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;
        return await this.db.query<UserRow[]>(sql, [limit, offset]);
    }

    /**
     * Kullanıcı kimlik doğrulama
     */
    async validateCredentials(email: string, passwordHash: string): Promise<UserRow | null> {
        const sql = 'SELECT * FROM users WHERE email = ? AND password_hash = ? AND is_active = TRUE';
        const rows = await this.db.query<UserRow[]>(sql, [email, passwordHash]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Son giriş zamanını güncelle
     */
    async updateLastLogin(userId: number): Promise<void> {
        const sql = 'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?';
        await this.db.execute(sql, [userId]);
    }

    /**
     * Kullanıcı istatistiklerini güncelle
     */
    async updateStats(userId: number, conversations: number, messages: number, minutes: number): Promise<void> {
        const sql = `
            UPDATE users 
            SET total_conversations = total_conversations + ?,
                total_messages = total_messages + ?,
                total_practice_minutes = total_practice_minutes + ?
            WHERE user_id = ?
        `;
        await this.db.execute(sql, [conversations, messages, minutes, userId]);
    }

    /**
     * Kullanıcı seviyesini güncelle
     */
    async updateProficiencyLevel(userId: number, level: string): Promise<void> {
        const sql = 'UPDATE users SET proficiency_level = ? WHERE user_id = ?';
        await this.db.execute(sql, [level, userId]);
    }

    /**
     * Kullanıcının hedef dilini güncelle
     */
    async updateTargetLanguage(userId: number, targetLanguage: string): Promise<void> {
        const sql = 'UPDATE users SET target_language = ? WHERE user_id = ?';
        await this.db.execute(sql, [targetLanguage, userId]);
    }

    /**
     * Kullanıcı sayısı
     */
    async count(): Promise<number> {
        const sql = 'SELECT COUNT(*) as count FROM users WHERE is_active = TRUE';
        const rows = await this.db.query<RowDataPacket[]>(sql);
        return rows[0].count;
    }

    /**
     * Kullanıcı sil (soft delete)
     */
    async softDelete(userId: number): Promise<void> {
        const sql = 'UPDATE users SET is_active = FALSE WHERE user_id = ?';
        await this.db.execute(sql, [userId]);
    }

    /**
     * Tüm kullanıcıları conversation istatistikleriyle birlikte getir
     * Conversations tablosundan: pratik sayısı, toplam süre, ortalama skor
     * (Backward compatibility için - tüm dillerden gelen skorları birleştirir)
     */
    async findAllWithStats(limit: number = 50, offset: number = 0): Promise<any[]> {
        const sql = `
            SELECT 
                u.user_id,
                u.name,
                u.email,
                u.proficiency_level,
                u.native_language,
                u.target_language,
                u.is_active,
                u.created_at,
                u.last_login_at,
                u.updated_at,
                COALESCE(stats.total_conversations, 0) as total_conversations,
                COALESCE(stats.total_practice_seconds, 0) as total_practice_seconds,
                COALESCE(stats.avg_score, 0) as avg_score
            FROM users u
            LEFT JOIN (
                SELECT 
                    user_id,
                    COUNT(*) as total_conversations,
                    COALESCE(SUM(duration_seconds), 0) as total_practice_seconds,
                    COALESCE(AVG(overall_score), 0) as avg_score
                FROM conversations
                WHERE status = 'completed'
                GROUP BY user_id
            ) stats ON u.user_id = stats.user_id
            WHERE u.is_active = TRUE
            ORDER BY u.created_at DESC 
            LIMIT ? OFFSET ?
        `;
        return await this.db.query<any[]>(sql, [limit, offset]);
    }

    /**
     * Kullanıcının her dil için ayrı istatistiklerini getir
     * Her dil için: toplam konuşma sayısı, toplam pratik süresi, ortalama skor, seviye
     */
    async getUserStatsByLanguage(userId: number): Promise<{
        [language: string]: {
            total_conversations: number;
            total_practice_seconds: number;
            avg_score: number | null;
            proficiency_level: 'beginner' | 'intermediate' | 'advanced';
        };
    }> {
        const sql = `
            SELECT 
                COALESCE(c.target_language, t.target_language, 'English') as target_language,
                COUNT(*) as total_conversations,
                COALESCE(SUM(c.duration_seconds), 0) as total_practice_seconds,
                AVG(c.overall_score) as avg_score
            FROM conversations c
            LEFT JOIN topics t ON c.topic_id = t.topic_id
            WHERE c.user_id = ? AND c.status = 'completed'
            GROUP BY COALESCE(c.target_language, t.target_language, 'English')
        `;
        const rows = await this.db.query<RowDataPacket[]>(sql, [userId]);
        
        const statsByLanguage: {
            [language: string]: {
                total_conversations: number;
                total_practice_seconds: number;
                avg_score: number | null;
                proficiency_level: 'beginner' | 'intermediate' | 'advanced';
            };
        } = {};

        rows.forEach((row: any) => {
            const language = row.target_language || 'English';
            const avgScore = row.avg_score || 0;
            let proficiency_level: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
            
            if (avgScore >= 80) {
                proficiency_level = 'advanced';
            } else if (avgScore >= 50) {
                proficiency_level = 'intermediate';
            }
            
            statsByLanguage[language] = {
                total_conversations: row.total_conversations || 0,
                total_practice_seconds: row.total_practice_seconds || 0,
                avg_score: avgScore,
                proficiency_level
            };
        });

        return statsByLanguage;
    }
}

export default UserRepository;
