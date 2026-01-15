/**
 * Admin Repository
 * Admin veritabanı işlemleri
 */

import { RowDataPacket } from 'mysql2/promise';
import MySQLConnection from '../MySQLConnection';

export interface AdminRow extends RowDataPacket {
    admin_id: number;
    username: string;
    email: string;
    password_hash: string;
    full_name: string;
    role: 'super_admin' | 'moderator' | 'viewer';
    is_active: boolean;
    created_at: Date;
    last_login_at: Date | null;
}

export interface DashboardStats {
    total_users: number;
    new_users_today: number;
    conversations_today: number;
    messages_today: number;
    avg_score: number;
    active_sessions: number;
}

export class AdminRepository {
    private db: MySQLConnection;

    constructor() {
        this.db = MySQLConnection.getInstance();
    }

    /**
     * Yeni admin oluştur
     */
    async create(
        username: string,
        email: string,
        passwordHash: string,
        fullName: string,
        role: string = 'viewer'
    ): Promise<number | null> {
        try {
            const sql = `
                INSERT INTO admins (username, email, password_hash, full_name, role)
                VALUES (?, ?, ?, ?, ?)
            `;
            const result = await this.db.execute(sql, [username, email, passwordHash, fullName, role]);
            return result.insertId;
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                console.log('AdminRepository: Username or email already exists');
            } else {
                console.error('AdminRepository: Error creating admin:', error);
            }
            return null;
        }
    }

    /**
     * Username ile admin bul
     */
    async findByUsername(username: string): Promise<AdminRow | null> {
        const sql = 'SELECT * FROM admins WHERE username = ? AND is_active = TRUE';
        const rows = await this.db.query<AdminRow[]>(sql, [username]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Email ile admin bul
     */
    async findByEmail(email: string): Promise<AdminRow | null> {
        const sql = 'SELECT * FROM admins WHERE email = ? AND is_active = TRUE';
        const rows = await this.db.query<AdminRow[]>(sql, [email]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Admin kimlik doğrulama
     */
    async validateCredentials(username: string, passwordHash: string): Promise<AdminRow | null> {
        const sql = 'SELECT * FROM admins WHERE username = ? AND password_hash = ? AND is_active = TRUE';
        const rows = await this.db.query<AdminRow[]>(sql, [username, passwordHash]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Son giriş zamanını güncelle
     */
    async updateLastLogin(adminId: number): Promise<void> {
        const sql = 'UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE admin_id = ?';
        await this.db.execute(sql, [adminId]);
    }

    /**
     * Admin password'ünü güncelle
     */
    async updatePassword(username: string, passwordHash: string): Promise<boolean> {
        try {
            const sql = 'UPDATE admins SET password_hash = ? WHERE username = ?';
            const result = await this.db.execute(sql, [passwordHash, username]);
            return (result as any).affectedRows > 0;
        } catch (error) {
            console.error('AdminRepository: Error updating password:', error);
            return false;
        }
    }

    /**
     * Dashboard istatistikleri
     */
    async getDashboardStats(): Promise<DashboardStats> {
        try {
            const sql = `
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_users,
                    (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()) as new_users_today,
                    (SELECT COUNT(*) FROM conversations WHERE DATE(started_at) = CURDATE()) as conversations_today,
                    (SELECT COALESCE(SUM(message_count), 0) FROM conversations WHERE DATE(started_at) = CURDATE()) as messages_today,
                    (SELECT COALESCE(AVG(overall_score), 0) FROM conversations WHERE overall_score IS NOT NULL) as avg_score,
                    (SELECT COUNT(*) FROM conversations WHERE status = 'active') as active_sessions
            `;
            const rows = await this.db.query<RowDataPacket[]>(sql);
            return rows[0] as DashboardStats;
        } catch (error) {
            console.error('AdminRepository: Error getting dashboard stats:', error);
            // Return default values if query fails
            return {
                total_users: 0,
                new_users_today: 0,
                conversations_today: 0,
                messages_today: 0,
                avg_score: 0,
                active_sessions: 0
            };
        }
    }

    /**
     * Günlük istatistikler (son N gün)
     */
    async getDailyStats(days: number = 30): Promise<any[]> {
        try {
            const sql = `
                SELECT 
                    DATE(c.started_at) as date,
                    COUNT(DISTINCT c.user_id) as active_users,
                    COUNT(c.conversation_id) as total_conversations,
                    COALESCE(SUM(c.message_count), 0) as total_messages,
                    COALESCE(AVG(c.overall_score), 0) as avg_score
                FROM conversations c
                WHERE c.started_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                GROUP BY DATE(c.started_at)
                ORDER BY date DESC
            `;
            return await this.db.query<RowDataPacket[]>(sql, [days]);
        } catch (error) {
            console.error('AdminRepository: Error getting daily stats:', error);
            return [];
        }
    }

    /**
     * En aktif kullanıcılar
     */
    async getMostActiveUsers(limit: number = 10): Promise<any[]> {
        try {
            const sql = `
                SELECT 
                    u.user_id,
                    u.name,
                    u.email,
                    u.total_conversations,
                    u.total_practice_minutes,
                    COALESCE(AVG(c.overall_score), 0) as avg_score
                FROM users u
                LEFT JOIN conversations c ON u.user_id = c.user_id
                WHERE u.is_active = TRUE
                GROUP BY u.user_id
                ORDER BY u.total_conversations DESC, u.total_practice_minutes DESC
                LIMIT ?
            `;
            return await this.db.query<RowDataPacket[]>(sql, [limit]);
        } catch (error) {
            console.error('AdminRepository: Error getting most active users:', error);
            return [];
        }
    }

    /**
     * En popüler konular
     */
    async getMostPopularTopics(limit: number = 10): Promise<any[]> {
        try {
            const sql = `
                SELECT 
                    t.topic_id,
                    t.name,
                    t.category,
                    t.difficulty,
                    t.usage_count,
                    COUNT(c.conversation_id) as conversation_count,
                    COALESCE(AVG(c.overall_score), 0) as avg_score
                FROM topics t
                LEFT JOIN conversations c ON t.topic_id = c.topic_id
                WHERE t.is_active = TRUE
                GROUP BY t.topic_id
                ORDER BY t.usage_count DESC
                LIMIT ?
            `;
            return await this.db.query<RowDataPacket[]>(sql, [limit]);
        } catch (error) {
            console.error('AdminRepository: Error getting most popular topics:', error);
            return [];
        }
    }

    /**
     * Sık yapılan gramer hataları
     */
    async getCommonGrammarMistakes(limit: number = 10): Promise<any[]> {
        try {
            const sql = `
                SELECT 
                    mistake_type,
                    COUNT(*) as count,
                    COUNT(DISTINCT user_id) as affected_users
                FROM grammar_mistakes
                GROUP BY mistake_type
                ORDER BY count DESC
                LIMIT ?
            `;
            return await this.db.query<RowDataPacket[]>(sql, [limit]);
        } catch (error) {
            console.error('AdminRepository: Error getting common grammar mistakes:', error);
            return [];
        }
    }
}

export default AdminRepository;