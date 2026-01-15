/**
 * Real-Time Speaking Partner - Type Definitions
 * Bu dosya class diagram'daki tüm temel tipleri tanımlar
 */

// Stream tipi - audio capture için kullanılır
export interface Stream {
    data: ArrayBuffer;
    format: string;
    sampleRate: number;
    isActive: boolean;
}

// Audio tipi - ses verisi için
export interface Audio {
    buffer: ArrayBuffer;
    duration: number;
    format: string;
    sampleRate: number;
}

// Score tipi - değerlendirme sonuçları için
export interface Score {
    value: number;      // 0-100 arası
    category: string;   // grammar, fluency
    details: string;
    timestamp: Date;
}

// Report tipi - feedback raporu için
export interface Report {
    sessionId: number;
    userId: number;
    grammarScore: Score;
    fluencyScore: Score;
    overallScore: number;
    feedback: string[];
    suggestions: string[];
    timestamp: Date;
}

// Intent tipi - NLP intent analizi için
export interface Intent {
    action: string;
    entities: Map<string, string>;
    confidence: number;
    rawText: string;
}

// Context tipi - konuşma bağlamı için
export interface Context {
    sessionId: number;
    topicId: number;
    topicName?: string;
    topicDescription?: string;
    topicCategory?: string;
    targetLanguage?: string; // Hedef dil (English, Spanish, French, vb.)
    nativeLanguage?: string; // Kullanıcının ana dili
    conversationHistory: string[];
    userProfile: {
        userId: number;
        proficiencyLevel: string;
        preferredTopics: string[];
    };
    currentTurn: number;
}

// Topic tipi - konuşma konuları için
export interface Topic {
    topicId: number;
    name: string;
    description: string;
    difficulty: string;
    category: string;
    keywords: string[];
    isActive: boolean;
}

// Map tipi - credentials ve scores için generic map
export type DataMap = Map<string, any>;
