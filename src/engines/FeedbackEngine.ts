/**
 * FeedbackEngine Class
 * Class Diagram'dan: Core Engines (System Components) katmanı
 * 
 * Methods:
 * + evaluateGrammar(transcribedText: String): Score
 * + measureFluency(transcribedText: String, audioData: Audio): Score
 * + provideSessionFeedback(sessionId: int): Report
 * 
 * Relations:
 * - SessionController uses -> FeedbackEngine
 */

import { Score, Report, Audio } from '../models/types';
import { Database } from '../database/Database';

export class FeedbackEngine {
    // Relation: FeedbackEngine uses Database for storing results
    private _database: Database;
    
    // Grammar kuralları
    private grammarPatterns: RegExp[];
    
    // Session'a özel feedback verileri
    private sessionFeedbackData: Map<number, {
        grammarScores: Score[];
        fluencyScores: Score[];
    }>;

    constructor(database: Database) {
        this._database = database;
        this.grammarPatterns = [];
        this.sessionFeedbackData = new Map();
        
        this.initializeGrammarPatterns();
        
        console.log('FeedbackEngine: Feedback engine initialized');
    }

    /**
     * + evaluateGrammar(transcribedText: String): Score
     * Gramer doğruluğunu değerlendirir
     * Relation: SessionController uses -> FeedbackEngine
     */
    public evaluateGrammar(transcribedText: string): Score {
        console.log('FeedbackEngine: Evaluating grammar...');
        
        let totalScore = 100;
        const issues: string[] = [];
        
        // Gramer hatalarını kontrol et
        for (const pattern of this.grammarPatterns) {
            if (pattern.test(transcribedText)) {
                totalScore -= 10;
                issues.push(`Grammar issue detected`);
            }
        }
        
        // Cümle yapısı kontrolü
        const sentences = transcribedText.split(/[.!?]+/);
        for (const sentence of sentences) {
            if (sentence.trim().length > 0) {
                const sentenceScore = this.analyzeSentenceStructure(sentence);
                if (sentenceScore < 80) {
                    totalScore -= 5;
                    issues.push(`Sentence structure needs improvement`);
                }
            }
        }
        
        // Skor 0'ın altına düşmesin
        totalScore = Math.max(0, totalScore);
        
        const score: Score = {
            value: totalScore,
            category: 'grammar',
            details: issues.length > 0 
                ? `Issues found: ${issues.slice(0, 3).join('; ')}` 
                : 'Grammar is correct!',
            timestamp: new Date()
        };
        
        console.log(`FeedbackEngine: Grammar score: ${score.value}`);
        return score;
    }

    /**
     * + measureFluency(transcribedText: String, audioData: Audio): Score
     * Akıcılığı ölçer (konuşma hızı, duraklamalar, tutarlılık)
     * Relation: SessionController uses -> FeedbackEngine
     */
    public measureFluency(transcribedText: string, audioData: Audio): Score {
        console.log('FeedbackEngine: Measuring fluency...');
        
        let totalScore = 100;
        const details: string[] = [];
        
        // Kelime sayısı ve süre hesaplama
        const wordCount = transcribedText.split(/\s+/).length;
        const duration = audioData.duration; // saniye cinsinden
        const wordsPerMinute = (wordCount / duration) * 60;
        
        // İdeal konuşma hızı: 120-150 kelime/dakika
        if (wordsPerMinute < 100) {
            totalScore -= 15;
            details.push('Speaking pace is too slow');
        } else if (wordsPerMinute > 180) {
            totalScore -= 10;
            details.push('Speaking pace is too fast');
        } else {
            details.push('Good speaking pace');
        }
        
        // Duraklama analizi (simülasyon)
        const pauseScore = this.analyzePauses(audioData);
        if (pauseScore < 70) {
            totalScore -= 10;
            details.push('Too many hesitations detected');
        }
        
        // Tutarlılık kontrolü
        const coherenceScore = this.analyzeCoherence(transcribedText);
        if (coherenceScore < 70) {
            totalScore -= 10;
            details.push('Speech coherence needs improvement');
        }
        
        // Skor 0'ın altına düşmesin
        totalScore = Math.max(0, totalScore);
        
        const score: Score = {
            value: totalScore,
            category: 'fluency',
            details: details.join('; '),
            timestamp: new Date()
        };
        
        console.log(`FeedbackEngine: Fluency score: ${score.value}`);
        return score;
    }

    /**
     * + provideSessionFeedback(sessionId: int): Report
     * Session için detaylı feedback raporu oluşturur
     * Relation: SessionController uses -> FeedbackEngine
     */
    public provideSessionFeedback(sessionId: number): Report {
        console.log(`FeedbackEngine: Generating session feedback for session ${sessionId}...`);
        
        const sessionData = this.sessionFeedbackData.get(sessionId);
        
        // Varsayılan skorlar (eğer veri yoksa)
        let grammarScore: Score = {
            value: 80,
            category: 'grammar',
            details: 'No data available',
            timestamp: new Date()
        };
        
        let fluencyScore: Score = {
            value: 75,
            category: 'fluency',
            details: 'No data available',
            timestamp: new Date()
        };
        
        // Session verileri varsa ortalama al
        if (sessionData) {
            if (sessionData.grammarScores.length > 0) {
                const avgGrammar = this.calculateAverageScore(sessionData.grammarScores);
                grammarScore = {
                    ...sessionData.grammarScores[sessionData.grammarScores.length - 1],
                    value: avgGrammar
                };
            }
            
            if (sessionData.fluencyScores.length > 0) {
                const avgFluency = this.calculateAverageScore(sessionData.fluencyScores);
                fluencyScore = {
                    ...sessionData.fluencyScores[sessionData.fluencyScores.length - 1],
                    value: avgFluency
                };
            }
        }
        
        // Genel skor hesapla
        const overallScore = Math.round(
            (grammarScore.value * 0.50) + 
            (fluencyScore.value * 0.50)
        );
        
        // Feedback ve öneriler oluştur
        const feedback = this.generateFeedback(grammarScore, fluencyScore);
        const suggestions = this.generateSuggestions(grammarScore, fluencyScore);
        
        const report: Report = {
            sessionId: sessionId,
            userId: 0, // Session'dan alınacak
            grammarScore: grammarScore,
            fluencyScore: fluencyScore,
            overallScore: overallScore,
            feedback: feedback,
            suggestions: suggestions,
            timestamp: new Date()
        };
        
        console.log(`FeedbackEngine: Session feedback generated - Overall score: ${overallScore}`);
        return report;
    }

    /**
     * Session için skor ekler (internal tracking)
     */
    public addSessionScore(sessionId: number, score: Score): void {
        if (!this.sessionFeedbackData.has(sessionId)) {
            this.sessionFeedbackData.set(sessionId, {
                grammarScores: [],
                fluencyScores: []
            });
        }
        
        const sessionData = this.sessionFeedbackData.get(sessionId)!;
        
        switch (score.category) {
            case 'grammar':
                sessionData.grammarScores.push(score);
                break;
            case 'fluency':
                sessionData.fluencyScores.push(score);
                break;
        }
    }

    // Private helper methods

    private initializeGrammarPatterns(): void {
        // Yaygın gramer hataları için regex pattern'ler
        this.grammarPatterns = [
            /\bi\s+is\b/i,           // "I is" hatası
            /\bhe\s+are\b/i,         // "he are" hatası
            /\bshe\s+are\b/i,        // "she are" hatası
            /\bthey\s+is\b/i,        // "they is" hatası
            /\bdoes\s+\w+s\b/i,      // "does runs" hatası
            /\bmore\s+\w+er\b/i,     // "more better" hatası
        ];
    }

    private analyzeSentenceStructure(sentence: string): number {
        // Basit cümle yapısı analizi
        const words = sentence.trim().split(/\s+/);
        if (words.length < 3) return 60;
        if (words.length > 25) return 70;
        return 85 + Math.random() * 15;
    }

    private analyzePauses(audioData: Audio): number {
        // Simüle edilmiş duraklama analizi
        // Audio süresine göre duraklama tahmini
        const pauseFactor = audioData.duration > 10 ? 0.9 : 1.0;
        return (70 + Math.random() * 30) * pauseFactor;
    }

    private analyzeCoherence(text: string): number {
        // Simüle edilmiş tutarlılık analizi
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length === 0) return 50;
        return 75 + Math.random() * 25;
    }

    private calculateAverageScore(scores: Score[]): number {
        if (scores.length === 0) return 0;
        const total = scores.reduce((sum, score) => sum + score.value, 0);
        return Math.round(total / scores.length);
    }

    private generateFeedback(grammar: Score, fluency: Score): string[] {
        const feedback: string[] = [];
        
        if (grammar.value >= 80) {
            feedback.push('Excellent grammar usage!');
        } else if (grammar.value >= 60) {
            feedback.push('Good grammar with some minor errors.');
        } else {
            feedback.push('Pay more attention to grammar rules.');
        }
        
        if (fluency.value >= 80) {
            feedback.push('You speak fluently and naturally!');
        } else if (fluency.value >= 60) {
            feedback.push('Your fluency is developing well.');
        } else {
            feedback.push('Try to reduce hesitations for better fluency.');
        }
        
        return feedback;
    }

    private generateSuggestions(grammar: Score, fluency: Score): string[] {
        const suggestions: string[] = [];
        
        if (grammar.value < 80) {
            suggestions.push('Review basic grammar rules');
            suggestions.push('Practice forming complete sentences');
        }
        
        if (fluency.value < 80) {
            suggestions.push('Practice speaking without long pauses');
            suggestions.push('Read aloud daily to improve flow');
        }
        
        if (suggestions.length === 0) {
            suggestions.push('Keep up the great work!');
            suggestions.push('Try more challenging topics');
        }
        
        return suggestions;
    }

    /**
     * Database instance'ını döndürür
     * Relation: FeedbackEngine uses Database
     */
    public getDatabase(): Database {
        return this._database;
    }
}
