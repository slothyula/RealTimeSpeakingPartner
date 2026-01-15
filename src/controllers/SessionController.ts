/**
 * SessionController Class
 * Class Diagram'dan: Backend Web Services & Controllers katmanı
 * 
 * Methods:
 * + startRecording(): void
 * + sendAudio(audioStream: Stream): void
 * + requestTopics(): List
 * + setTopic(topicId: int): void
 * + sessionEnded(userData: User): void
 * 
 * Relations:
 * - WebInterface manages session -> SessionController
 * - SessionController stores results -> Database
 * - SessionController uses -> TTSModule
 * - SessionController uses -> FeedbackEngine
 * - SessionController uses -> SpeechRecognitionEngine
 * - SessionController uses -> AIEngine
 */

import { Database } from '../database/Database';
import { TTSModule } from '../engines/TTSModule';
import { FeedbackEngine } from '../engines/FeedbackEngine';
import { SpeechRecognitionEngine } from '../engines/SpeechRecognitionEngine';
import { AIEngine } from '../engines/AIEngine';
import { User } from '../models/User';
import { PracticeSession } from '../models/PracticeSession';
import { Stream, Audio, Context, Topic, Report, DataMap } from '../models/types';

export class SessionController {
    // Relations: SessionController uses -> ...
    private database: Database;              // stores results
    private ttsModule: TTSModule;            // uses
    private feedbackEngine: FeedbackEngine;  // uses
    private speechRecognitionEngine: SpeechRecognitionEngine;  // uses
    private aiEngine: AIEngine;              // uses

    // Session state
    private currentSession: PracticeSession | null;
    private currentUser: User | null;
    private currentTopicId: number;
    private isRecording: boolean;
    private conversationContext: Context | null;

    constructor(
        database: Database,
        ttsModule: TTSModule,
        feedbackEngine: FeedbackEngine,
        speechRecognitionEngine: SpeechRecognitionEngine,
        aiEngine: AIEngine
    ) {
        // Initialize all relations
        this.database = database;
        this.ttsModule = ttsModule;
        this.feedbackEngine = feedbackEngine;
        this.speechRecognitionEngine = speechRecognitionEngine;
        this.aiEngine = aiEngine;

        // Initialize state
        this.currentSession = null;
        this.currentUser = null;
        this.currentTopicId = 0;
        this.isRecording = false;
        this.conversationContext = null;

        console.log('SessionController: Session controller initialized');
    }

    /**
     * + startRecording(): void
     * Ses kaydını başlatır
     * Relation: WebInterface manages session -> SessionController
     */
    public startRecording(): void {
        console.log('SessionController: Starting recording...');

        if (!this.currentUser) {
            console.error('SessionController: No user logged in');
            return;
        }

        if (!this.currentTopicId) {
            console.error('SessionController: No topic selected');
            return;
        }

        // Yeni session oluştur
        if (!this.currentSession) {
            const sessionId = this.database.generateSessionId();
            this.currentSession = new PracticeSession(
                sessionId,
                this.currentTopicId,
                this.currentUser.getUserId(),
                new Date(),
                new Date() // Geçici end time
            );

            // Conversation context oluştur
            this.conversationContext = {
                sessionId: sessionId,
                topicId: this.currentTopicId,
                conversationHistory: [],
                userProfile: {
                    userId: this.currentUser.getUserId(),
                    proficiencyLevel: 'intermediate',
                    preferredTopics: []
                },
                currentTurn: 0
            };

            // Relation: SessionController stores results -> Database
            this.database.storeSession(this.currentSession);
        }

        this.isRecording = true;
        console.log(`SessionController: Recording started for session ${this.currentSession.getSessionId()}`);
    }

    /**
     * + sendAudio(audioStream: Stream): void
     * Audio stream'i işler ve yanıt üretir
     * Relations:
     * - SessionController uses -> SpeechRecognitionEngine
     * - SessionController uses -> AIEngine
     * - SessionController uses -> TTSModule
     * - SessionController uses -> FeedbackEngine
     */
    public sendAudio(audioStream: Stream): void {
        console.log('SessionController: Processing audio stream...');

        if (!this.isRecording || !this.currentSession) {
            console.error('SessionController: No active recording session');
            return;
        }

        // Audio stream'i Audio formatına dönüştür
        const audioInput: Audio = {
            buffer: audioStream.data,
            duration: this.estimateAudioDuration(audioStream),
            format: audioStream.format,
            sampleRate: audioStream.sampleRate
        };

        // Relation: SessionController uses -> SpeechRecognitionEngine
        // Speech-to-Text
        const transcribedText = this.speechRecognitionEngine.convertSpeechToText(audioInput);
        
        if (!transcribedText || transcribedText.trim().length === 0) {
            console.log('SessionController: No speech detected');
            return;
        }

        // Intent analizi
        const intent = this.speechRecognitionEngine.analyzeIntent(transcribedText);
        console.log(`SessionController: Detected intent - ${intent.action}`);

        // Relation: SessionController uses -> FeedbackEngine
        // Grammar değerlendirmesi
        const grammarScore = this.feedbackEngine.evaluateGrammar(transcribedText);
        this.feedbackEngine.addSessionScore(this.currentSession.getSessionId(), grammarScore);

        // Fluency değerlendirmesi
        const fluencyScore = this.feedbackEngine.measureFluency(transcribedText, audioInput);
        this.feedbackEngine.addSessionScore(this.currentSession.getSessionId(), fluencyScore);

        // Relation: SessionController uses -> AIEngine
        // AI yanıtı üret
        if (this.conversationContext) {
            this.conversationContext.currentTurn++;
            this.conversationContext.conversationHistory.push(transcribedText);
        }

        const aiResponse = this.aiEngine.generateResponse(transcribedText, this.conversationContext!);

        // Relation: SessionController uses -> TTSModule
        // Text-to-Speech
        const audioResponse = this.ttsModule.synthesizeSpeech(aiResponse);
        console.log(`SessionController: Audio response duration: ${audioResponse.duration}s`);

        // Relation: SessionController stores results -> Database
        // Performans verilerini kaydet
        const scoresMap: DataMap = new Map<string, any>([
            ['grammar', grammarScore.value],
            ['fluency', fluencyScore.value],
            ['transcription', transcribedText],
            ['aiResponse', aiResponse]
        ]);
        this.database.storePerformanceData(this.currentSession.getSessionId(), scoresMap);

        console.log('SessionController: Audio processed successfully');
        console.log(`SessionController: User said: "${transcribedText}"`);
        console.log(`SessionController: AI response: "${aiResponse}"`);
    }

    /**
     * + requestTopics(): List
     * Mevcut konuları getirir
     */
    public requestTopics(): Topic[] {
        console.log('SessionController: Requesting available topics...');

        // Relation: Uses Database indirectly
        const topics = this.database.fetchTopics('*');
        
        console.log(`SessionController: Found ${topics.length} topics`);
        return topics;
    }

    /**
     * + setTopic(topicId: int): void
     * Aktif konuyu ayarlar
     */
    public setTopic(topicId: number): void {
        console.log(`SessionController: Setting topic to ${topicId}...`);

        const topic = this.database.getTopicById(topicId);
        
        if (!topic) {
            console.error(`SessionController: Topic ${topicId} not found`);
            return;
        }

        this.currentTopicId = topicId;
        
        // Context'i güncelle
        if (this.conversationContext) {
            this.conversationContext.topicId = topicId;
        }

        console.log(`SessionController: Topic set to "${topic.name}"`);
    }

    /**
     * + sessionEnded(userData: User): void
     * Session'ı sonlandırır ve sonuçları kaydeder
     * Relation: SessionController stores results -> Database
     */
    public sessionEnded(userData: User): void {
        console.log('SessionController: Ending session...');

        if (!this.currentSession) {
            console.log('SessionController: No active session to end');
            return;
        }

        // Recording'i durdur
        this.isRecording = false;

        // End time'ı güncelle
        this.currentSession.setEndTime(new Date());

        // Relation: SessionController uses -> FeedbackEngine
        // Final feedback raporu al
        const report = this.feedbackEngine.provideSessionFeedback(this.currentSession.getSessionId());
        report.userId = userData.getUserId();

        // User'a session'ı ekle (Relation: User owns PracticeSession)
        userData.addPracticeSession(this.currentSession);

        // Session detaylarını logla
        console.log('='.repeat(50));
        console.log('SESSION ENDED - FINAL REPORT');
        console.log('='.repeat(50));
        console.log(this.currentSession.getDetails());
        console.log('-'.repeat(50));
        console.log(`Grammar Score: ${report.grammarScore.value}`);
        console.log(`Fluency Score: ${report.fluencyScore.value}`);
        console.log(`Overall Score: ${report.overallScore}`);
        console.log('-'.repeat(50));
        console.log('Feedback:');
        report.feedback.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
        console.log('-'.repeat(50));
        console.log('Suggestions:');
        report.suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
        console.log('='.repeat(50));

        // AI konuşma geçmişini temizle
        this.aiEngine.clearHistory();

        // Session'ı sıfırla
        this.currentSession = null;
        this.conversationContext = null;
    }

    /**
     * Aktif kullanıcıyı ayarlar
     */
    public setCurrentUser(user: User): void {
        this.currentUser = user;
        console.log(`SessionController: Current user set to ${user.getName()}`);
    }

    /**
     * Aktif session'ı döndürür
     */
    public getCurrentSession(): PracticeSession | null {
        return this.currentSession;
    }

    /**
     * Recording durumunu döndürür
     */
    public isSessionRecording(): boolean {
        return this.isRecording;
    }

    /**
     * Session feedback raporunu döndürür
     */
    public getSessionReport(): Report | null {
        if (!this.currentSession) {
            return null;
        }
        return this.feedbackEngine.provideSessionFeedback(this.currentSession.getSessionId());
    }

    /**
     * Audio süresini tahmin eder
     */
    private estimateAudioDuration(stream: Stream): number {
        // Sample rate ve buffer size'a göre süre hesapla
        const bytesPerSample = 2; // 16-bit audio
        const channels = 1; // mono
        const bufferSize = stream.data.byteLength;
        
        return bufferSize / (stream.sampleRate * bytesPerSample * channels);
    }
}
