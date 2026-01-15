/**
 * Database Class
 * Class Diagram'dan: Data Model & Persistence katmanı
 * 
 * Methods:
 * + storeUser(user: User): boolean
 * + validateUserCredentials(email: String, password: String): boolean
 * + storePerformanceData(sessionId: int, scores: Map): void
 * + fetchPerformanceHistory(userId: int): List
 * + fetchTopics(filter: String): List
 * 
 * Relations:
 * - AuthController creates User via Database
 * - AuthController validates via Database
 * - TopicManager manages content via Database
 * - SessionController stores results via Database
 */

import { User } from '../models/User';
import { PracticeSession } from '../models/PracticeSession';
import { Topic, DataMap } from '../models/types';

export class Database {
    // In-memory storage (gerçek projede SQL/NoSQL database olur)
    private users: Map<number, User>;
    private topics: Map<number, Topic>;
    private performanceData: Map<number, any[]>; // sessionId -> scores
    private sessions: Map<number, PracticeSession>;
    
    private nextUserId: number = 1;
    private nextTopicId: number = 1;
    private nextSessionId: number = 1;

    constructor() {
        this.users = new Map();
        this.topics = new Map();
        this.performanceData = new Map();
        this.sessions = new Map();
        
        // Örnek topic'ler ekle
        this.initializeDefaultTopics();
    }

    /**
     * + storeUser(user: User): boolean
     * Yeni kullanıcıyı veritabanına kaydeder
     * Relation: AuthController creates -> Database
     */
    public storeUser(user: User): boolean {
        try {
            // Email benzersizliği kontrolü
            for (const existingUser of this.users.values()) {
                if (existingUser.getEmail() === user.getEmail()) {
                    console.log(`Database: User with email ${user.getEmail()} already exists`);
                    return false;
                }
            }
            
            this.users.set(user.getUserId(), user);
            console.log(`Database: User ${user.getName()} stored successfully`);
            return true;
        } catch (error) {
            console.error('Database: Error storing user:', error);
            return false;
        }
    }

    /**
     * + validateUserCredentials(email: String, password: String): boolean
     * Kullanıcı kimlik bilgilerini doğrular
     * Relation: AuthController validates -> Database
     */
    public validateUserCredentials(email: string, password: string): boolean {
        for (const user of this.users.values()) {
            if (user.getEmail() === email && user.getPassword() === password) {
                console.log(`Database: Credentials validated for ${email}`);
                return true;
            }
        }
        console.log(`Database: Invalid credentials for ${email}`);
        return false;
    }

    /**
     * + storePerformanceData(sessionId: int, scores: Map): void
     * Session performans verilerini kaydeder
     * Relation: SessionController stores results -> Database
     */
    public storePerformanceData(sessionId: number, scores: DataMap): void {
        try {
            if (!this.performanceData.has(sessionId)) {
                this.performanceData.set(sessionId, []);
            }
            
            const scoreEntry = {
                timestamp: new Date(),
                scores: Object.fromEntries(scores)
            };
            
            this.performanceData.get(sessionId)!.push(scoreEntry);
            console.log(`Database: Performance data stored for session ${sessionId}`);
        } catch (error) {
            console.error('Database: Error storing performance data:', error);
        }
    }

    /**
     * + fetchPerformanceHistory(userId: int): List
     * Kullanıcının performans geçmişini getirir
     */
    public fetchPerformanceHistory(userId: number): any[] {
        const history: any[] = [];
        
        // Kullanıcının session'larını bul
        for (const session of this.sessions.values()) {
            if (session.getUserId() === userId) {
                const sessionId = session.getSessionId();
                const performanceData = this.performanceData.get(sessionId);
                
                if (performanceData) {
                    history.push({
                        sessionId: sessionId,
                        sessionDetails: session.getDetails(),
                        performance: performanceData
                    });
                }
            }
        }
        
        console.log(`Database: Fetched ${history.length} performance records for user ${userId}`);
        return history;
    }

    /**
     * + fetchTopics(filter: String): List
     * Filtreye göre topic'leri getirir
     * Relation: TopicManager manages content -> Database
     */
    public fetchTopics(filter: string): Topic[] {
        const filteredTopics: Topic[] = [];
        
        for (const topic of this.topics.values()) {
            if (filter === '' || filter === '*') {
                // Tüm aktif topic'leri getir
                if (topic.isActive) {
                    filteredTopics.push(topic);
                }
            } else if (
                topic.name.toLowerCase().includes(filter.toLowerCase()) ||
                topic.category.toLowerCase().includes(filter.toLowerCase()) ||
                topic.difficulty.toLowerCase() === filter.toLowerCase()
            ) {
                if (topic.isActive) {
                    filteredTopics.push(topic);
                }
            }
        }
        
        console.log(`Database: Fetched ${filteredTopics.length} topics with filter "${filter}"`);
        return filteredTopics;
    }

    // Ek yardımcı metodlar

    /**
     * Kullanıcıyı email'e göre getirir
     */
    public getUserByEmail(email: string): User | undefined {
        for (const user of this.users.values()) {
            if (user.getEmail() === email) {
                return user;
            }
        }
        return undefined;
    }

    /**
     * Kullanıcıyı ID'ye göre getirir
     */
    public getUserById(userId: number): User | undefined {
        return this.users.get(userId);
    }

    /**
     * Topic'i ID'ye göre getirir
     */
    public getTopicById(topicId: number): Topic | undefined {
        return this.topics.get(topicId);
    }

    /**
     * Yeni topic ekler
     */
    public storeTopic(topic: Topic): boolean {
        try {
            this.topics.set(topic.topicId, topic);
            console.log(`Database: Topic "${topic.name}" stored successfully`);
            return true;
        } catch (error) {
            console.error('Database: Error storing topic:', error);
            return false;
        }
    }

    /**
     * Topic günceller
     */
    public updateTopic(topicId: number, topic: Topic): boolean {
        if (this.topics.has(topicId)) {
            this.topics.set(topicId, topic);
            console.log(`Database: Topic ${topicId} updated successfully`);
            return true;
        }
        console.log(`Database: Topic ${topicId} not found`);
        return false;
    }

    /**
     * Topic siler (soft delete)
     */
    public deleteTopic(topicId: number): boolean {
        const topic = this.topics.get(topicId);
        if (topic) {
            topic.isActive = false;
            console.log(`Database: Topic ${topicId} deleted (deactivated)`);
            return true;
        }
        console.log(`Database: Topic ${topicId} not found`);
        return false;
    }

    /**
     * Session kaydeder
     */
    public storeSession(session: PracticeSession): boolean {
        try {
            this.sessions.set(session.getSessionId(), session);
            console.log(`Database: Session ${session.getSessionId()} stored successfully`);
            return true;
        } catch (error) {
            console.error('Database: Error storing session:', error);
            return false;
        }
    }

    /**
     * Yeni kullanıcı ID'si üretir
     */
    public generateUserId(): number {
        return this.nextUserId++;
    }

    /**
     * Yeni topic ID'si üretir
     */
    public generateTopicId(): number {
        return this.nextTopicId++;
    }

    /**
     * Yeni session ID'si üretir
     */
    public generateSessionId(): number {
        return this.nextSessionId++;
    }

    /**
     * Varsayılan topic'leri başlangıçta ekler
     */
    private initializeDefaultTopics(): void {
        const defaultTopics: Topic[] = [
            {
                topicId: this.generateTopicId(),
                name: 'Daily Conversations',
                description: 'Practice everyday conversations and common phrases',
                difficulty: 'Beginner',
                category: 'General',
                keywords: ['greetings', 'weather', 'shopping', 'directions'],
                isActive: true
            },
            {
                topicId: this.generateTopicId(),
                name: 'Business English',
                description: 'Professional communication and workplace scenarios',
                difficulty: 'Intermediate',
                category: 'Business',
                keywords: ['meetings', 'presentations', 'negotiations', 'emails'],
                isActive: true
            },
            {
                topicId: this.generateTopicId(),
                name: 'Travel and Tourism',
                description: 'Conversations for traveling and exploring new places',
                difficulty: 'Beginner',
                category: 'Travel',
                keywords: ['airport', 'hotel', 'restaurant', 'sightseeing'],
                isActive: true
            },
            {
                topicId: this.generateTopicId(),
                name: 'Academic Discussions',
                description: 'Complex discussions on academic and scientific topics',
                difficulty: 'Advanced',
                category: 'Academic',
                keywords: ['research', 'analysis', 'debate', 'presentation'],
                isActive: true
            }
        ];

        for (const topic of defaultTopics) {
            this.topics.set(topic.topicId, topic);
        }
        
        console.log('Database: Default topics initialized');
    }
}
