/**
 * WebInterface Class
 * Class Diagram'dan: Frontend Layer (Web UI) katmanı
 * 
 * Methods:
 * + displayLoginForm(): void
 * + displayDashboard(): void
 * + showFeedback(report: Report): void
 * + captureAudio(): Stream
 * 
 * Relations:
 * - WebInterface sends credentials -> AuthController
 * - WebInterface manages session -> SessionController
 */

import { AuthController } from '../controllers/AuthController';
import { SessionController } from '../controllers/SessionController';
import { Stream, Report, DataMap } from '../models/types';

export class WebInterface {
    // Relations: WebInterface -> Controllers
    private authController: AuthController;      // sends credentials
    private sessionController: SessionController; // manages session

    // UI State
    private isLoggedIn: boolean;
    private currentView: 'login' | 'dashboard' | 'practice' | 'feedback';

    constructor(authController: AuthController, sessionController: SessionController) {
        // Initialize relations
        this.authController = authController;
        this.sessionController = sessionController;

        // Initialize state
        this.isLoggedIn = false;
        this.currentView = 'login';

        console.log('WebInterface: Web interface initialized');
    }

    /**
     * + displayLoginForm(): void
     * Login formunu görüntüler
     */
    public displayLoginForm(): void {
        console.log('\n' + '='.repeat(60));
        console.log('          REAL-TIME SPEAKING PARTNER - LOGIN');
        console.log('='.repeat(60));
        console.log('\n📧 Email: [________________]');
        console.log('🔒 Password: [________________]');
        console.log('\n[Login]  [Create Account]\n');
        console.log('='.repeat(60));

        this.currentView = 'login';
    }

    /**
     * + displayDashboard(): void
     * Ana dashboard'u görüntüler
     * Relation: WebInterface manages session -> SessionController
     */
    public displayDashboard(): void {
        if (!this.authController.isLoggedIn()) {
            console.log('WebInterface: Please login first');
            this.displayLoginForm();
            return;
        }

        const user = this.authController.getCurrentUser();
        
        console.log('\n' + '='.repeat(60));
        console.log('       REAL-TIME SPEAKING PARTNER - DASHBOARD');
        console.log('='.repeat(60));
        console.log(`\n👤 Welcome, ${user?.getName()}!`);
        console.log('-'.repeat(60));

        // Konuları göster
        console.log('\n📚 AVAILABLE TOPICS:');
        console.log('-'.repeat(40));
        
        // Relation: WebInterface manages session -> SessionController
        const topics = this.sessionController.requestTopics();
        topics.forEach((topic, index) => {
            console.log(`   ${index + 1}. ${topic.name}`);
            console.log(`      📖 ${topic.description}`);
            console.log(`      ⭐ Difficulty: ${topic.difficulty}`);
            console.log(`      📂 Category: ${topic.category}`);
            console.log('');
        });

        console.log('-'.repeat(60));
        console.log('\n🎯 OPTIONS:');
        console.log('   [1] Start Practice Session');
        console.log('   [2] View Performance History');
        console.log('   [3] Settings');
        console.log('   [4] Logout');
        console.log('\n' + '='.repeat(60));

        this.currentView = 'dashboard';
    }

    /**
     * + showFeedback(report: Report): void
     * Feedback raporunu görüntüler
     */
    public showFeedback(report: Report): void {
        console.log('\n' + '='.repeat(60));
        console.log('          SESSION FEEDBACK REPORT');
        console.log('='.repeat(60));

        // Overall Score
        console.log(`\n🏆 OVERALL SCORE: ${report.overallScore}/100`);
        console.log(this.generateScoreBar(report.overallScore));

        // Detailed Scores
        console.log('\n📊 DETAILED SCORES:');
        console.log('-'.repeat(40));

        // Grammar
        console.log(`\n📝 Grammar: ${report.grammarScore.value}/100`);
        console.log(`   ${this.generateScoreBar(report.grammarScore.value)}`);
        console.log(`   ${report.grammarScore.details}`);

        // Fluency
        console.log(`\n💬 Fluency: ${report.fluencyScore.value}/100`);
        console.log(`   ${this.generateScoreBar(report.fluencyScore.value)}`);
        console.log(`   ${report.fluencyScore.details}`);

        // Feedback
        console.log('\n💡 FEEDBACK:');
        console.log('-'.repeat(40));
        report.feedback.forEach((feedback, index) => {
            console.log(`   ${index + 1}. ${feedback}`);
        });

        // Suggestions
        console.log('\n🎯 SUGGESTIONS FOR IMPROVEMENT:');
        console.log('-'.repeat(40));
        report.suggestions.forEach((suggestion, index) => {
            console.log(`   ${index + 1}. ${suggestion}`);
        });

        // Timestamp
        console.log(`\n📅 Report generated: ${report.timestamp.toLocaleString()}`);
        console.log('='.repeat(60));

        this.currentView = 'feedback';
    }

    /**
     * + captureAudio(): Stream
     * Mikrofon'dan ses yakalar
     * Relation: WebInterface manages session -> SessionController
     */
    public captureAudio(): Stream {
        console.log('WebInterface: Capturing audio from microphone...');

        // Simüle edilmiş audio capture
        // Gerçek implementasyonda Web Audio API kullanılır
        
        const stream: Stream = {
            data: new ArrayBuffer(44100 * 2 * 5), // 5 saniye, 16-bit, mono
            format: 'audio/wav',
            sampleRate: 44100,
            isActive: true
        };

        console.log('WebInterface: Audio captured successfully');
        console.log(`   Format: ${stream.format}`);
        console.log(`   Sample Rate: ${stream.sampleRate} Hz`);
        console.log(`   Duration: ~5 seconds`);

        return stream;
    }

    /**
     * Login işlemi - Relation: WebInterface sends credentials -> AuthController
     */
    public login(email: string, password: string): boolean {
        console.log('WebInterface: Processing login...');

        // Relation: WebInterface sends credentials -> AuthController
        this.authController.login(email, password);

        if (this.authController.isLoggedIn()) {
            this.isLoggedIn = true;
            const user = this.authController.getCurrentUser();
            
            // SessionController'a kullanıcıyı ayarla
            // Relation: WebInterface manages session -> SessionController
            if (user) {
                this.sessionController.setCurrentUser(user);
            }
            
            console.log('WebInterface: Login successful!');
            return true;
        }

        console.log('WebInterface: Login failed!');
        return false;
    }

    /**
     * Kayıt işlemi - Relation: WebInterface sends credentials -> AuthController
     */
    public register(name: string, email: string, password: string): boolean {
        console.log('WebInterface: Processing registration...');

        // Relation: WebInterface sends credentials -> AuthController
        const credentials: DataMap = new Map([
            ['name', name],
            ['email', email],
            ['password', password]
        ]);

        const success = this.authController.createUser(credentials);

        if (success) {
            console.log('WebInterface: Registration successful! Please login.');
        } else {
            console.log('WebInterface: Registration failed!');
        }

        return success;
    }

    /**
     * Logout işlemi
     */
    public logout(): void {
        console.log('WebInterface: Logging out...');
        
        this.authController.logout();
        this.isLoggedIn = false;
        this.currentView = 'login';
        
        console.log('WebInterface: Logout successful!');
    }

    /**
     * Practice session başlatır
     * Relation: WebInterface manages session -> SessionController
     */
    public startPracticeSession(topicId: number): void {
        if (!this.isLoggedIn) {
            console.log('WebInterface: Please login first');
            return;
        }

        console.log('\n' + '='.repeat(60));
        console.log('       PRACTICE SESSION STARTED');
        console.log('='.repeat(60));

        // Relation: WebInterface manages session -> SessionController
        this.sessionController.setTopic(topicId);
        this.sessionController.startRecording();

        console.log('\n🎤 Microphone is active. Start speaking...');
        console.log('💡 Tip: Speak clearly and at a natural pace.\n');
        console.log('[Press STOP to end the session]');
        console.log('='.repeat(60));

        this.currentView = 'practice';
    }

    /**
     * Practice turn - kullanıcı konuşması
     * Relation: WebInterface manages session -> SessionController
     */
    public processPracticeTurn(): void {
        if (!this.sessionController.isSessionRecording()) {
            console.log('WebInterface: No active session');
            return;
        }

        // Audio capture
        const audioStream = this.captureAudio();

        // Relation: WebInterface manages session -> SessionController
        this.sessionController.sendAudio(audioStream);
    }

    /**
     * Practice session'ı sonlandırır
     * Relation: WebInterface manages session -> SessionController
     */
    public endPracticeSession(): void {
        const user = this.authController.getCurrentUser();
        
        if (!user) {
            console.log('WebInterface: No user logged in');
            return;
        }

        console.log('\nWebInterface: Ending practice session...\n');

        // Relation: WebInterface manages session -> SessionController
        this.sessionController.sessionEnded(user);

        // Feedback'i göster
        const report = this.sessionController.getSessionReport();
        if (report) {
            this.showFeedback(report);
        }
    }

    /**
     * Topic seçim ekranını gösterir
     */
    public displayTopicSelection(): void {
        console.log('\n' + '='.repeat(60));
        console.log('          SELECT A TOPIC');
        console.log('='.repeat(60));

        // Relation: WebInterface manages session -> SessionController
        const topics = this.sessionController.requestTopics();
        
        console.log('\n📚 Choose a topic to practice:\n');
        
        topics.forEach((topic) => {
            const difficultyEmoji = this.getDifficultyEmoji(topic.difficulty);
            console.log(`   [${topic.topicId}] ${difficultyEmoji} ${topic.name}`);
            console.log(`       ${topic.description}`);
            console.log('');
        });

        console.log('='.repeat(60));
    }

    // Helper methods

    /**
     * Skor çubuğu oluşturur
     */
    private generateScoreBar(score: number): string {
        const filledBlocks = Math.round(score / 10);
        const emptyBlocks = 10 - filledBlocks;
        
        let color = '🟢'; // Green for good scores
        if (score < 60) color = '🔴'; // Red for low scores
        else if (score < 80) color = '🟡'; // Yellow for medium scores

        return `${color} [${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}] ${score}%`;
    }

    /**
     * Zorluk emoji'si döndürür
     */
    private getDifficultyEmoji(difficulty: string): string {
        switch (difficulty.toLowerCase()) {
            case 'beginner': return '🟢';
            case 'intermediate': return '🟡';
            case 'advanced': return '🔴';
            default: return '⚪';
        }
    }

    /**
     * Mevcut view'ı döndürür
     */
    public getCurrentView(): string {
        return this.currentView;
    }

    /**
     * Kullanıcı giriş durumunu döndürür
     */
    public isUserLoggedIn(): boolean {
        return this.isLoggedIn;
    }
}
