/**
 * TopicManager Class
 * Class Diagram'dan: Backend Web Services & Controllers katmanı
 * 
 * Methods:
 * + createTopic(topic: Topic): boolean
 * + updateTopic(topicId: int, topic: Topic): boolean
 * + deleteTopic(topicId: int): boolean
 * + getAvailableTopics(): List
 * 
 * Relations:
 * - TopicManager manages content -> Database
 */

import { Database } from '../database/Database';
import { Topic } from '../models/types';

export class TopicManager {
    // Relation: TopicManager manages content -> Database
    private database: Database;

    constructor(database: Database) {
        this.database = database;
        
        console.log('TopicManager: Topic manager initialized');
    }

    /**
     * + createTopic(topic: Topic): boolean
     * Yeni bir konuşma konusu oluşturur
     * Relation: TopicManager manages content -> Database
     */
    public createTopic(topic: Topic): boolean {
        console.log(`TopicManager: Creating topic "${topic.name}"...`);
        
        // Topic validasyonu
        if (!this.validateTopic(topic)) {
            console.log('TopicManager: Invalid topic data');
            return false;
        }
        
        // Yeni ID ata (eğer yoksa)
        if (!topic.topicId || topic.topicId === 0) {
            topic.topicId = this.database.generateTopicId();
        }
        
        // Varsayılan olarak aktif
        topic.isActive = true;
        
        // Relation: TopicManager manages content -> Database
        const success = this.database.storeTopic(topic);
        
        if (success) {
            console.log(`TopicManager: Topic "${topic.name}" created with ID ${topic.topicId}`);
        }
        
        return success;
    }

    /**
     * + updateTopic(topicId: int, topic: Topic): boolean
     * Mevcut bir konuyu günceller
     * Relation: TopicManager manages content -> Database
     */
    public updateTopic(topicId: number, topic: Topic): boolean {
        console.log(`TopicManager: Updating topic ${topicId}...`);
        
        // Konu varlığını kontrol et
        const existingTopic = this.database.getTopicById(topicId);
        if (!existingTopic) {
            console.log(`TopicManager: Topic ${topicId} not found`);
            return false;
        }
        
        // Topic validasyonu
        if (!this.validateTopic(topic)) {
            console.log('TopicManager: Invalid topic data');
            return false;
        }
        
        // ID'yi koru
        topic.topicId = topicId;
        
        // Relation: TopicManager manages content -> Database
        const success = this.database.updateTopic(topicId, topic);
        
        if (success) {
            console.log(`TopicManager: Topic ${topicId} updated successfully`);
        }
        
        return success;
    }

    /**
     * + deleteTopic(topicId: int): boolean
     * Bir konuyu siler (soft delete)
     * Relation: TopicManager manages content -> Database
     */
    public deleteTopic(topicId: number): boolean {
        console.log(`TopicManager: Deleting topic ${topicId}...`);
        
        // Konu varlığını kontrol et
        const existingTopic = this.database.getTopicById(topicId);
        if (!existingTopic) {
            console.log(`TopicManager: Topic ${topicId} not found`);
            return false;
        }
        
        // Relation: TopicManager manages content -> Database
        const success = this.database.deleteTopic(topicId);
        
        if (success) {
            console.log(`TopicManager: Topic ${topicId} deleted successfully`);
        }
        
        return success;
    }

    /**
     * + getAvailableTopics(): List
     * Tüm aktif konuları listeler
     * Relation: TopicManager manages content -> Database
     */
    public getAvailableTopics(): Topic[] {
        console.log('TopicManager: Fetching available topics...');
        
        // Relation: TopicManager manages content -> Database
        const topics = this.database.fetchTopics('*');
        
        console.log(`TopicManager: Found ${topics.length} available topics`);
        return topics;
    }

    /**
     * Kategoriye göre konuları getirir
     */
    public getTopicsByCategory(category: string): Topic[] {
        console.log(`TopicManager: Fetching topics for category "${category}"...`);
        
        const topics = this.database.fetchTopics(category);
        
        console.log(`TopicManager: Found ${topics.length} topics in category "${category}"`);
        return topics;
    }

    /**
     * Zorluk seviyesine göre konuları getirir
     */
    public getTopicsByDifficulty(difficulty: string): Topic[] {
        console.log(`TopicManager: Fetching topics for difficulty "${difficulty}"...`);
        
        const topics = this.database.fetchTopics(difficulty);
        
        console.log(`TopicManager: Found ${topics.length} topics with difficulty "${difficulty}"`);
        return topics;
    }

    /**
     * Belirli bir konuyu ID'ye göre getirir
     */
    public getTopicById(topicId: number): Topic | undefined {
        console.log(`TopicManager: Fetching topic ${topicId}...`);
        
        return this.database.getTopicById(topicId);
    }

    /**
     * Topic validasyonu
     */
    private validateTopic(topic: Topic): boolean {
        // İsim kontrolü
        if (!topic.name || topic.name.trim().length === 0) {
            return false;
        }
        
        // Açıklama kontrolü
        if (!topic.description || topic.description.trim().length === 0) {
            return false;
        }
        
        // Zorluk seviyesi kontrolü
        const validDifficulties = ['Beginner', 'Intermediate', 'Advanced'];
        if (!topic.difficulty || !validDifficulties.includes(topic.difficulty)) {
            return false;
        }
        
        // Kategori kontrolü
        if (!topic.category || topic.category.trim().length === 0) {
            return false;
        }
        
        return true;
    }
}
