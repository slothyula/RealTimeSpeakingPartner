/**
 * SpeechRecognitionEngine Class
 * Class Diagram'dan: Core Engines (System Components) katmanı
 * 
 * Methods:
 * + convertSpeechToText(audioInput: Audio): String
 * + analyzeIntent(transcribedText: String): Intent
 * 
 * Relations:
 * - SessionController uses -> SpeechRecognitionEngine
 */

import { Audio, Intent } from '../models/types';

export class SpeechRecognitionEngine {
    private language: string;
    private confidence: number;
    
    // Intent pattern'leri
    private intentPatterns: Map<string, RegExp[]>;

    constructor() {
        this.language = 'en-US';
        this.confidence = 0.0;
        this.intentPatterns = new Map();
        
        this.initializeIntentPatterns();
        
        console.log('SpeechRecognitionEngine: Speech recognition engine initialized');
    }

    /**
     * + convertSpeechToText(audioInput: Audio): String
     * Ses girdisini metne dönüştürür (Speech-to-Text)
     * Relation: SessionController uses -> SpeechRecognitionEngine
     */
    public convertSpeechToText(audioInput: Audio): string {
        console.log('SpeechRecognitionEngine: Converting speech to text...');
        
        // Simüle edilmiş STT işlemi
        // Gerçek implementasyonda Web Speech API veya Google Speech-to-Text kullanılır
        
        // Audio validasyonu
        if (!audioInput || !audioInput.buffer) {
            console.error('SpeechRecognitionEngine: Invalid audio input');
            return '';
        }
        
        // Simüle edilmiş transkripsiyon
        const transcribedText = this.simulateTranscription(audioInput);
        
        // Confidence değerini güncelle
        this.confidence = 0.85 + Math.random() * 0.15; // 0.85-1.0 arası
        
        console.log(`SpeechRecognitionEngine: Transcription complete - Confidence: ${(this.confidence * 100).toFixed(1)}%`);
        console.log(`SpeechRecognitionEngine: Transcribed text: "${transcribedText}"`);
        
        return transcribedText;
    }

    /**
     * + analyzeIntent(transcribedText: String): Intent
     * Metinden kullanıcı niyetini analiz eder (NLU)
     * Relation: SessionController uses -> SpeechRecognitionEngine
     */
    public analyzeIntent(transcribedText: string): Intent {
        console.log('SpeechRecognitionEngine: Analyzing intent...');
        
        const lowercaseText = transcribedText.toLowerCase();
        let detectedAction = 'unknown';
        let confidence = 0.5;
        const entities = new Map<string, string>();
        
        // Intent pattern matching
        for (const [intentName, patterns] of this.intentPatterns) {
            for (const pattern of patterns) {
                if (pattern.test(lowercaseText)) {
                    detectedAction = intentName;
                    confidence = 0.8 + Math.random() * 0.2;
                    break;
                }
            }
            if (detectedAction !== 'unknown') break;
        }
        
        // Entity extraction (basit implementasyon)
        this.extractEntities(lowercaseText, entities);
        
        const intent: Intent = {
            action: detectedAction,
            entities: entities,
            confidence: confidence,
            rawText: transcribedText
        };
        
        console.log(`SpeechRecognitionEngine: Intent detected - Action: ${intent.action}, Confidence: ${(intent.confidence * 100).toFixed(1)}%`);
        
        return intent;
    }

    /**
     * Ses transkripsiyon simülasyonu
     * Gerçek implementasyonda bu kısım gerçek STT API'si kullanır
     */
    private simulateTranscription(audioInput: Audio): string {
        // Demo amaçlı örnek cümleler
        const sampleResponses = [
            "Hello, how are you today?",
            "I would like to practice my English speaking skills.",
            "Can you help me improve my pronunciation?",
            "What topics can we discuss today?",
            "I think learning English is very important for my career.",
            "Could you please repeat that more slowly?",
            "I want to talk about travel and different cultures.",
            "Thank you for helping me practice.",
            "My favorite hobby is reading books.",
            "I am trying to improve my fluency in English."
        ];
        
        // Audio süresine göre uygun bir yanıt seç
        // Daha uzun ses için daha uzun cümle seç
        const durationFactor = Math.min(audioInput.duration / 5, 1);
        const index = Math.floor(durationFactor * sampleResponses.length) % sampleResponses.length;
        return sampleResponses[index];
    }

    /**
     * Intent pattern'lerini başlatır
     */
    private initializeIntentPatterns(): void {
        this.intentPatterns.set('greeting', [
            /^(hello|hi|hey|good morning|good afternoon|good evening)/i,
            /how are you/i,
            /nice to meet/i
        ]);
        
        this.intentPatterns.set('question', [
            /^(what|where|when|why|how|who|which|can you|could you|would you)/i,
            /\?$/
        ]);
        
        this.intentPatterns.set('request', [
            /^(please|can i|could i|i want|i would like|i need)/i,
            /help me/i
        ]);
        
        this.intentPatterns.set('statement', [
            /^(i think|i believe|in my opinion|i feel)/i,
            /^(the|this|that|it is|there is)/i
        ]);
        
        this.intentPatterns.set('agreement', [
            /^(yes|yeah|sure|okay|alright|i agree|exactly|right)/i
        ]);
        
        this.intentPatterns.set('disagreement', [
            /^(no|nope|i disagree|i don't think|not really)/i
        ]);
        
        this.intentPatterns.set('farewell', [
            /^(bye|goodbye|see you|take care|thanks|thank you)/i,
            /have a (good|nice)/i
        ]);
        
        this.intentPatterns.set('topic_change', [
            /let's talk about/i,
            /can we discuss/i,
            /change (the )?topic/i
        ]);
    }

    /**
     * Metinden entity'leri çıkarır
     */
    private extractEntities(text: string, entities: Map<string, string>): void {
        // Topic extraction
        const topicPatterns = [
            { pattern: /about\s+(\w+(?:\s+\w+)?)/i, entity: 'topic' },
            { pattern: /discuss\s+(\w+(?:\s+\w+)?)/i, entity: 'topic' },
            { pattern: /practice\s+(\w+)/i, entity: 'skill' }
        ];
        
        for (const { pattern, entity } of topicPatterns) {
            const match = text.match(pattern);
            if (match) {
                entities.set(entity, match[1]);
            }
        }
        
        // Time expressions
        const timePatterns = [
            { pattern: /\b(today|tomorrow|yesterday)\b/i, entity: 'time' },
            { pattern: /\b(morning|afternoon|evening|night)\b/i, entity: 'time_of_day' }
        ];
        
        for (const { pattern, entity } of timePatterns) {
            const match = text.match(pattern);
            if (match) {
                entities.set(entity, match[1]);
            }
        }
    }

    /**
     * Dil ayarını değiştirir
     */
    public setLanguage(language: string): void {
        this.language = language;
        console.log(`SpeechRecognitionEngine: Language set to ${language}`);
    }

    /**
     * Son transkripsiyon güvenilirlik değerini döndürür
     */
    public getLastConfidence(): number {
        return this.confidence;
    }

    /**
     * Mevcut dili döndürür
     */
    public getLanguage(): string {
        return this.language;
    }
}
