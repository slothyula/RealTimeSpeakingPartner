/**
 * Grammar Mistake Repository
 * Gramer hatası veritabanı işlemleri
 */

import { RowDataPacket } from 'mysql2/promise';
import MySQLConnection from '../MySQLConnection';

export interface GrammarMistakeRow extends RowDataPacket {
    mistake_id: number;
    message_id: number;
    user_id: number;
    original_text: string;
    corrected_text: string;
    mistake_type: string | null;
    explanation: string | null;
    was_repeated: boolean;
    created_at: Date;
}

export class GrammarMistakeRepository {
    private db: MySQLConnection;

    constructor() {
        this.db = MySQLConnection.getInstance();
    }

    /**
     * Yeni gramer hatası kaydet
     */
    async create(
        messageId: number,
        userId: number,
        originalText: string,
        correctedText: string,
        mistakeType?: string,
        explanation?: string
    ): Promise<number | null> {
        try {
            // Aynı hatanın daha önce yapılıp yapılmadığını kontrol et
            const wasRepeated = await this.checkIfRepeated(userId, mistakeType || '');

            const sql = `
                INSERT INTO grammar_mistakes 
                (message_id, user_id, original_text, corrected_text, mistake_type, explanation, was_repeated)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const result = await this.db.execute(sql, [
                messageId,
                userId,
                originalText,
                correctedText,
                mistakeType || null,
                explanation || null,
                wasRepeated
            ]);
            return result.insertId;
        } catch (error) {
            console.error('GrammarMistakeRepository: Error creating mistake:', error);
            return null;
        }
    }

    /**
     * Bu hata türü daha önce yapılmış mı?
     */
    private async checkIfRepeated(userId: number, mistakeType: string): Promise<boolean> {
        if (!mistakeType) return false;
        
        const sql = `
            SELECT COUNT(*) as count FROM grammar_mistakes 
            WHERE user_id = ? AND mistake_type = ?
        `;
        const rows = await this.db.query<RowDataPacket[]>(sql, [userId, mistakeType]);
        return rows[0].count > 0;
    }

    /**
     * Kullanıcının tüm gramer hataları
     */
    async findByUserId(userId: number, limit: number = 50): Promise<GrammarMistakeRow[]> {
        const sql = `
            SELECT * FROM grammar_mistakes 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `;
        return await this.db.query<GrammarMistakeRow[]>(sql, [userId, limit]);
    }

    /**
     * Kullanıcının en sık yaptığı hatalar
     */
    async getMostFrequentByUser(userId: number, limit: number = 10): Promise<any[]> {
        const sql = `
            SELECT 
                mistake_type,
                COUNT(*) as count,
                MAX(created_at) as last_occurrence
            FROM grammar_mistakes 
            WHERE user_id = ? AND mistake_type IS NOT NULL
            GROUP BY mistake_type
            ORDER BY count DESC
            LIMIT ?
        `;
        return await this.db.query<RowDataPacket[]>(sql, [userId, limit]);
    }

    /**
     * Tekrarlanan hatalar
     */
    async getRepeatedMistakes(userId?: number): Promise<GrammarMistakeRow[]> {
        let sql = 'SELECT * FROM grammar_mistakes WHERE was_repeated = TRUE';
        const params: any[] = [];

        if (userId) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }

        sql += ' ORDER BY created_at DESC LIMIT 50';
        return await this.db.query<GrammarMistakeRow[]>(sql, params);
    }

    /**
     * Hata türüne göre sayım (Admin Panel için)
     */
    async countByType(): Promise<any[]> {
        const sql = `
            SELECT 
                COALESCE(mistake_type, 'Unknown') as mistake_type,
                COUNT(*) as count,
                COUNT(DISTINCT user_id) as affected_users
            FROM grammar_mistakes
            GROUP BY mistake_type
            ORDER BY count DESC
        `;
        return await this.db.query<RowDataPacket[]>(sql);
    }

    /**
     * Kullanıcının toplam hata sayısı
     */
    async countByUser(userId: number): Promise<number> {
        const sql = 'SELECT COUNT(*) as count FROM grammar_mistakes WHERE user_id = ?';
        const rows = await this.db.query<RowDataPacket[]>(sql, [userId]);
        return rows[0].count;
    }

    /**
     * Conversation ID ile feedback kaydet (message_id olmadan)
     */
    async createWithConversation(
        conversationId: number,
        userId: number,
        originalText: string,
        correctedText: string,
        mistakeType?: string,
        explanation?: string
    ): Promise<number | null> {
        try {
            const wasRepeated = await this.checkIfRepeated(userId, mistakeType || '');

            const sql = `
                INSERT INTO grammar_mistakes 
                (message_id, user_id, original_text, corrected_text, mistake_type, explanation, was_repeated, conversation_id)
                VALUES (0, ?, ?, ?, ?, ?, ?, ?)
            `;
            const result = await this.db.execute(sql, [
                userId,
                originalText,
                correctedText,
                mistakeType || null,
                explanation || null,
                wasRepeated,
                conversationId
            ]);
            console.log(`GrammarMistakeRepository: Feedback saved for conversation ${conversationId}`);
            return result.insertId;
        } catch (error) {
            console.error('GrammarMistakeRepository: Error creating feedback:', error);
            return null;
        }
    }

    /**
     * Conversation'a ait tüm feedbackler
     */
    async findByConversationId(conversationId: number): Promise<GrammarMistakeRow[]> {
        const sql = `
            SELECT * FROM grammar_mistakes 
            WHERE conversation_id = ? 
            ORDER BY created_at ASC
        `;
        return await this.db.query<GrammarMistakeRow[]>(sql, [conversationId]);
    }
}

export default GrammarMistakeRepository;
