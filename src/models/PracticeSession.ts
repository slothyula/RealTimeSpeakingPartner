/**
 * PracticeSession Class
 * Class Diagram'dan: Data Model & Persistence katmanı
 * 
 * Attributes:
 * - sessionId: int
 * - topicId: int
 * - userId: int
 * - startTime: DateTime
 * - endTime: DateTime
 * 
 * Methods:
 * + getDetails(): String
 * 
 * Relations:
 * - User owns PracticeSession (0..* side)
 */

export class PracticeSession {
    // Private attributes - Class Diagram'a göre
    private sessionId: number;
    private topicId: number;
    private userId: number;
    private startTime: Date;
    private endTime: Date;

    constructor(
        sessionId: number,
        topicId: number,
        userId: number,
        startTime: Date,
        endTime: Date
    ) {
        this.sessionId = sessionId;
        this.topicId = topicId;
        this.userId = userId;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    /**
     * + getDetails(): String
     * Session detaylarını string olarak döndürür
     */
    public getDetails(): string {
        const duration = this.calculateDuration();
        return `Session ID: ${this.sessionId}\n` +
               `Topic ID: ${this.topicId}\n` +
               `User ID: ${this.userId}\n` +
               `Start Time: ${this.startTime.toISOString()}\n` +
               `End Time: ${this.endTime.toISOString()}\n` +
               `Duration: ${duration} minutes`;
    }

    // Ek yardımcı metodlar (class diagram'da implicit)

    public getSessionId(): number {
        return this.sessionId;
    }

    public getTopicId(): number {
        return this.topicId;
    }

    public getUserId(): number {
        return this.userId;
    }

    public getStartTime(): Date {
        return this.startTime;
    }

    public getEndTime(): Date {
        return this.endTime;
    }

    public setEndTime(endTime: Date): void {
        this.endTime = endTime;
    }

    /**
     * Session süresini dakika olarak hesaplar
     */
    private calculateDuration(): number {
        const diffMs = this.endTime.getTime() - this.startTime.getTime();
        return Math.round(diffMs / 60000); // milliseconds to minutes
    }

    /**
     * Session'ın aktif olup olmadığını kontrol eder
     */
    public isActive(): boolean {
        return this.endTime === null || this.endTime > new Date();
    }
}
