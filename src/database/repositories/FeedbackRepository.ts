/**
 * Feedback Repository
 * Feedback history veritabanı işlemleri
 */

import { RowDataPacket } from 'mysql2/promise';
import MySQLConnection from '../MySQLConnection';

export interface FeedbackRow extends RowDataPacket {
    feedback_id: number;
    user_id: number;
    conversation_id: number | null;
    message_id: number | null;
    user_text: string;
    short_feedback: string;
    feedback_type: 'success' | 'warning' | 'info';
    detailed_analysis: any;
    score_breakdown: any;
    overall_score: number;
    sentence_status: 'correct' | 'has_errors';
    created_at: Date;
}

export class FeedbackRepository {
    private db: MySQLConnection;

    constructor() {
        this.db = MySQLConnection.getInstance();
    }

    /**
     * Yeni feedback kaydet
     */
    async create(
        userId: number,
        userText: string,
        shortFeedback: string,
        feedbackType: 'success' | 'warning' | 'info',
        detailedAnalysis: any,
        scoreBreakdown: any,
        overallScore: number,
        sentenceStatus: 'correct' | 'has_errors',
        conversationId?: number,
        messageId?: number
    ): Promise<number | null> {
        try {
            const sql = `
                INSERT INTO feedback_history 
                (user_id, conversation_id, message_id, user_text, short_feedback, 
                 feedback_type, detailed_analysis, score_breakdown, overall_score, sentence_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const result = await this.db.execute(sql, [
                userId,
                conversationId || null,
                messageId || null,
                userText,
                shortFeedback,
                feedbackType,
                JSON.stringify(detailedAnalysis),
                JSON.stringify(scoreBreakdown),
                overallScore,
                sentenceStatus
            ]);
            console.log(`FeedbackRepository: Feedback saved with ID ${result.insertId}`);
            return result.insertId;
        } catch (error) {
            console.error('FeedbackRepository: Error saving feedback:', error);
            return null;
        }
    }

    /**
     * Kullanıcının feedback geçmişini getir
     */
    async getByUserId(userId: number, limit: number = 50, offset: number = 0): Promise<FeedbackRow[]> {
        try {
            const sql = `
                SELECT * FROM feedback_history 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `;
            return await this.db.query<FeedbackRow[]>(sql, [userId, limit, offset]);
        } catch (error) {
            console.error('FeedbackRepository: Error getting user feedback:', error);
            return [];
        }
    }

    /**
     * Konuşmaya ait feedback'leri getir
     */
    async getByConversationId(conversationId: number): Promise<FeedbackRow[]> {
        try {
            const sql = `
                SELECT * FROM feedback_history 
                WHERE conversation_id = ? 
                ORDER BY created_at ASC
            `;
            return await this.db.query<FeedbackRow[]>(sql, [conversationId]);
        } catch (error) {
            console.error('FeedbackRepository: Error getting conversation feedback:', error);
            return [];
        }
    }

    /**
     * Feedback detayını getir
     */
    async getById(feedbackId: number): Promise<FeedbackRow | null> {
        try {
            const sql = 'SELECT * FROM feedback_history WHERE feedback_id = ?';
            const rows = await this.db.query<FeedbackRow[]>(sql, [feedbackId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('FeedbackRepository: Error getting feedback:', error);
            return null;
        }
    }

    /**
     * Kullanıcının hata türlerine göre istatistikleri
     */
    async getUserErrorStats(userId: number): Promise<any[]> {
        try {
            const sql = `
                SELECT 
                    feedback_type,
                    sentence_status,
                    COUNT(*) as count,
                    AVG(overall_score) as avg_score
                FROM feedback_history 
                WHERE user_id = ?
                GROUP BY feedback_type, sentence_status
                ORDER BY count DESC
            `;
            return await this.db.query<RowDataPacket[]>(sql, [userId]);
        } catch (error) {
            console.error('FeedbackRepository: Error getting user error stats:', error);
            return [];
        }
    }

    /**
     * Kullanıcının toplam feedback sayısı
     */
    async getUserFeedbackCount(userId: number): Promise<number> {
        try {
            const sql = 'SELECT COUNT(*) as count FROM feedback_history WHERE user_id = ?';
            const rows = await this.db.query<RowDataPacket[]>(sql, [userId]);
            return rows[0]?.count || 0;
        } catch (error) {
            console.error('FeedbackRepository: Error getting feedback count:', error);
            return 0;
        }
    }

    /**
     * Hatalı cümleleri getir (has_errors olanlar)
     */
    async getUserMistakes(userId: number, limit: number = 20): Promise<FeedbackRow[]> {
        try {
            const sql = `
                SELECT * FROM feedback_history 
                WHERE user_id = ? AND sentence_status = 'has_errors'
                ORDER BY created_at DESC 
                LIMIT ?
            `;
            return await this.db.query<FeedbackRow[]>(sql, [userId, limit]);
        } catch (error) {
            console.error('FeedbackRepository: Error getting user mistakes:', error);
            return [];
        }
    }
}

export default FeedbackRepository;
