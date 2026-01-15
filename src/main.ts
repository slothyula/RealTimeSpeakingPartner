/**
 * Real-Time Speaking Partner - Main Application
 * 
 * Bu dosya tüm bileşenleri bir araya getirir ve
 * class diagram'daki tüm ilişkileri gösterir.
 * 
 * Architecture Overview (Class Diagram'a göre):
 * 
 * Frontend Layer:
 *   └── WebInterface
 *         ├── sends credentials -> AuthController
 *         └── manages session -> SessionController
 * 
 * Backend Web Services & Controllers:
 *   ├── AuthController
 *   │     ├── creates -> Database
 *   │     └── validates -> Database
 *   ├── TopicManager
 *   │     └── manages content -> Database
 *   └── SessionController
 *         ├── stores results -> Database
 *         ├── uses -> TTSModule
 *         ├── uses -> FeedbackEngine
 *         ├── uses -> SpeechRecognitionEngine
 *         └── uses -> AIEngine
 * 
 * Core Engines:
 *   ├── TTSModule
 *   ├── FeedbackEngine
 *   ├── SpeechRecognitionEngine
 *   └── AIEngine
 * 
 * Data Model & Persistence:
 *   ├── User (owns -> PracticeSession)
 *   ├── PracticeSession
 *   └── Database
 */

// Import all modules
import { Database } from './database';
import { TTSModule, FeedbackEngine, SpeechRecognitionEngine, AIEngine } from './engines';
import { AuthController } from './controllers/AuthController';
import { TopicManager } from './controllers/TopicManager';
import { SessionController } from './controllers/SessionController';
import { WebInterface } from './frontend';
import { Topic } from './models/types';

/**
 * RealTimeSpeakingPartner - Ana Uygulama Sınıfı
 * Tüm bileşenleri koordine eder
 */
class RealTimeSpeakingPartner {
    // Core Components
    private database: Database;
    
    // Engines
    private ttsModule: TTSModule;
    private feedbackEngine: FeedbackEngine;
    private speechRecognitionEngine: SpeechRecognitionEngine;
    private aiEngine: AIEngine;
    
    // Controllers
    private authController: AuthController;
    private topicManager: TopicManager;
    private sessionController: SessionController;
    
    // Frontend
    private webInterface: WebInterface;

    constructor() {
        console.log('='.repeat(60));
        console.log('INITIALIZING REAL-TIME SPEAKING PARTNER');
        console.log('='.repeat(60));
        console.log('\n📦 Loading components...\n');

        // 1. Initialize Database (Data Model & Persistence Layer)
        this.database = new Database();
        console.log('✅ Database initialized');

        // 2. Initialize Core Engines
        this.ttsModule = new TTSModule();
        console.log('✅ TTS Module initialized');

        this.feedbackEngine = new FeedbackEngine(this.database);
        console.log('✅ Feedback Engine initialized');

        this.speechRecognitionEngine = new SpeechRecognitionEngine();
        console.log('✅ Speech Recognition Engine initialized');

        this.aiEngine = new AIEngine();
        console.log('✅ AI Engine initialized');

        // 3. Initialize Controllers (Backend Web Services)
        // Relation: AuthController -> Database (creates, validates)
        this.authController = new AuthController(this.database);
        console.log('✅ Auth Controller initialized');

        // Relation: TopicManager -> Database (manages content)
        this.topicManager = new TopicManager(this.database);
        console.log('✅ Topic Manager initialized');

        // Relations: SessionController -> Database, TTSModule, FeedbackEngine, 
        //            SpeechRecognitionEngine, AIEngine
        this.sessionController = new SessionController(
            this.database,
            this.ttsModule,
            this.feedbackEngine,
            this.speechRecognitionEngine,
            this.aiEngine
        );
        console.log('✅ Session Controller initialized');

        // 4. Initialize Frontend (Web UI Layer)
        // Relations: WebInterface -> AuthController, SessionController
        this.webInterface = new WebInterface(
            this.authController,
            this.sessionController
        );
        console.log('✅ Web Interface initialized');

        console.log('\n' + '='.repeat(60));
        console.log('SYSTEM READY');
        console.log('='.repeat(60) + '\n');
    }

    /**
     * Demo senaryosunu çalıştırır
     */
    public runDemo(): void {
        console.log('\n' + '🎬 '.repeat(20));
        console.log('           RUNNING DEMO SCENARIO');
        console.log('🎬 '.repeat(20) + '\n');

        // Step 1: Login formunu göster
        console.log('\n📍 STEP 1: Display Login Form');
        console.log('-'.repeat(40));
        this.webInterface.displayLoginForm();

        // Step 2: Yeni kullanıcı kayıt
        console.log('\n📍 STEP 2: User Registration');
        console.log('-'.repeat(40));
        this.webInterface.register('John Doe', 'john@example.com', 'password123');

        // Step 3: Kullanıcı girişi
        console.log('\n📍 STEP 3: User Login');
        console.log('-'.repeat(40));
        this.webInterface.login('john@example.com', 'password123');

        // Step 4: Dashboard göster
        console.log('\n📍 STEP 4: Display Dashboard');
        console.log('-'.repeat(40));
        this.webInterface.displayDashboard();

        // Step 5: Topic seçimi
        console.log('\n📍 STEP 5: Topic Selection');
        console.log('-'.repeat(40));
        this.webInterface.displayTopicSelection();

        // Step 6: Practice session başlat
        console.log('\n📍 STEP 6: Start Practice Session (Topic: Daily Conversations)');
        console.log('-'.repeat(40));
        this.webInterface.startPracticeSession(1); // Topic ID 1

        // Step 7: Practice turn (konuşma simülasyonu)
        console.log('\n📍 STEP 7: Practice Turn - User Speaking');
        console.log('-'.repeat(40));
        this.webInterface.processPracticeTurn();

        // Step 8: Başka bir practice turn
        console.log('\n📍 STEP 8: Another Practice Turn');
        console.log('-'.repeat(40));
        this.webInterface.processPracticeTurn();

        // Step 9: Session sonlandır
        console.log('\n📍 STEP 9: End Practice Session');
        console.log('-'.repeat(40));
        this.webInterface.endPracticeSession();

        // Step 10: Logout
        console.log('\n📍 STEP 10: User Logout');
        console.log('-'.repeat(40));
        this.webInterface.logout();

        console.log('\n' + '✅ '.repeat(20));
        console.log('           DEMO COMPLETED SUCCESSFULLY');
        console.log('✅ '.repeat(20) + '\n');
    }

    /**
     * Admin senaryosunu çalıştırır
     */
    public runAdminDemo(): void {
        console.log('\n' + '👑 '.repeat(20));
        console.log('           RUNNING ADMIN DEMO');
        console.log('👑 '.repeat(20) + '\n');

        // TopicManager demo
        console.log('📍 Creating new topic...');
        const newTopic: Topic = {
            topicId: 0,
            name: 'Technology and Innovation',
            description: 'Discuss latest tech trends and innovations',
            difficulty: 'Advanced',
            category: 'Technology',
            keywords: ['AI', 'blockchain', 'innovation', 'startups'],
            isActive: true
        };
        this.topicManager.createTopic(newTopic);

        console.log('\n📍 Listing all topics...');
        const topics = this.topicManager.getAvailableTopics();
        topics.forEach(topic => {
            console.log(`   - ${topic.name} (${topic.difficulty})`);
        });

        console.log('\n📍 Updating topic...');
        const updatedTopic: Topic = {
            ...newTopic,
            topicId: 5,
            description: 'Explore cutting-edge technology and digital transformation'
        };
        this.topicManager.updateTopic(5, updatedTopic);

        console.log('\n' + '✅ '.repeat(20));
        console.log('           ADMIN DEMO COMPLETED');
        console.log('✅ '.repeat(20) + '\n');
    }

    /**
     * Getter methods
     */
    public getDatabase(): Database { return this.database; }
    public getTTSModule(): TTSModule { return this.ttsModule; }
    public getFeedbackEngine(): FeedbackEngine { return this.feedbackEngine; }
    public getSpeechRecognitionEngine(): SpeechRecognitionEngine { return this.speechRecognitionEngine; }
    public getAIEngine(): AIEngine { return this.aiEngine; }
    public getAuthController(): AuthController { return this.authController; }
    public getTopicManager(): TopicManager { return this.topicManager; }
    public getSessionController(): SessionController { return this.sessionController; }
    public getWebInterface(): WebInterface { return this.webInterface; }
}

// ===============================================
// APPLICATION ENTRY POINT
// ===============================================

// Create and run the application
const app = new RealTimeSpeakingPartner();

// Run demo scenarios
app.runDemo();
app.runAdminDemo();

// Export for module usage
export { RealTimeSpeakingPartner };
export default app;
