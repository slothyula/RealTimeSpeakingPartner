/**
 * Message Repository
 * Mesaj veritabanı işlemleri
 */

import { RowDataPacket } from 'mysql2/promise';
import MySQLConnection from '../MySQLConnection';

export interface MessageRow extends RowDataPacket {
    message_id: number;
    conversation_id: number;
    sender_type: 'user' | 'assistant';
    content: string;
    audio_url: string | null;
    has_grammar_error: boolean;
    response_time_ms: number | null;
    created_at: Date;
}

export class MessageRepository {
    private db: MySQLConnection;

    constructor() {
        this.db = MySQLConnection.getInstance();
    }

    /**
     * Yeni mesaj oluştur
     */
    async create(
        conversationId: number,
        senderType: 'user' | 'assistant',
        content: string,
        hasGrammarError: boolean = false,
        responseTimeMs: number | null = null
    ): Promise<number | null> {
        try {
            const sql = `
                INSERT INTO messages (conversation_id, sender_type, content, has_grammar_error, response_time_ms)
                VALUES (?, ?, ?, ?, ?)
            `;
            const result = await this.db.execute(sql, [
                conversationId,
                senderType,
                content,
                hasGrammarError,
                responseTimeMs
            ]);
            return result.insertId;
        } catch (error) {
            console.error('MessageRepository: Error creating message:', error);
            return null;
        }
    }

    /**
     * Konuşmanın tüm mesajları
     */
    async findByConversationId(conversationId: number): Promise<MessageRow[]> {
        const sql = `
            SELECT * FROM messages 
            WHERE conversation_id = ? 
            ORDER BY created_at ASC
        `;
        return await this.db.query<MessageRow[]>(sql, [conversationId]);
    }

    /**
     * Kullanıcının tüm mesajları
     */
    async findByUserId(userId: number, limit: number = 100): Promise<MessageRow[]> {
        const sql = `
            SELECT m.* FROM messages m
            JOIN conversations c ON m.conversation_id = c.conversation_id
            WHERE c.user_id = ?
            ORDER BY m.created_at DESC
            LIMIT ?
        `;
        return await this.db.query<MessageRow[]>(sql, [userId, limit]);
    }

    /**
     * Gramer hatalı mesajlar
     */
    async findWithGrammarErrors(userId?: number, limit: number = 50): Promise<MessageRow[]> {
        let sql = `
            SELECT m.* FROM messages m
            JOIN conversations c ON m.conversation_id = c.conversation_id
            WHERE m.has_grammar_error = TRUE AND m.sender_type = 'user'
        `;
        const params: any[] = [];

        if (userId) {
            sql += ' AND c.user_id = ?';
            params.push(userId);
        }

        sql += ' ORDER BY m.created_at DESC LIMIT ?';
        params.push(limit);

        return await this.db.query<MessageRow[]>(sql, params);
    }

    /**
     * Toplam mesaj sayısı
     */
    async count(): Promise<number> {
        const sql = 'SELECT COUNT(*) as count FROM messages';
        const rows = await this.db.query<RowDataPacket[]>(sql);
        return rows[0].count;
    }

    /**
     * Bugünkü mesaj sayısı
     */
    async countToday(): Promise<number> {
        const sql = 'SELECT COUNT(*) as count FROM messages WHERE DATE(created_at) = CURDATE()';
        const rows = await this.db.query<RowDataPacket[]>(sql);
        return rows[0].count;
    }

    /**
     * Gramer hatası içeren mesaj sayısı
     */
    async countWithGrammarErrors(): Promise<number> {
        const sql = 'SELECT COUNT(*) as count FROM messages WHERE has_grammar_error = TRUE';
        const rows = await this.db.query<RowDataPacket[]>(sql);
        return rows[0].count;
    }
}

export default MessageRepository;
