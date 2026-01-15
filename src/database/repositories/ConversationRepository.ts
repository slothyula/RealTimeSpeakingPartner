/**
 * Conversation Repository
 * Konuşma veritabanı işlemleri
 */

import { RowDataPacket } from 'mysql2/promise';
import MySQLConnection from '../MySQLConnection';

export interface ConversationRow extends RowDataPacket {
    conversation_id: number;
    user_id: number;
    topic_id: number | null;
    title: string | null;
    status: 'active' | 'completed' | 'abandoned';
    message_count: number;
    duration_seconds: number;
    overall_score: number | null;
    pronunciation_score: number | null;
    grammar_score: number | null;
    fluency_score: number | null;
    started_at: Date;
    ended_at: Date | null;
}

export interface ConversationDetailRow extends ConversationRow {
    user_name: string;
    user_email: string;
    topic_name: string | null;
    topic_category: string | null;
    target_language: string | null;
}

export class ConversationRepository {
    private db: MySQLConnection;

    constructor() {
        this.db = MySQLConnection.getInstance();
    }

    /**
     * Yeni konuşma oluştur
     */
    async create(userId: number, topicId: number | null, title: string | null = null): Promise<number | null> {
        try {
            const sql = `
                INSERT INTO conversations (user_id, topic_id, title, status)
                VALUES (?, ?, ?, 'active')
            `;
            const result = await this.db.execute(sql, [userId, topicId, title]);
            
            // Topic kullanım sayısını artır
            if (topicId) {
                await this.db.execute('UPDATE topics SET usage_count = usage_count + 1 WHERE topic_id = ?', [topicId]);
            }
            
            console.log(`ConversationRepository: Conversation created with ID ${result.insertId}`);
            return result.insertId;
        } catch (error) {
            console.error('ConversationRepository: Error creating conversation:', error);
            return null;
        }
    }

    /**
     * ID ile konuşma bul
     */
    async findById(conversationId: number): Promise<ConversationRow | null> {
        const sql = 'SELECT * FROM conversations WHERE conversation_id = ?';
        const rows = await this.db.query<ConversationRow[]>(sql, [conversationId]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Detaylı konuşma bilgisi (Admin Panel için)
     */
    async findByIdWithDetails(conversationId: number): Promise<ConversationDetailRow | null> {
        const sql = `
            SELECT c.*, u.name as user_name, u.email as user_email,
                   t.name as topic_name, t.category as topic_category,
                   COALESCE(c.target_language, t.target_language, 'English') as target_language
            FROM conversations c
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN topics t ON c.topic_id = t.topic_id
            WHERE c.conversation_id = ?
        `;
        const rows = await this.db.query<ConversationDetailRow[]>(sql, [conversationId]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Kullanıcının tüm konuşmaları
     */
    async findByUserId(userId: number, limit: number = 50): Promise<ConversationDetailRow[]> {
        const sql = `
            SELECT c.*, t.name as topic_name, t.category as topic_category,
                   COALESCE(c.target_language, t.target_language, 'English') as target_language
            FROM conversations c
            LEFT JOIN topics t ON c.topic_id = t.topic_id
            WHERE c.user_id = ?
            ORDER BY c.started_at DESC
            LIMIT ?
        `;
        return await this.db.query<ConversationDetailRow[]>(sql, [userId, limit]);
    }

    /**
     * Tüm konuşmalar (Admin Panel için)
     */
    async findAll(limit: number = 50, offset: number = 0, filters?: {
        userId?: number;
        topicId?: number;
        status?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<ConversationDetailRow[]> {
        let sql = `
            SELECT c.*, u.name as user_name, u.email as user_email,
                   t.name as topic_name, t.category as topic_category,
                   COALESCE(c.target_language, t.target_language, 'English') as target_language
            FROM conversations c
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN topics t ON c.topic_id = t.topic_id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (filters?.userId) {
            sql += ' AND c.user_id = ?';
            params.push(filters.userId);
        }
        if (filters?.topicId) {
            sql += ' AND c.topic_id = ?';
            params.push(filters.topicId);
        }
        if (filters?.status) {
            sql += ' AND c.status = ?';
            params.push(filters.status);
        }
        if (filters?.startDate) {
            sql += ' AND c.started_at >= ?';
            params.push(filters.startDate);
        }
        if (filters?.endDate) {
            sql += ' AND c.started_at <= ?';
            params.push(filters.endDate);
        }

        sql += ' ORDER BY c.started_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return await this.db.query<ConversationDetailRow[]>(sql, params);
    }

    /**
     * Konuşmayı tamamla
     */
    async complete(conversationId: number, scores: {
        overall?: number;
        pronunciation?: number;
        grammar?: number;
        fluency?: number;
    }): Promise<void> {
        const sql = `
            UPDATE conversations 
            SET status = 'completed',
                ended_at = CURRENT_TIMESTAMP,
                overall_score = ?,
                pronunciation_score = ?,
                grammar_score = ?,
                fluency_score = ?
            WHERE conversation_id = ?
        `;
        await this.db.execute(sql, [
            scores.overall || null,
            scores.pronunciation || null,
            scores.grammar || null,
            scores.fluency || null,
            conversationId
        ]);
    }

    /**
     * Mesaj sayısını güncelle
     */
    async incrementMessageCount(conversationId: number): Promise<void> {
        const sql = 'UPDATE conversations SET message_count = message_count + 1 WHERE conversation_id = ?';
        await this.db.execute(sql, [conversationId]);
    }

    /**
     * Süreyi güncelle
     */
    async updateDuration(conversationId: number, durationSeconds: number): Promise<void> {
        const sql = 'UPDATE conversations SET duration_seconds = ? WHERE conversation_id = ?';
        await this.db.execute(sql, [durationSeconds, conversationId]);
    }

    /**
     * Conversation'ın hedef dilini güncelle
     */
    async updateTargetLanguage(conversationId: number, targetLanguage: string): Promise<void> {
        try {
            const sql = 'UPDATE conversations SET target_language = ? WHERE conversation_id = ?';
            await this.db.execute(sql, [targetLanguage, conversationId]);
        } catch (error: any) {
            // Column might not exist yet (for backward compatibility)
            if (error.code === 'ER_BAD_FIELD_ERROR') {
                console.log('ConversationRepository: target_language column does not exist yet, skipping update');
            } else {
                throw error;
            }
        }
    }

    /**
     * Aktif konuşma sayısı
     */
    async countActive(): Promise<number> {
        const sql = "SELECT COUNT(*) as count FROM conversations WHERE status = 'active'";
        const rows = await this.db.query<RowDataPacket[]>(sql);
        return rows[0].count;
    }

    /**
     * Toplam konuşma sayısı
     */
    async count(): Promise<number> {
        const sql = 'SELECT COUNT(*) as count FROM conversations';
        const rows = await this.db.query<RowDataPacket[]>(sql);
        return rows[0].count;
    }

    /**
     * Bugünkü konuşma sayısı
     */
    async countToday(): Promise<number> {
        const sql = 'SELECT COUNT(*) as count FROM conversations WHERE DATE(started_at) = CURDATE()';
        const rows = await this.db.query<RowDataPacket[]>(sql);
        return rows[0].count;
    }

    /**
     * Konuşmayı sil (ilişkili kayıtlarla birlikte)
     */
    async delete(conversationId: number): Promise<void> {
        // First delete related records (messages, grammar_mistakes if exists, feedbacks)
        // These tables might not exist, so we handle errors gracefully
        try {
            await this.db.execute('DELETE FROM grammar_mistakes WHERE conversation_id = ?', [conversationId]);
        } catch (error) {
            // Table might not exist, ignore this error
            console.log('ConversationRepository: grammar_mistakes table not found or error, skipping...');
        }
        
        try {
            await this.db.execute('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
        } catch (error) {
            // Table might not exist, ignore this error
            console.log('ConversationRepository: messages table not found or error, skipping...');
        }
        
        // Then delete the conversation itself
        await this.db.execute('DELETE FROM conversations WHERE conversation_id = ?', [conversationId]);
        
        console.log(`ConversationRepository: Conversation ${conversationId} deleted successfully`);
    }

    /**
     * Kullanıcının istatistiklerini getir (profil için)
     * Tüm dillerden gelen skorları birleştirir (backward compatibility için)
     */
    async getUserStats(userId: number): Promise<{
        total_conversations: number;
        total_practice_seconds: number;
        avg_score: number | null;
    }> {
        const sql = `
            SELECT 
                COUNT(*) as total_conversations,
                COALESCE(SUM(duration_seconds), 0) as total_practice_seconds,
                AVG(overall_score) as avg_score
            FROM conversations
            WHERE user_id = ? AND status = 'completed'
        `;
        const rows = await this.db.query<RowDataPacket[]>(sql, [userId]);
        return {
            total_conversations: rows[0]?.total_conversations || 0,
            total_practice_seconds: rows[0]?.total_practice_seconds || 0,
            avg_score: rows[0]?.avg_score || null
        };
    }

    /**
     * Kullanıcının her dil için ayrı istatistiklerini getir
     * Her dil için: toplam konuşma sayısı, toplam pratik süresi, ortalama skor
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

export default ConversationRepository;
