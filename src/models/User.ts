/**
 * User Class
 * Class Diagram'dan: Data Model & Persistence katmanı
 * 
 * Attributes:
 * - userId: int
 * - name: String
 * - email: String
 * - password: String
 * 
 * Methods:
 * + getName(): String
 * + getEmail(): String
 * 
 * Relations:
 * - User owns PracticeSession (1 to 0..*)
 */

import { PracticeSession } from './PracticeSession';

export class User {
    // Private attributes - Class Diagram'a göre
    private userId: number;
    private name: string;
    private email: string;
    private password: string;

    // Relation: User owns PracticeSession (1 to 0..*)
    private practiceSessions: PracticeSession[];

    constructor(userId: number, name: string, email: string, password: string = '') {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.password = password;
        this.practiceSessions = []; // 0..* ilişki - başlangıçta boş
    }

    /**
     * + getName(): String
     * Kullanıcının adını döndürür
     */
    public getName(): string {
        return this.name;
    }

    /**
     * + getEmail(): String
     * Kullanıcının email adresini döndürür
     */
    public getEmail(): string {
        return this.email;
    }

    // Ek yardımcı metodlar (class diagram'da implicit)
    
    public getUserId(): number {
        return this.userId;
    }

    public getPassword(): string {
        return this.password;
    }

    public setName(name: string): void {
        this.name = name;
    }

    public setEmail(email: string): void {
        this.email = email;
    }

    public setPassword(password: string): void {
        this.password = password;
    }

    /**
     * Relation method: User owns PracticeSession
     * Kullanıcıya yeni bir practice session ekler
     */
    public addPracticeSession(session: PracticeSession): void {
        this.practiceSessions.push(session);
    }

    /**
     * Relation method: User owns PracticeSession
     * Kullanıcının tüm practice session'larını döndürür
     */
    public getPracticeSessions(): PracticeSession[] {
        return this.practiceSessions;
    }

    /**
     * Belirli bir session'ı ID'ye göre getirir
     */
    public getPracticeSessionById(sessionId: number): PracticeSession | undefined {
        return this.practiceSessions.find(session => session.getSessionId() === sessionId);
    }
}
