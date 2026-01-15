/**
 * Topic Repository
 * Konu veritabanı işlemleri
 */

import { RowDataPacket } from 'mysql2/promise';
import MySQLConnection from '../MySQLConnection';

export interface TopicRow extends RowDataPacket {
    topic_id: number;
    name: string;
    description: string | null;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    target_language: string; // Hangi dil için konuşma pratiği (English, Spanish, French, vb.)
    sample_questions: string | null;
    is_active: boolean;
    usage_count: number;
    created_at: Date;
    updated_at: Date;
}

export class TopicRepository {
    private db: MySQLConnection;

    constructor() {
        this.db = MySQLConnection.getInstance();
    }

    /**
     * Kullanım durumuna göre aktif/pasif güncelle
     * usage_count > 0 ise aktif, 0 ise pasif
     */
    async updateActiveStatusByUsage(): Promise<void> {
        // Aktif yap: usage_count > 0
        await this.db.execute('UPDATE topics SET is_active = TRUE WHERE usage_count > 0');
        // Pasif yap: usage_count = 0
        await this.db.execute('UPDATE topics SET is_active = FALSE WHERE usage_count = 0');
    }

    /**
     * Yeni konu oluştur
     */
    async create(
        name: string,
        description: string,
        category: string,
        difficulty: string,
        targetLanguage: string = 'English',
        sampleQuestions?: string[]
    ): Promise<number | null> {
        try {
            const sql = `
                INSERT INTO topics (name, description, category, difficulty, target_language, sample_questions)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const result = await this.db.execute(sql, [
                name,
                description,
                category,
                difficulty,
                targetLanguage,
                sampleQuestions ? JSON.stringify(sampleQuestions) : null
            ]);
            return result.insertId;
        } catch (error) {
            console.error('TopicRepository: Error creating topic:', error);
            return null;
        }
    }

    /**
     * ID ile konu bul
     */
    async findById(topicId: number): Promise<TopicRow | null> {
        const sql = 'SELECT * FROM topics WHERE topic_id = ?';
        const rows = await this.db.query<TopicRow[]>(sql, [topicId]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Tüm aktif konular (zorluk seviyesine göre sıralı: beginner -> intermediate -> advanced)
     * @param activeOnly Sadece aktif topic'leri getir
     * @param targetLanguage Belirli bir dil için filtrele (opsiyonel)
     */
    async findAll(activeOnly: boolean = true, targetLanguage?: string): Promise<TopicRow[]> {
        let sql = 'SELECT * FROM topics';
        const conditions: string[] = [];
        const params: any[] = [];
        
        if (activeOnly) {
            conditions.push('is_active = TRUE');
        }
        
        if (targetLanguage) {
            conditions.push('target_language = ?');
            params.push(targetLanguage);
        }
        
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        // Zorluk seviyesine göre sırala: beginner=1, intermediate=2, advanced=3
        sql += ' ORDER BY FIELD(difficulty, "beginner", "intermediate", "advanced"), name';
        return await this.db.query<TopicRow[]>(sql, params);
    }

    /**
     * Kategoriye göre konular
     */
    async findByCategory(category: string, targetLanguage?: string): Promise<TopicRow[]> {
        let sql = 'SELECT * FROM topics WHERE category = ? AND is_active = TRUE';
        const params: any[] = [category];
        
        if (targetLanguage) {
            sql += ' AND target_language = ?';
            params.push(targetLanguage);
        }
        
        sql += ' ORDER BY name';
        return await this.db.query<TopicRow[]>(sql, params);
    }

    /**
     * Zorluk seviyesine göre konular
     */
    async findByDifficulty(difficulty: string, targetLanguage?: string): Promise<TopicRow[]> {
        let sql = 'SELECT * FROM topics WHERE difficulty = ? AND is_active = TRUE';
        const params: any[] = [difficulty];
        
        if (targetLanguage) {
            sql += ' AND target_language = ?';
            params.push(targetLanguage);
        }
        
        sql += ' ORDER BY name';
        return await this.db.query<TopicRow[]>(sql, params);
    }

    /**
     * Dil bazlı konular getir
     */
    async findByLanguage(targetLanguage: string, activeOnly: boolean = true): Promise<TopicRow[]> {
        let sql = 'SELECT * FROM topics WHERE target_language = ?';
        if (activeOnly) {
            sql += ' AND is_active = TRUE';
        }
        sql += ' ORDER BY FIELD(difficulty, "beginner", "intermediate", "advanced"), name';
        return await this.db.query<TopicRow[]>(sql, [targetLanguage]);
    }

    /**
     * En popüler konular
     */
    async findMostPopular(limit: number = 10): Promise<TopicRow[]> {
        const sql = `
            SELECT * FROM topics 
            WHERE is_active = TRUE 
            ORDER BY usage_count DESC 
            LIMIT ?
        `;
        return await this.db.query<TopicRow[]>(sql, [limit]);
    }

    /**
     * Konu güncelle
     */
    async update(topicId: number, updates: {
        name?: string;
        description?: string;
        category?: string;
        difficulty?: string;
        target_language?: string;
        is_active?: boolean;
    }): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.description !== undefined) {
            fields.push('description = ?');
            values.push(updates.description);
        }
        if (updates.category !== undefined) {
            fields.push('category = ?');
            values.push(updates.category);
        }
        if (updates.difficulty !== undefined) {
            fields.push('difficulty = ?');
            values.push(updates.difficulty);
        }
        if (updates.target_language !== undefined) {
            fields.push('target_language = ?');
            values.push(updates.target_language);
        }
        if (updates.is_active !== undefined) {
            fields.push('is_active = ?');
            values.push(updates.is_active);
        }

        if (fields.length === 0) return;

        values.push(topicId);
        const sql = `UPDATE topics SET ${fields.join(', ')} WHERE topic_id = ?`;
        await this.db.execute(sql, values);
    }

    /**
     * Tüm kategorileri listele
     */
    async getCategories(targetLanguage?: string): Promise<string[]> {
        let sql = 'SELECT DISTINCT category FROM topics WHERE is_active = TRUE';
        const params: any[] = [];
        
        if (targetLanguage) {
            sql += ' AND target_language = ?';
            params.push(targetLanguage);
        }
        
        sql += ' ORDER BY category';
        const rows = await this.db.query<RowDataPacket[]>(sql, params);
        return rows.map(row => row.category);
    }

    /**
     * Tüm desteklenen dilleri listele
     */
    async getSupportedLanguages(): Promise<string[]> {
        const sql = 'SELECT DISTINCT target_language FROM topics WHERE is_active = TRUE ORDER BY target_language';
        const rows = await this.db.query<RowDataPacket[]>(sql);
        return rows.map(row => row.target_language || 'English');
    }

    /**
     * Konu sayısı
     */
    async count(): Promise<number> {
        const sql = 'SELECT COUNT(*) as count FROM topics WHERE is_active = TRUE';
        const rows = await this.db.query<RowDataPacket[]>(sql);
        return rows[0].count;
    }

    /**
     * Konu sil (hard delete)
     * Not: conversations tablosunda ON DELETE SET NULL olduğu için 
     * topic silinince conversation'lar silinmez, sadece topic_id NULL olur
     */
    async delete(topicId: number): Promise<boolean> {
        try {
            const sql = 'DELETE FROM topics WHERE topic_id = ?';
            const result = await this.db.execute(sql, [topicId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('TopicRepository: Error deleting topic:', error);
            return false;
        }
    }
}

export default TopicRepository;
