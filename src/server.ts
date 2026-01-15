/**
 * Express Server - Web API
 * Real-Time Speaking Partner için REST API sunucusu
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { Database, MySQLConnection } from './database';
import { UserRepository, ConversationRepository, TopicRepository, GrammarMistakeRepository, FeedbackRepository } from './database/repositories';
import { TTSModule, FeedbackEngine, SpeechRecognitionEngine, AIEngine } from './engines';
import { AuthController } from './controllers/AuthController';
import { TopicManager } from './controllers/TopicManager';
import { SessionController } from './controllers/SessionController';
import { DataMap, Stream } from './models/types';
import { User } from './models';
import adminRoutes from './routes/adminRoutes';
import crypto from 'crypto';

// Token-based user session interface
interface TokenUser {
    id: number;
    name: string;
    email: string;
}

// Extend Express Request to include token user
declare global {
    namespace Express {
        interface Request {
            tokenUser?: TokenUser;
        }
    }
}

const app = express();
const PORT = process.env.PORT || 4499;

// Token storage: token -> user info (for multi-tab support)
const tokenStore: Map<string, TokenUser> = new Map();

// Admin token storage: token -> admin info
interface AdminToken {
    adminId: number;
    username: string;
    email: string;
    fullName: string;
}

const adminTokenStore: Map<string, AdminToken> = new Map();

// Generate random token
function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Convert language name to language code for TTS and Speech Recognition
function getLanguageCode(languageName: string): string {
    const languageMap: { [key: string]: string } = {
        'English': 'en-US',
        'Spanish': 'es-ES',
        'French': 'fr-FR',
        'German': 'de-DE',
        'Italian': 'it-IT',
        'Portuguese': 'pt-PT',
        'Russian': 'ru-RU',
        'Chinese': 'zh-CN',
        'Japanese': 'ja-JP',
        'Korean': 'ko-KR',
        'Turkish': 'tr-TR',
        'Arabic': 'ar-SA',
        'Dutch': 'nl-NL',
        'Polish': 'pl-PL',
        'Swedish': 'sv-SE',
        'Norwegian': 'no-NO',
        'Danish': 'da-DK',
        'Finnish': 'fi-FI',
        'Czech': 'cs-CZ',
        'Hungarian': 'hu-HU',
        'Romanian': 'ro-RO',
        'Greek': 'el-GR',
        'Hindi': 'hi-IN',
        'Thai': 'th-TH',
        'Vietnamese': 'vi-VN',
        'Indonesian': 'id-ID',
        'Malay': 'ms-MY',
        'Filipino': 'fil-PH'
    };
    
    return languageMap[languageName] || 'en-US'; // Default to English
}

// Simple password hashing (use bcrypt in production)
function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Middleware to extract token from Authorization header
function tokenAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const user = tokenStore.get(token);
        if (user) {
            req.tokenUser = user;
        }
    }
    next();
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(tokenAuthMiddleware);

// Active Sessions Tracking (Real-time)
interface ActiveSession {
    oderId: number;
    userName: string;
    userEmail: string;
    topicId: number;
    topicName: string;
    startTime: Date;
    conversationId: number | null;
}

interface LoggedInUser {
    userId: number;
    userName: string;
    userEmail: string;
    loginTime: Date;
    token: string; // Store token for logout
}

const activeSessions: Map<number, ActiveSession> = new Map(); // oderId -> session info
const loggedInUsers: Map<string, LoggedInUser> = new Map(); // token -> logged in user info (changed from userId to token for multi-tab)

// Initialize MySQL connection
let userRepository: UserRepository | null = null;
let conversationRepository: ConversationRepository | null = null;
let topicRepository: TopicRepository | null = null;
let grammarMistakeRepository: GrammarMistakeRepository | null = null;
let feedbackRepository: FeedbackRepository | null = null;
let mysqlAvailable = false;

const initializeMySQL = async () => {
    try {
        const mysqlConnection = MySQLConnection.getInstance();
        const connected = await mysqlConnection.connect();
        if (connected) {
            console.log('✅ MySQL Database connected');
            userRepository = new UserRepository();
            conversationRepository = new ConversationRepository();
            topicRepository = new TopicRepository();
            grammarMistakeRepository = new GrammarMistakeRepository();
            feedbackRepository = new FeedbackRepository();
            mysqlAvailable = true;
        } else {
            console.log('⚠️ MySQL not available, using in-memory database');
        }
    } catch (error) {
        console.log('⚠️ MySQL connection failed, using in-memory database');
    }
};

// Language code mapping for user_levels
const langCodeMap: { [key: string]: string } = {
    'English': 'en',
    'Spanish': 'es', 'Spanish (Español)': 'es',
    'French': 'fr', 'French (Français)': 'fr',
    'German': 'de', 'German (Deutsch)': 'de',
    'Italian': 'it', 'Italian (Italiano)': 'it',
    'Portuguese': 'pt', 'Portuguese (Português)': 'pt',
    'Russian': 'ru', 'Russian (Русский)': 'ru',
    'Chinese': 'zh', 'Chinese (中文)': 'zh',
    'Japanese': 'ja', 'Japanese (日本語)': 'ja',
    'Korean': 'ko', 'Korean (한국어)': 'ko',
    'Turkish': 'tr', 'Turkish (Türkçe)': 'tr',
    'Arabic': 'ar', 'Arabic (العربية)': 'ar'
};

/**
 * Update user_levels table when a conversation ends or new user registers
 * This keeps the user's language proficiency stats in sync with their actual practice
 */
async function updateUserLevels(userId: number, targetLanguage: string, defaultLevel: string = 'beginner'): Promise<void> {
    if (!mysqlAvailable) return;
    
    const mysqlConnection = MySQLConnection.getInstance();
    const langCode = langCodeMap[targetLanguage] || targetLanguage.toLowerCase().substring(0, 2);
    
    try {
        // Get aggregated stats from conversations table
        const stats = await mysqlConnection.query<any>(`
            SELECT 
                COUNT(*) as total_sessions,
                COALESCE(SUM(duration_seconds), 0) as total_seconds,
                COALESCE(AVG(overall_score), 0) as avg_score
            FROM conversations
            WHERE user_id = ? AND target_language = ? AND status = 'completed'
        `, [userId, targetLanguage]);
        
        const totalSessions = stats[0]?.total_sessions || 0;
        const totalSeconds = stats[0]?.total_seconds || 0;
        const avgScore = stats[0]?.avg_score || 0;
        const practiceMinutes = Math.round(totalSeconds / 60);
        
        // Calculate proficiency level based on avg score
        let level = defaultLevel;
        if (avgScore >= 80) level = 'advanced';
        else if (avgScore >= 60) level = 'intermediate';
        else if (totalSessions > 0) level = 'beginner';
        
        // Check if record exists
        const existing = await mysqlConnection.query<any>(
            'SELECT level_id FROM user_levels WHERE user_id = ? AND language_code = ?',
            [userId, langCode]
        );
        
        if (existing.length > 0) {
            // Update existing record
            await mysqlConnection.execute(`
                UPDATE user_levels 
                SET proficiency_level = ?, total_sessions = ?, total_practice_time = ?, 
                    average_score = ?, last_practiced_at = NOW(), updated_at = NOW()
                WHERE user_id = ? AND language_code = ?
            `, [level, totalSessions, practiceMinutes, Math.round(avgScore), userId, langCode]);
            console.log(`📊 Updated user_levels: user=${userId}, ${targetLanguage} (${level}, ${totalSessions} sessions, ${Math.round(avgScore)}%)`);
        } else {
            // Insert new record
            await mysqlConnection.execute(`
                INSERT INTO user_levels (user_id, language_code, language_name, proficiency_level, total_sessions, total_practice_time, average_score, last_practiced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, [userId, langCode, targetLanguage, level, totalSessions, practiceMinutes, Math.round(avgScore)]);
            console.log(`📊 Created user_levels: user=${userId}, ${targetLanguage} (${level})`);
        }
    } catch (error) {
        console.error('Error updating user_levels:', error);
    }
}

// Initialize all components
console.log('Initializing Real-Time Speaking Partner...');

const database = new Database();
const ttsModule = new TTSModule();
const feedbackEngine = new FeedbackEngine(database);
const speechRecognitionEngine = new SpeechRecognitionEngine();
const aiEngine = new AIEngine();
const authController = new AuthController(database);
const topicManager = new TopicManager(database);
const sessionController = new SessionController(
    database,
    ttsModule,
    feedbackEngine,
    speechRecognitionEngine,
    aiEngine
);

// Server-side message tracking (independent of AIEngine)
let serverMessageCount = 0;
let serverIncorrectCount = 0;

console.log('All components initialized!');

// Admin Panel Routes
// Set admin token store for admin routes
import { setAdminTokenStore } from './routes/adminRoutes';
setAdminTokenStore(adminTokenStore);
app.use('/api/admin', adminRoutes);

// ==================== ACTIVE SESSIONS API (Real-time) ====================

/**
 * GET /api/admin/active-sessions
 * Get all currently active practice sessions
 */
app.get('/api/admin/active-sessions', (_req: Request, res: Response) => {
    const sessions = Array.from(activeSessions.values()).map(session => ({
        oderId: session.oderId,
        userName: session.userName,
        userEmail: session.userEmail,
        topicId: session.topicId,
        topicName: session.topicName,
        startTime: session.startTime,
        duration: Math.floor((new Date().getTime() - session.startTime.getTime()) / 1000), // seconds
        conversationId: session.conversationId
    }));

    res.json({
        success: true,
        count: sessions.length,
        sessions: sessions
    });
});

/**
 * GET /api/admin/active-user-ids
 * Get list of user IDs currently in practice sessions
 */
app.get('/api/admin/active-user-ids', (_req: Request, res: Response) => {
    const activeUserIds = Array.from(activeSessions.keys());
    res.json({
        success: true,
        activeUserIds: activeUserIds
    });
});

/**
 * GET /api/admin/online-user-ids
 * Get list of currently logged in (online) user IDs
 */
app.get('/api/admin/online-user-ids', (_req: Request, res: Response) => {
    // Get unique user IDs from all logged in users (multiple tabs = same user counted once)
    const uniqueUserIds = new Set<number>();
    loggedInUsers.forEach(user => uniqueUserIds.add(user.userId));
    const onlineUserIds = Array.from(uniqueUserIds);

    res.json({
        success: true,
        onlineUserIds: onlineUserIds,
        count: onlineUserIds.length
    });
});

// ==================== AUTH ROUTES ====================

// Register - MySQL veritabanına kaydet (multilingual support)
app.post('/api/auth/register', async (req: Request, res: Response) => {
    const { name, email, password, targetLanguage } = req.body;

    if (!name || !email || !password) {
        res.status(400).json({ success: false, message: 'All fields are required' });
        return;
    }

    // Default to English if not specified
    const userTargetLanguage = targetLanguage || 'English';

    try {
        // MySQL available ise veritabanına kaydet
        if (mysqlAvailable && userRepository) {
            // Email zaten var mı kontrol et
            const existingUser = await userRepository.findByEmail(email);
            if (existingUser) {
                res.status(400).json({ success: false, message: 'Email already registered' });
                return;
            }

            // Kullanıcıyı MySQL'e kaydet (target_language ile)
            const passwordHash = hashPassword(password);
            const userId = await userRepository.createUser(name, email, passwordHash, 'intermediate', userTargetLanguage);

            if (userId) {
                console.log(`✅ User registered in MySQL: ${name} (${email}) - Target Language: ${userTargetLanguage}`);
                
                // Create initial user_levels entry for the target language
                await updateUserLevels(userId, userTargetLanguage, 'beginner');
                
                res.json({ success: true, message: 'Registration successful' });
            } else {
                res.status(400).json({ success: false, message: 'Registration failed' });
            }
        } else {
            // Fallback to in-memory
            const credentials: DataMap = new Map([
                ['name', name],
                ['email', email],
                ['password', password],
                ['targetLanguage', userTargetLanguage]
            ]);

            const success = authController.createUser(credentials);

            if (success) {
                res.json({ success: true, message: 'Registration successful' });
            } else {
                res.status(400).json({ success: false, message: 'Registration failed. Email may already exist.' });
            }
        }
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Login - MySQL'den kontrol et
app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required' });
        return;
    }

    try {
        // MySQL available ise veritabanından kontrol et
        if (mysqlAvailable && userRepository) {
            const passwordHash = hashPassword(password);
            const userRow = await userRepository.validateCredentials(email, passwordHash);

            if (userRow) {
                // Update last login
                await userRepository.updateLastLogin(userRow.user_id);

                // Clean up old abandoned tokens for this user (from closed tabs without logout)
                const tokensToDelete: string[] = [];
                loggedInUsers.forEach((user, token) => {
                    if (user.userId === userRow.user_id) {
                        tokensToDelete.push(token);
                    }
                });
                tokensToDelete.forEach(token => {
                    loggedInUsers.delete(token);
                    tokenStore.delete(token);
                });
                if (tokensToDelete.length > 0) {
                    console.log(`🧹 Cleaned ${tokensToDelete.length} old token(s) for user ${userRow.name}`);
                }

                // Generate token for this tab/session
                const token = generateToken();
                const tokenUser: TokenUser = {
                    id: userRow.user_id,
                    name: userRow.name,
                    email: userRow.email
                };

                // Store in token store
                tokenStore.set(token, tokenUser);

                // Add to logged in users map (key is token for multi-tab support)
                loggedInUsers.set(token, {
                    userId: userRow.user_id,
                    userName: userRow.name,
                    userEmail: userRow.email,
                    loginTime: new Date(),
                    token: token
                });
                console.log(`✅ User logged in from MySQL: ${userRow.name} (${email}) - Active tabs: ${loggedInUsers.size}`);

                res.json({
                    success: true,
                    message: 'Login successful',
                    token: token,
                    user: {
                        id: userRow.user_id,
                        name: userRow.name,
                        email: userRow.email
                    }
                });
            } else {
                res.status(401).json({ success: false, message: 'Invalid email or password' });
            }
        } else {
            // Fallback to in-memory
            authController.login(email, password);

            if (authController.isLoggedIn()) {
                const user = authController.getCurrentUser();

                // Generate token for this tab/session
                const token = generateToken();
                const tokenUser: TokenUser = {
                    id: user!.getUserId(),
                    name: user!.getName(),
                    email: user!.getEmail()
                };

                // Store in token store
                tokenStore.set(token, tokenUser);

                // Add to logged in users map
                loggedInUsers.set(token, {
                    userId: user!.getUserId(),
                    userName: user!.getName(),
                    userEmail: user!.getEmail(),
                    loginTime: new Date(),
                    token: token
                });
                console.log(`✅ User logged in (in-memory): ${user!.getName()} - Active tabs: ${loggedInUsers.size}`);

                res.json({
                    success: true,
                    message: 'Login successful',
                    token: token,
                    user: {
                        id: user?.getUserId(),
                        name: user?.getName(),
                        email: user?.getEmail()
                    }
                });
            } else {
                res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
    const tokenUser = req.tokenUser;
    const authHeader = req.headers.authorization;

    if (tokenUser && authHeader) {
        const token = authHeader.substring(7);

        // Remove from token store
        tokenStore.delete(token);

        // Remove from logged in users map
        loggedInUsers.delete(token);
        console.log(`🔴 User logged out: ${tokenUser.name} - Active tabs: ${loggedInUsers.size}`);

        // Also remove from active sessions if in practice
        activeSessions.delete(tokenUser.id);
    }

    res.json({ success: true, message: 'Logout successful' });
});

// Get current user
app.get('/api/auth/user', (req: Request, res: Response) => {
    if (req.tokenUser) {
        res.json({
            success: true,
            user: req.tokenUser
        });
    } else {
        // Return 401 but allow client to handle it gracefully
        // This is expected when user hasn't logged in yet or server was restarted
        res.status(401).json({ success: false, message: 'Not logged in' });
    }
});

// Get current user's stats (level, score, practice count, time)
app.get('/api/auth/user/stats', async (req: Request, res: Response) => {
    if (!req.tokenUser) {
        res.status(401).json({ success: false, message: 'Not logged in' });
        return;
    }

    try {
        if (mysqlAvailable && conversationRepository) {
            const stats = await conversationRepository.getUserStats(req.tokenUser.id);
            const statsByLanguage = await conversationRepository.getUserStatsByLanguage(req.tokenUser.id);

            // Calculate overall level from average score
            const avgScore = stats.avg_score || 0;
            let proficiency_level = 'beginner';
            if (avgScore >= 80) {
                proficiency_level = 'advanced';
            } else if (avgScore >= 50) {
                proficiency_level = 'intermediate';
            }

            res.json({
                success: true,
                stats: {
                    total_conversations: stats.total_conversations || 0,
                    total_practice_minutes: Math.round((stats.total_practice_seconds || 0) / 60),
                    avg_score: stats.avg_score || null,
                    proficiency_level,
                    // Add language-specific stats
                    language_stats: statsByLanguage
                }
            });
        } else {
            res.json({
                success: true,
                stats: {
                    total_conversations: 0,
                    total_practice_minutes: 0,
                    avg_score: null,
                    proficiency_level: 'beginner'
                }
            });
        }
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ success: false, message: 'Error fetching stats' });
    }
});

// ==================== HISTORY ROUTES ====================

// Get user's conversation history
app.get('/api/history', async (req: Request, res: Response) => {
    if (!req.tokenUser) {
        res.status(401).json({ success: false, message: 'Please login first' });
        return;
    }

    const userId = req.tokenUser.id;

    try {
        if (mysqlAvailable && conversationRepository) {
            const conversations = await conversationRepository.findByUserId(userId, 50);

            res.json({
                success: true,
                conversations: conversations.map(c => ({
                    id: c.conversation_id,
                    topicName: c.topic_name || 'Unknown Topic',
                    topicCategory: c.topic_category || 'General',
                    targetLanguage: c.target_language || 'English',
                    status: c.status,
                    messageCount: c.message_count,
                    duration: c.duration_seconds,
                    overallScore: c.overall_score,
                    grammarScore: c.grammar_score,
                    fluencyScore: c.fluency_score,
                    startedAt: c.started_at,
                    endedAt: c.ended_at
                }))
            });
        } else {
            res.json({ success: true, conversations: [] });
        }
    } catch (error) {
        console.error('History API Error:', error);
        res.status(500).json({ success: false, message: 'Error fetching history' });
    }
});

// Get single conversation details
app.get('/api/history/:id', async (req: Request, res: Response) => {
    if (!req.tokenUser) {
        res.status(401).json({ success: false, message: 'Please login first' });
        return;
    }

    const conversationId = parseInt(req.params.id);

    try {
        if (mysqlAvailable && conversationRepository) {
            const conversation = await conversationRepository.findByIdWithDetails(conversationId);

            if (conversation) {
                res.json({
                    success: true,
                    conversation: {
                        id: conversation.conversation_id,
                        topicName: conversation.topic_name || 'Unknown Topic',
                        topicCategory: conversation.topic_category || 'General',
                        targetLanguage: conversation.target_language || 'English',
                        status: conversation.status,
                        messageCount: conversation.message_count,
                        duration: conversation.duration_seconds,
                        overallScore: conversation.overall_score,
                        grammarScore: conversation.grammar_score,
                        fluencyScore: conversation.fluency_score,
                        startedAt: conversation.started_at,
                        endedAt: conversation.ended_at
                    }
                });
            } else {
                res.status(404).json({ success: false, message: 'Conversation not found' });
            }
        } else {
            res.status(404).json({ success: false, message: 'Database not available' });
        }
    } catch (error) {
        console.error('History Detail API Error:', error);
        res.status(500).json({ success: false, message: 'Error fetching conversation' });
    }
});

// Delete a conversation
app.delete('/api/history/:id', async (req: Request, res: Response) => {
    if (!req.tokenUser) {
        res.status(401).json({ success: false, message: 'Please login first' });
        return;
    }

    const conversationId = parseInt(req.params.id);
    const userId = req.tokenUser.id;

    try {
        if (mysqlAvailable && conversationRepository) {
            // Verify the conversation belongs to the logged-in user
            const conversation = await conversationRepository.findByIdWithDetails(conversationId);

            if (!conversation) {
                res.status(404).json({ success: false, message: 'Conversation not found' });
                return;
            }

            if (conversation.user_id !== userId) {
                res.status(403).json({ success: false, message: 'You do not have permission to delete this conversation' });
                return;
            }

            // Delete the conversation (this should cascade to related tables)
            await conversationRepository.delete(conversationId);

            res.json({ success: true, message: 'Conversation deleted successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Database not available' });
        }
    } catch (error) {
        console.error('Delete Conversation API Error:', error);
        res.status(500).json({ success: false, message: 'Error deleting conversation' });
    }
});

// Get conversation feedbacks
app.get('/api/history/:id/feedbacks', async (req: Request, res: Response) => {
    if (!req.tokenUser) {
        res.status(401).json({ success: false, message: 'Please login first' });
        return;
    }

    const conversationId = parseInt(req.params.id);

    try {
        if (mysqlAvailable && grammarMistakeRepository && conversationRepository) {
            const conversation = await conversationRepository.findByIdWithDetails(conversationId);
            const feedbacks = await grammarMistakeRepository.findByConversationId(conversationId);

            res.json({
                success: true,
                conversation: conversation ? {
                    id: conversation.conversation_id,
                    topicName: conversation.topic_name || 'Unknown Topic',
                    topicCategory: conversation.topic_category || 'General',
                    targetLanguage: conversation.target_language || 'English',
                    overallScore: conversation.overall_score,
                    messageCount: conversation.message_count,
                    duration: conversation.duration_seconds,
                    startedAt: conversation.started_at
                } : null,
                feedbacks: feedbacks.map(f => ({
                    id: f.mistake_id,
                    originalText: f.original_text,
                    correctedText: f.corrected_text,
                    mistakeType: f.mistake_type,
                    explanation: f.explanation,
                    wasRepeated: f.was_repeated,
                    createdAt: f.created_at
                }))
            });
        } else {
            res.json({ success: true, feedbacks: [] });
        }
    } catch (error) {
        console.error('Feedbacks API Error:', error);
        res.status(500).json({ success: false, message: 'Error fetching feedbacks' });
    }
});

// ==================== TOPICS ROUTES ====================

// Get all topics (from MySQL if available) - with language filter
app.get('/api/topics', async (req: Request, res: Response) => {
    try {
        const targetLanguage = req.query.language as string || 'English'; // Default to English
        
        if (mysqlAvailable && topicRepository) {
            // MySQL'den topic'leri çek (dil bazlı filtreleme)
            const mysqlTopics = await topicRepository.findAll(true, targetLanguage);
            const topics = mysqlTopics.map(t => ({
                topicId: t.topic_id,
                name: t.name,
                description: t.description,
                category: t.category,
                difficulty: t.difficulty.charAt(0).toUpperCase() + t.difficulty.slice(1), // beginner -> Beginner
                targetLanguage: t.target_language || 'English',
                keywords: t.sample_questions ? JSON.parse(t.sample_questions) : [],
                isActive: t.is_active
            }));
            res.json({ success: true, topics, targetLanguage });
        } else {
            // Fallback: in-memory database
            const topics = topicManager.getAvailableTopics();
            res.json({ success: true, topics, targetLanguage });
        }
    } catch (error) {
        console.error('Topics API Error:', error);
        // Fallback to in-memory
        const topics = topicManager.getAvailableTopics();
        res.json({ success: true, topics });
    }
});

// Get topic by ID
app.get('/api/topics/:id', async (req: Request, res: Response) => {
    const topicId = parseInt(req.params.id);

    try {
        if (mysqlAvailable && topicRepository) {
            const mysqlTopic = await topicRepository.findById(topicId);
            if (mysqlTopic) {
                const topic = {
                    topicId: mysqlTopic.topic_id,
                    name: mysqlTopic.name,
                    description: mysqlTopic.description,
                    category: mysqlTopic.category,
                    difficulty: mysqlTopic.difficulty.charAt(0).toUpperCase() + mysqlTopic.difficulty.slice(1),
                    targetLanguage: mysqlTopic.target_language || 'English',
                    keywords: mysqlTopic.sample_questions ? JSON.parse(mysqlTopic.sample_questions) : [],
                    isActive: mysqlTopic.is_active
                };
                res.json({ success: true, topic });
                return;
            }
        }
    } catch (error) {
        console.error('Topic API Error:', error);
    }

    // Fallback to in-memory
    const topic = topicManager.getTopicById(topicId);
    if (topic) {
        res.json({ success: true, topic });
    } else {
        res.status(404).json({ success: false, message: 'Topic not found' });
    }
});

// ==================== SESSION ROUTES ====================

// Current MySQL conversation ID
let currentConversationId: number | null = null;
let sessionStartTime: Date | null = null;
// Current topic info for AI context
let currentTopicInfo: { name: string; description: string; category: string; difficulty: string; targetLanguage?: string } | null = null;
let currentUserLanguage: { targetLanguage?: string; nativeLanguage?: string } = {};

// Start session
app.post('/api/session/start', async (req: Request, res: Response) => {
    const { topicId } = req.body;

    if (!req.tokenUser) {
        res.status(401).json({ success: false, message: 'Please login first' });
        return;
    }

    const userId = req.tokenUser.id;
    const userName = req.tokenUser.name;
    const userEmail = req.tokenUser.email;

    if (!topicId) {
        res.status(400).json({ success: false, message: 'Topic ID is required' });
        return;
    }

    // Get user's language preferences from database
    let userTargetLanguage = 'English';
    let userNativeLanguage = 'Turkish';
    
    if (mysqlAvailable && userRepository) {
        try {
            const user = await userRepository.findById(userId);
            if (user) {
                userTargetLanguage = user.target_language || 'English';
                userNativeLanguage = user.native_language || 'Turkish';
                currentUserLanguage = {
                    targetLanguage: userTargetLanguage,
                    nativeLanguage: userNativeLanguage
                };
            }
        } catch (error) {
            console.error('Error loading user language preferences:', error);
        }
    }

    // First try to get topic from MySQL (for admin-added topics)
    let topic = null;
    let topicName = 'General Conversation';
    let topicDescription = '';
    let topicCategory = 'general';
    let topicDifficulty = 'intermediate';
    let topicTargetLanguage = userTargetLanguage; // Default to user's target language

    if (mysqlAvailable && topicRepository) {
        try {
            const mysqlTopic = await topicRepository.findById(topicId);
            if (mysqlTopic) {
                topic = {
                    topicId: mysqlTopic.topic_id,
                    name: mysqlTopic.name,
                    description: mysqlTopic.description || '',
                    category: mysqlTopic.category,
                    difficulty: mysqlTopic.difficulty,
                    targetLanguage: mysqlTopic.target_language || userTargetLanguage,
                    keywords: mysqlTopic.sample_questions ? JSON.parse(mysqlTopic.sample_questions) : [],
                    isActive: mysqlTopic.is_active
                };
                topicName = mysqlTopic.name;
                topicDescription = mysqlTopic.description || '';
                topicCategory = mysqlTopic.category;
                topicDifficulty = mysqlTopic.difficulty;
                topicTargetLanguage = mysqlTopic.target_language || userTargetLanguage;
                console.log(`✅ Topic loaded from MySQL: ${topicName} (Language: ${topicTargetLanguage})`);
            }
        } catch (error) {
            console.error('Error loading topic from MySQL:', error);
        }
    }

    // Fallback to in-memory if not found in MySQL
    if (!topic) {
        topic = topicManager.getTopicById(topicId);
        if (topic) {
            topicName = topic.name;
            topicDescription = topic.description || '';
            topicCategory = topic.category;
            topicDifficulty = topic.difficulty;
        }
    }

    // Store topic info for AI context (include target language)
    currentTopicInfo = {
        name: topicName,
        description: topicDescription,
        category: topicCategory,
        difficulty: topicDifficulty,
        targetLanguage: topicTargetLanguage
    };

    // Note: setTopic will fail for MySQL-only topics, but we don't need it since we have currentTopicInfo
    sessionController.setTopic(topicId);
    
    // Set language for TTS and Speech Recognition engines
    const languageCode = getLanguageCode(topicTargetLanguage);
    ttsModule.setLanguage(languageCode);
    speechRecognitionEngine.setLanguage(languageCode);
    console.log(`🌍 Language set to ${topicTargetLanguage} (${languageCode}) for TTS and Speech Recognition`);
    
    sessionController.startRecording();

    const sessionId = sessionController.getCurrentSession()?.getSessionId() || 0;

    // Start conversation tracking
    aiEngine.startConversation(sessionId);
    
    // Reset server-side message counters for new session
    serverMessageCount = 0;
    serverIncorrectCount = 0;
    console.log('📊 Server-side counters reset for new session');

    // Create conversation in MySQL (with target language)
    if (mysqlAvailable && conversationRepository) {
        currentConversationId = await conversationRepository.create(userId, topicId, topicName);
        // Update conversation with target language (if column exists)
        if (currentConversationId) {
            try {
                await conversationRepository.updateTargetLanguage?.(currentConversationId, topicTargetLanguage);
            } catch (error) {
                // Column might not exist yet, ignore error
                console.log('Note: target_language column may not exist in conversations table yet');
            }
        }
        sessionStartTime = new Date();
        console.log(`✅ Conversation created in MySQL with ID: ${currentConversationId} (Language: ${topicTargetLanguage})`);

        // Add to active sessions
        activeSessions.set(userId, {
            oderId: userId,
            userName: userName,
            userEmail: userEmail,
            topicId: topicId,
            topicName: topicName,
            startTime: sessionStartTime,
            conversationId: currentConversationId
        });
        console.log(`🟢 Active session added: ${userName} - ${topicName} (Total: ${activeSessions.size})`);
    }

    // Generate initial greeting in the target language
    const initialGreetings: { [key: string]: string } = {
        'English': `Hello! I'm your AI speaking partner. We'll be practicing "${topicName}" today. Let's have a great conversation! How are you doing?`,
        'Spanish': `¡Hola! Soy tu compañero de conversación de IA. Hoy practicaremos "${topicName}". ¡Tengamos una gran conversación! ¿Cómo estás?`,
        'French': `Bonjour! Je suis ton partenaire de conversation IA. Nous allons pratiquer "${topicName}" aujourd'hui. Ayons une excellente conversation! Comment allez-vous?`,
        'German': `Hallo! Ich bin dein KI-Gesprächspartner. Wir werden heute "${topicName}" üben. Lassen Sie uns ein großartiges Gespräch führen! Wie geht es dir?`,
        'Italian': `Ciao! Sono il tuo partner di conversazione IA. Oggi praticheremo "${topicName}". Facciamo una bella conversazione! Come stai?`,
        'Portuguese': `Olá! Sou seu parceiro de conversação IA. Vamos praticar "${topicName}" hoje. Vamos ter uma ótima conversa! Como você está?`,
        'Russian': `Привет! Я твой партнер по разговору с ИИ. Сегодня мы будем практиковать "${topicName}". Давайте отлично поговорим! Как дела?`,
        'Chinese': `你好！我是你的AI对话伙伴。今天我们将练习"${topicName}"。让我们进行一次精彩的对话！你好吗？`,
        'Japanese': `こんにちは！私はあなたのAI会話パートナーです。今日は"${topicName}"を練習します。素晴らしい会話をしましょう！元気ですか？`,
        'Korean': `안녕하세요! 저는 당신의 AI 대화 파트너입니다. 오늘은 "${topicName}"을 연습할 것입니다. 좋은 대화를 나눠봅시다! 어떻게 지내세요?`,
        'Turkish': `Merhaba! Ben senin AI konuşma partnerinim. Bugün "${topicName}" pratiği yapacağız. Harika bir sohbet edelim! Nasılsın?`,
        'Arabic': `مرحبا! أنا شريكك في المحادثة بالذكاء الاصطناعي. سنمارس "${topicName}" اليوم. دعنا نحظى بمحادثة رائعة! كيف حالك؟`
    };
    
    const initialGreeting = initialGreetings[topicTargetLanguage] || initialGreetings['English'];

    res.json({
        success: true,
        message: 'Session started',
        topic: topic || { topicId, name: topicName, description: topicDescription, category: topicCategory, difficulty: topicDifficulty },
        sessionId: sessionId,
        initialGreeting: initialGreeting,
        targetLanguage: topicTargetLanguage
    });
});

// Send audio/text for practice
app.post('/api/session/practice', (req: Request, res: Response) => {
    const { text } = req.body;

    if (!sessionController.isSessionRecording()) {
        res.status(400).json({ success: false, message: 'No active session' });
        return;
    }

    // Simulate audio stream from text input
    const audioStream: Stream = {
        data: new ArrayBuffer(text.length * 1000),
        format: 'audio/wav',
        sampleRate: 44100,
        isActive: true
    };

    // Process the audio
    sessionController.sendAudio(audioStream);

    // Get AI response
    const aiHistory = aiEngine.getConversationHistory();
    const lastAiResponse = aiHistory.length > 0 ? aiHistory[aiHistory.length - 1] : '';

    // Get current scores
    const report = sessionController.getSessionReport();

    res.json({
        success: true,
        userText: text,
        aiResponse: lastAiResponse.replace('AI: ', ''),
        scores: report ? {
            grammar: report.grammarScore.value,
            fluency: report.fluencyScore.value,
            overall: report.overallScore
        } : null
    });
});

// Chat with AI (Gemini API) - Main conversation endpoint
app.post('/api/session/chat', async (req: Request, res: Response) => {
    const { text } = req.body;

    if (!req.tokenUser) {
        res.status(401).json({ success: false, message: 'Please login first' });
        return;
    }

    const userId = req.tokenUser.id;

    // Check if we have an active session (either via SessionController or currentTopicInfo)
    if (!currentTopicInfo && !sessionController.isSessionRecording()) {
        res.status(400).json({ success: false, message: 'No active session. Please start a session first.' });
        return;
    }

    try {
        // Get user's language preferences (if not already loaded)
        if (!currentUserLanguage.targetLanguage && mysqlAvailable && userRepository) {
            try {
                const user = await userRepository.findById(userId);
                if (user) {
                    currentUserLanguage = {
                        targetLanguage: user.target_language || 'English',
                        nativeLanguage: user.native_language || 'Turkish'
                    };
                }
            } catch (error) {
                console.error('Error loading user language preferences:', error);
            }
        }

        // Get context with topic information and language support
        const session = sessionController.getCurrentSession();
        const targetLanguage = currentTopicInfo?.targetLanguage || currentUserLanguage.targetLanguage || 'English';
        const nativeLanguage = currentUserLanguage.nativeLanguage || 'Turkish';
        
        const context = {
            sessionId: session?.getSessionId() || 0,
            topicId: session?.getTopicId() || 1,
            // Add topic info from currentTopicInfo (loaded from MySQL in session/start)
            topicName: currentTopicInfo?.name || 'General Conversation',
            topicDescription: currentTopicInfo?.description || '',
            topicCategory: currentTopicInfo?.category || 'general',
            // Language support
            targetLanguage: targetLanguage,
            nativeLanguage: nativeLanguage,
            conversationHistory: aiEngine.getConversationHistory(),
            userProfile: {
                userId: userId,
                proficiencyLevel: currentTopicInfo?.difficulty || 'intermediate',
                preferredTopics: []
            },
            currentTurn: aiEngine.getConversationHistory().length
        };

        // Record user message (increment total count)
        aiEngine.recordUserMessage(text);
        serverMessageCount++; // Server-side counter

        // Increment message count in database
        if (mysqlAvailable && conversationRepository && currentConversationId) {
            await conversationRepository.incrementMessageCount(currentConversationId);
            console.log(`✅ Message count incremented for conversation ${currentConversationId}`);
        }

        // NEW: Use analyzeAndRespond for structured analysis
        console.log(`📨 /api/session/chat: Processing message from user ${userId}`);
        console.log(`📨 Message: "${text}"`);
        console.log(`📨 Context: topicId=${context.topicId}, targetLanguage=${context.targetLanguage}, topicName="${context.topicName}"`);
        console.log(`📨 Calling AIEngine.analyzeAndRespond()...`);
        
        const analysis = await aiEngine.analyzeAndRespond(text, context);
        
        console.log(`✅ AIEngine.analyzeAndRespond() completed successfully`);
        console.log(`✅ Analysis result: sentence_status=${analysis.sentence_status}, mistakes=${analysis.mistakes?.length || 0}, feedback_length=${analysis.feedback?.length || 0}`);

        // Extract feedback text for display
        const aiResponse = analysis.feedback;
        
        // CHECK IF AI ALREADY PROVIDED STRUCTURED DATA WITH ACTUAL MISTAKES
        // Only trust AI data if it has mistakes populated when making corrections
        const aiProvidedStructuredData = analysis.sentence_status !== undefined && 
            analysis.sentence_status !== null && 
            Array.isArray(analysis.mistakes);
        
        const aiHasMistakes = aiProvidedStructuredData && analysis.mistakes.length > 0;
        
        console.log(`📊 AI Structured Data Check: hasStructuredData=${aiProvidedStructuredData}, hasMistakes=${aiHasMistakes}, sentence_status="${analysis.sentence_status}", mistakes_count=${analysis.mistakes?.length || 0}`);
        
        // SERVER-SIDE CORRECTION DETECTION
        // Run detection if AI returned empty mistakes - AI often forgets to fill mistakes array!
        const feedbackLower = aiResponse.toLowerCase();
        
        // Strong indicators that AI is making a correction in the feedback text
        const correctionPatterns = [
            'instead of',
            'you could say',
            'you can say', 
            'should be',
            'should say',
            'correct form',
            'correct way',
            'better to say',
            'more common to say',
            'it would be',
            'would be:',
            'small correction',
            'minor correction',
            'little correction',
            'let\'s work on',
            'let me help',
            'a few things to note',
            'things to note',
            'past tense',
            'present tense',
            'we use',
            'you need to use',
            'we need to use',
            'need a verb',
            'missing verb',
            'missing a verb',
            'use the right verb',
            '"was" vs',
            '"is" vs',
            'vs. "',
            // Bold text patterns (AI uses ** for corrections)
            '**was**',
            '**had**',
            '**went**',
            '**is**',
            '**are**'
        ];
        
        let detectedCorrection = false;
        let matchedPattern = '';
        
        // Check for correction patterns in the feedback
        for (const pattern of correctionPatterns) {
            if (feedbackLower.includes(pattern.toLowerCase())) {
                detectedCorrection = true;
                matchedPattern = pattern;
                break;
            }
        }
        
        // If AI said "correct" but feedback contains correction patterns, override!
        if (detectedCorrection && !aiHasMistakes) {
            console.log(`⚠️ AI returned empty mistakes but feedback contains correction: "${matchedPattern}"`);
            console.log(`⚠️ Overriding AI's sentence_status to 'has_errors'`);
        } else if (!detectedCorrection && !aiHasMistakes) {
            console.log(`✅ No corrections detected - sentence is correct`);
        } else if (aiHasMistakes) {
            console.log(`✅ Using AI's structured mistake data`);
        }
        
        // Determine short feedback and type based on detection
        let shortFeedback = analysis.short_feedback || '';
        let feedbackType = analysis.feedback_type || 'success';
        let sentenceStatus = analysis.sentence_status || 'correct';
        let mistakes = analysis.mistakes || [];
        
        // Get grammar category from AI response (new taxonomy)
        let grammarCategory = analysis.grammar_category || null;
        
        // Error type tracking for score calculation (defined here for scope)
        let errorSubType = 'general';
        
        console.log(`📊 AI Analysis: grammarCategory=${grammarCategory}, mistakes=${JSON.stringify(mistakes).substring(0, 200)}`);
        
        // If AI returned structured mistakes with original_text and corrected_text, use them directly
        if (mistakes.length > 0 && mistakes[0].original_text && mistakes[0].corrected_text) {
            console.log(`✅ Using structured mistake data from AI`);
            // Normalize field names for frontend - include grammar_category
            mistakes = mistakes.map((m: any) => ({
                category: m.category || 'grammar',
                sub_category: m.grammar_category || m.sub_category || grammarCategory || 'general',
                grammar_category: m.grammar_category || grammarCategory || 'general',
                original_part: m.original_text,
                original_text: m.original_text,
                corrected_version: m.corrected_text,
                corrected_text: m.corrected_text,
                short_explanation: m.explanation || `Corrected: "${m.corrected_text}"`,
                severity: m.severity || 'medium'
            }));
            
            // Use grammar_category for short feedback
            if (grammarCategory) {
                const categoryNames: {[key: string]: string} = {
                    'verb_tense': 'verb tense',
                    'agreement': 'subject-verb agreement',
                    'article_determiner': 'article usage',
                    'preposition': 'preposition',
                    'sentence_structure': 'sentence structure',
                    'verb_form': 'verb form',
                    'pronoun_reference': 'pronoun reference'
                };
                shortFeedback = `Grammar issue: ${categoryNames[grammarCategory] || grammarCategory}`;
            }
        }
        // If we detected a correction in the AI response but analysis didn't have structured data
        else if (detectedCorrection && sentenceStatus === 'correct' && mistakes.length === 0) {
            console.log(`⚠️ Correction detected but not in analysis - extracting from text...`);
            sentenceStatus = 'has_errors';
            feedbackType = 'warning';
            
            // Extract correction details from AI response
            let originalText = text; // User's original input
            let correctedText = '';
            let errorType = 'general';
            errorSubType = 'general'; // Use the outer scoped variable
            
            // Log the AI response for debugging
            console.log(`🔍 AI Response for extraction: "${aiResponse.substring(0, 500)}..."`);
            
            // Try to extract the corrected version from AI response
            // The AI typically provides corrections in format: "Correct sentence here!"
            // We want to extract the FULL corrected sentence, not just a fragment
            
            // Pattern 0: "more common to say" followed by quoted text
            // Matches: It would be more common to say "I **had** an exam"
            const moreCommonMatch = aiResponse.match(/(?:more common to say|would be more common)[:\s]*[""]([^""]+)[""]|(?:more common to say|would be more common)[:\s]*[""]([^""]+)[""]/i);
            if (moreCommonMatch) {
                correctedText = (moreCommonMatch[1] || moreCommonMatch[2] || '').replace(/\*\*/g, '').trim();
                console.log(`📝 Pattern 0a (more common): "${correctedText}"`);
            }
            
            // Pattern 0b: "it would be:" followed by quoted text (most common AI pattern)
            if (!correctedText) {
                const wouldBeMatch = aiResponse.match(/(?:it would be|would be)[:\s]*[""]([^""]+)[""]|(?:it would be|would be)[:\s]*[""]([^""]+)[""]/i);
                if (wouldBeMatch) {
                    correctedText = (wouldBeMatch[1] || wouldBeMatch[2] || '').replace(/\*\*/g, '').trim();
                    console.log(`📝 Pattern 0b (would be): "${correctedText}"`);
                }
            }
            
            // Pattern 0c: Extract bold words as the correction hint
            // AI often uses **word** to highlight corrections
            if (!correctedText) {
                const boldMatches = aiResponse.match(/\*\*([^*]+)\*\*/g);
                if (boldMatches && boldMatches.length > 0) {
                    // Extract bold words - these are the corrections
                    const boldWords = boldMatches.map((m: string) => m.replace(/\*\*/g, '')).join(', ');
                    correctedText = `Use: ${boldWords}`;
                    console.log(`📝 Pattern 0c (bold corrections): "${correctedText}"`);
                }
            }
            
            // Pattern 1: Look for complete sentences in quotes that start with "I " (first person corrections)
            // This captures: "I made a mozzarella one. It was delicious!"
            if (!correctedText) {
                const fullSentenceMatch = aiResponse.match(/[""]([I][^""]+[.!?])[""]|[""]([I][^""]+[.!?])[""]/);
                if (fullSentenceMatch) {
                    correctedText = (fullSentenceMatch[1] || fullSentenceMatch[2] || '').replace(/\*\*/g, '').trim();
                    console.log(`📝 Pattern 1 (full sentence): "${correctedText}"`);
                }
            }
            
            // Pattern 2: "you could say "X"" or 'you could say "X"'
            if (!correctedText) {
                const couldSayMatch = aiResponse.match(/you could say\s*["""]([^"""]+)["""]/i);
                if (couldSayMatch) {
                    correctedText = couldSayMatch[1].replace(/\*\*/g, '');
                    console.log(`📝 Pattern 2 (could say): "${correctedText}"`);
                }
            }
            
            // Pattern 3: Look for sentences with corrected verbs like "made", "was" in quotes
            if (!correctedText) {
                const quotedMatch = aiResponse.match(/["""]([^"""]*(?:made|making|went|goes|is|are|was|were)[^"""]*)["""]/i);
                if (quotedMatch) {
                    correctedText = quotedMatch[1].replace(/\*\*/g, '').trim();
                    console.log(`📝 Pattern 3 (quoted verb): "${correctedText}"`);
                }
            }
            
            // Pattern 4: Look for "It was" or "It is" sentences (common corrections for "it were")
            if (!correctedText) {
                const itWasMatch = aiResponse.match(/["""]([^"""]*It (?:was|is)[^"""]*)["""]/i);
                if (itWasMatch) {
                    correctedText = itWasMatch[1].replace(/\*\*/g, '').trim();
                    console.log(`📝 Pattern 4 (It was/is): "${correctedText}"`);
                }
            }
            
            // Pattern 5: Extract text between **bold** markers which often indicate corrections
            if (!correctedText) {
                const boldMatches = aiResponse.match(/\*\*([^*]+)\*\*/g);
                if (boldMatches && boldMatches.length > 0) {
                    // Combine bold parts into the correction hint
                    const boldWords = boldMatches.map((m: string) => m.replace(/\*\*/g, '')).join(' ');
                    console.log(`📝 Pattern 5 (bold words): "${boldWords}"`);
                    // Don't use this as full correction, just note it
                }
            }
            
            // Pattern 6: "I'm about to **verb**" corrections - capture the full suggested sentence
            if (!correctedText) {
                const aboutToMatch = aiResponse.match(/[""]I'm about to\s+(?:\*\*)?(\w+)(?:\*\*)?\s+(?:an?\s+)?(\w+)\.?[""]|I'm about to\s+(?:\*\*)?(\w+)(?:\*\*)?\s+(?:an?\s+)?(\w+)/i);
                if (aboutToMatch) {
                    const verb = aboutToMatch[1] || aboutToMatch[3] || '';
                    const noun = aboutToMatch[2] || aboutToMatch[4] || '';
                    if (verb && noun) {
                        correctedText = `I'm about to ${verb} an ${noun}`;
                        console.log(`📝 Pattern 6 (about to verb): "${correctedText}"`);
                    }
                }
            }
            
            // Pattern 7: Direct quote patterns like: So it could be: * "I'm about to eat the apple."
            if (!correctedText) {
                const bulletQuoteMatch = aiResponse.match(/\*\s*[""]([^""]+)[""]/);
                if (bulletQuoteMatch) {
                    correctedText = bulletQuoteMatch[1].replace(/\*\*/g, '').trim();
                    console.log(`📝 Pattern 7 (bullet quote): "${correctedText}"`);
                }
            }
            
            // Pattern 3: "should be X" or "should say X"  
            if (!correctedText) {
                const shouldBeMatch = aiResponse.match(/should (?:be|say)\s*["""]?([^""".,!?]+)/i);
                if (shouldBeMatch) {
                    correctedText = shouldBeMatch[1].replace(/\*\*/g, '').trim();
                }
            }
            
            // Determine error type from pattern and context
            // Check for missing verb / sentence structure issues FIRST
            if (matchedPattern.includes('need to use') || matchedPattern.includes('verb') ||
                matchedPattern.includes('missing') || matchedPattern.includes('right verb') ||
                feedbackLower.includes('need a verb') ||
                feedbackLower.includes('missing verb') ||
                feedbackLower.includes('use the right verb') ||
                feedbackLower.includes('we need to use')) {
                errorType = 'grammar';
                errorSubType = 'grammar_sentence_structure';
                shortFeedback = 'Grammar error: Missing verb';
                grammarCategory = 'grammar_sentence_structure';
            } else if (matchedPattern.includes('tense') || 
                matchedPattern.includes('**had**') ||
                matchedPattern.includes('**was**') ||
                matchedPattern.includes('**went**') ||
                feedbackLower.includes('past tense') || 
                feedbackLower.includes('present tense') ||
                feedbackLower.includes('"was" vs') ||
                feedbackLower.includes('"is" vs') ||
                feedbackLower.includes('we use "was"') ||
                feedbackLower.includes('we use "had"') ||
                feedbackLower.includes('already happened') ||
                feedbackLower.includes('since the') ||
                feedbackLower.includes('because it already')) {
                errorType = 'grammar';
                errorSubType = 'grammar_tense_verb';
                shortFeedback = 'Grammar error: Verb tense';
                grammarCategory = 'grammar_tense_verb';
            } else if (feedbackLower.includes('article')) {
                errorType = 'grammar';
                errorSubType = 'prepositions_articles';
                shortFeedback = 'Grammar error: Article usage';
                grammarCategory = 'prepositions_articles';
            } else if (feedbackLower.includes('preposition')) {
                errorType = 'grammar';
                errorSubType = 'prepositions_articles';
                shortFeedback = 'Grammar error: Preposition';
                grammarCategory = 'prepositions_articles';
            } else {
                // SMART CATEGORY DETECTION based on the actual correction
                // Analyze what changed between original and corrected text
                const origLower = originalText.toLowerCase();
                const corrLower = correctedText.toLowerCase();
                
                // Check for verb tense changes (e.g., cook→cooked, go→went, is→was)
                const verbTensePatterns = [
                    { base: 'cook', past: 'cooked' },
                    { base: 'make', past: 'made' },
                    { base: 'go', past: 'went' },
                    { base: 'do', past: 'did' },
                    { base: 'have', past: 'had' },
                    { base: 'is', past: 'was' },
                    { base: 'are', past: 'were' },
                    { base: 'eat', past: 'ate' },
                    { base: 'drink', past: 'drank' },
                    { base: 'see', past: 'saw' },
                    { base: 'come', past: 'came' },
                    { base: 'take', past: 'took' },
                    { base: 'get', past: 'got' },
                    { base: 'buy', past: 'bought' },
                    { base: 'think', past: 'thought' },
                    { base: 'say', past: 'said' },
                    { base: 'tell', past: 'told' },
                    { base: 'give', past: 'gave' },
                    { base: 'find', past: 'found' },
                    { base: 'know', past: 'knew' },
                    { base: 'put', past: 'put' },
                    { base: 'run', past: 'ran' },
                    { base: 'write', past: 'wrote' },
                    { base: 'read', past: 'read' },
                    { base: 'speak', past: 'spoke' },
                    { base: 'meet', past: 'met' },
                    { base: 'sit', past: 'sat' },
                    { base: 'stand', past: 'stood' },
                    { base: 'hear', past: 'heard' },
                    { base: 'sleep', past: 'slept' },
                    { base: 'wake', past: 'woke' },
                    { base: 'begin', past: 'began' },
                    { base: 'break', past: 'broke' },
                    { base: 'bring', past: 'brought' },
                    { base: 'build', past: 'built' },
                    { base: 'catch', past: 'caught' },
                    { base: 'choose', past: 'chose' },
                    { base: 'draw', past: 'drew' },
                    { base: 'drive', past: 'drove' },
                    { base: 'fall', past: 'fell' },
                    { base: 'feel', past: 'felt' },
                    { base: 'fly', past: 'flew' },
                    { base: 'forget', past: 'forgot' },
                    { base: 'grow', past: 'grew' },
                    { base: 'hang', past: 'hung' },
                    { base: 'hold', past: 'held' },
                    { base: 'keep', past: 'kept' },
                    { base: 'leave', past: 'left' },
                    { base: 'lend', past: 'lent' },
                    { base: 'let', past: 'let' },
                    { base: 'lie', past: 'lay' },
                    { base: 'lose', past: 'lost' },
                    { base: 'pay', past: 'paid' },
                    { base: 'ride', past: 'rode' },
                    { base: 'ring', past: 'rang' },
                    { base: 'rise', past: 'rose' },
                    { base: 'sell', past: 'sold' },
                    { base: 'send', past: 'sent' },
                    { base: 'shine', past: 'shone' },
                    { base: 'show', past: 'showed' },
                    { base: 'sing', past: 'sang' },
                    { base: 'sink', past: 'sank' },
                    { base: 'spend', past: 'spent' },
                    { base: 'steal', past: 'stole' },
                    { base: 'swim', past: 'swam' },
                    { base: 'swing', past: 'swung' },
                    { base: 'teach', past: 'taught' },
                    { base: 'throw', past: 'threw' },
                    { base: 'understand', past: 'understood' },
                    { base: 'wear', past: 'wore' },
                    { base: 'win', past: 'won' }
                ];
                
                let isVerbTenseError = false;
                let isWordChoiceError = false;
                
                // Check for verb tense: base form in original, past form in corrected (or vice versa)
                for (const verb of verbTensePatterns) {
                    // Present → Past tense correction
                    if ((origLower.includes(` ${verb.base} `) || origLower.includes(` ${verb.base}.`) || origLower.includes(` ${verb.base},`) || origLower.startsWith(verb.base + ' ') || origLower.endsWith(' ' + verb.base)) &&
                        (corrLower.includes(verb.past) || corrLower.includes(verb.past + 'ed'))) {
                        isVerbTenseError = true;
                        console.log(`📝 Detected verb tense change: ${verb.base} → ${verb.past}`);
                        break;
                    }
                    // Also check for regular -ed endings
                    if (origLower.includes(` ${verb.base} `) && corrLower.includes(`${verb.base}ed`)) {
                        isVerbTenseError = true;
                        console.log(`📝 Detected regular verb tense change: ${verb.base} → ${verb.base}ed`);
                        break;
                    }
                }
                
                // Check for word choice errors (completely different words)
                // e.g., "did the breakfast" → "made/had a breakfast"
                const wordChoicePatterns = [
                    { wrong: 'did', correct: 'made' },
                    { wrong: 'did', correct: 'had' },
                    { wrong: 'make', correct: 'do' },
                    { wrong: 'do', correct: 'make' },
                    { wrong: 'say', correct: 'tell' },
                    { wrong: 'tell', correct: 'say' },
                    { wrong: 'see', correct: 'watch' },
                    { wrong: 'watch', correct: 'see' },
                    { wrong: 'hear', correct: 'listen' },
                    { wrong: 'listen', correct: 'hear' },
                    { wrong: 'big', correct: 'large' },
                    { wrong: 'small', correct: 'little' },
                    { wrong: 'fast', correct: 'quick' }
                ];
                
                for (const wc of wordChoicePatterns) {
                    if ((origLower.includes(` ${wc.wrong} `) || origLower.includes(` ${wc.wrong}.`)) &&
                        corrLower.includes(wc.correct)) {
                        isWordChoiceError = true;
                        console.log(`📝 Detected word choice change: ${wc.wrong} → ${wc.correct}`);
                        break;
                    }
                }
                
                // Determine category based on analysis
                if (isVerbTenseError) {
                    errorType = 'grammar';
                    errorSubType = 'grammar_tense_verb';
                    shortFeedback = 'Grammar error: Verb tense';
                    grammarCategory = 'grammar_tense_verb';
                    console.log(`✅ Categorized as: grammar_tense_verb`);
                } else if (isWordChoiceError) {
                    errorType = 'vocabulary';
                    errorSubType = 'vocabulary_word_choice';
                    shortFeedback = 'Vocabulary: Word choice';
                    grammarCategory = 'vocabulary_word_choice';
                    console.log(`✅ Categorized as: vocabulary_word_choice`);
                } else if (matchedPattern.includes('smoother') || matchedPattern.includes('natural') ||
                    (feedbackLower.includes('more natural') && !isVerbTenseError && !isWordChoiceError) ||
                    feedbackLower.includes('sounds better')) {
                    // Only use fluency if it's truly just a style suggestion, not a grammar/word error
                    errorType = 'fluency';
                    errorSubType = 'fluency_naturalness';
                    shortFeedback = 'Suggestion: More natural phrasing';
                    feedbackType = 'info';
                    grammarCategory = 'fluency_naturalness';
                    console.log(`✅ Categorized as: fluency_naturalness`);
                } else if (matchedPattern.includes('more common') || feedbackLower.includes('more common')) {
                    errorType = 'grammar';
                    errorSubType = 'grammar_tense_verb';
                    shortFeedback = 'Grammar suggestion: Common usage';
                    grammarCategory = 'grammar_tense_verb';
                } else {
                    errorType = 'grammar';
                    errorSubType = 'grammar_sentence_structure';
                    shortFeedback = 'Grammar correction suggested';
                    grammarCategory = 'grammar_sentence_structure';
                }
            }
            
            // Build the mistake object with extracted details
            const categoryDisplayNames: {[key: string]: string} = {
                'grammar_tense_verb': 'Grammar – Tense & Verb Forms',
                'grammar_sentence_structure': 'Grammar – Sentence Structure',
                'vocabulary_word_choice': 'Vocabulary & Word Choice',
                'prepositions_articles': 'Prepositions & Articles',
                'word_order': 'Word Order',
                'spelling_form': 'Spelling / Form Errors',
                'fluency_naturalness': 'Fluency & Naturalness',
                'clarity_meaning': 'Clarity & Meaning'
            };
            
            mistakes = [{
                category: errorSubType,
                category_display: categoryDisplayNames[errorSubType] || 'Grammar',
                sub_category: errorSubType,
                grammar_category: grammarCategory,
                original_part: originalText,
                original_text: originalText,
                corrected_version: correctedText || 'See AI suggestion in the response',
                corrected_text: correctedText || 'See AI suggestion in the response',
                short_explanation: correctedText ? `Use "${correctedText}" instead` : 'Check the AI response for the correct form',
                explanation: correctedText ? `Use "${correctedText}" instead of "${originalText}"` : 'Check the AI response for the correct form',
                severity: 'medium'
            }];
            
            console.log(`📝 Extracted correction: "${originalText}" → "${correctedText}"`);
            console.log(`📝 Error type: ${errorType}/${errorSubType}, category: ${grammarCategory}`);
        }
        
        // If still no short feedback, set default
        if (!shortFeedback) {
            if (sentenceStatus === 'has_errors' || mistakes.length > 0) {
                shortFeedback = 'Grammar issue detected';
                feedbackType = 'warning';
            } else {
                shortFeedback = 'Perfect! No grammar mistakes detected.';
                feedbackType = 'success';
            }
        }
        
        console.log(`✅ Final: shortFeedback="${shortFeedback}", feedbackType="${feedbackType}", grammarCategory="${grammarCategory}"`);

        // Determine if there was a correction based on analysis
        const hadCorrection = sentenceStatus === 'has_errors' || mistakes.length > 0 || detectedCorrection;
        
        // SCORE CALCULATION: Count as incorrect ONLY if NOT fluency_naturalness
        // Fluency suggestions are not grammar errors, so they don't count against score
        const isFlencyOnly = grammarCategory === 'fluency_naturalness' || errorSubType === 'fluency_naturalness';
        const countsAsIncorrect = hadCorrection && !isFlencyOnly;
        
        if (countsAsIncorrect) {
            // Record this as an incorrect message for score calculation
            serverIncorrectCount++; // Server-side counter (always works)
            try {
                if (typeof aiEngine.recordIncorrectMessage === 'function') {
                    aiEngine.recordIncorrectMessage();
                }
            } catch (e) {
                // AIEngine method may not be available, but server counter is updated
            }
            console.log(`❌ Message counted as INCORRECT (category: ${grammarCategory}) - Total: ${serverIncorrectCount}/${serverMessageCount}`);
        } else if (hadCorrection && isFlencyOnly) {
            console.log(`💡 Fluency suggestion - NOT counted as incorrect for score`);
        } else {
            console.log(`✅ Message is CORRECT`);
        }

        // Save feedback to history (for user's View History feature)
        if (mysqlAvailable && feedbackRepository) {
            try {
                await feedbackRepository.create(
                    userId,
                    text,
                    shortFeedback,
                    feedbackType,
                    mistakes,
                    analysis.score_breakdown || {},
                    analysis.overall_score || 100,
                    sentenceStatus === 'has_errors' ? 'has_errors' : 'correct',
                    currentConversationId || undefined
                );
                console.log(`✅ Feedback saved to history for user ${userId}`);
            } catch (feedbackError) {
                console.error('Error saving feedback to history:', feedbackError);
            }
        }

        // Save ALL detected mistakes to database
        if (hadCorrection && mysqlAvailable && grammarMistakeRepository && currentConversationId) {
            // Save each mistake separately
            for (const mistake of mistakes) {
                await grammarMistakeRepository.createWithConversation(
                    currentConversationId,
                    userId,
                    mistake.original_part,           // Original incorrect part
                    mistake.corrected_version,       // Corrected version
                    mistake.category,                // Standardized category (VERB_TENSE, etc.)
                    mistake.short_explanation        // Explanation
                );
            }
            console.log(`✅ Saved ${analysis.mistakes.length} mistake(s) to database`);
        }

        // Get current tracking stats
        const stats = aiEngine.getCurrentStats();
        
        // Calculate server-side score (more reliable)
        const serverCorrectCount = serverMessageCount - serverIncorrectCount;
        const serverScore = serverMessageCount > 0 
            ? Math.round((serverCorrectCount / serverMessageCount) * 100) 
            : 100;

        res.json({
            success: true,
            userText: text,
            aiResponse: aiResponse,
            // NEW: Short feedback for display (conversation-safe)
            shortFeedback: shortFeedback,
            feedbackType: feedbackType,
            // NEW: Full analysis data (using server-detected values)
            analysis: {
                sentence_status: sentenceStatus,
                mistakes: mistakes,
                scoring: analysis.scoring,
                score_breakdown: analysis.score_breakdown,
                overall_score: analysis.overall_score,
                grammarCategory: grammarCategory,
                errorSubType: errorSubType
            },
            // Legacy scores field
            scores: {
                grammar: (sentenceStatus === 'correct' && mistakes.length === 0) ? 100 : Math.max(0, 100 - (mistakes.length * 20))
            },
            // Tracking data (current progress) - using SERVER-SIDE counters
            _tracking: {
                hadCorrection: hadCorrection,
                countsAsIncorrect: countsAsIncorrect, // True if error counts against score (not fluency)
                currentScore: serverScore, // Server-calculated score
                messagesCount: serverMessageCount, // Server counter
                correctCount: serverCorrectCount, // Server counter
                incorrectCount: serverIncorrectCount, // Server counter
                mistakeCount: mistakes.length
            }
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        res.status(500).json({ success: false, message: 'Error generating response' });
    }
});

// End session
app.post('/api/session/end', async (req: Request, res: Response) => {
    if (!req.tokenUser) {
        res.status(401).json({ success: false, message: 'Please login first' });
        return;
    }

    const userId = req.tokenUser.id;
    const userName = req.tokenUser.name;

    // Remove from active sessions
    if (activeSessions.has(userId)) {
        activeSessions.delete(userId);
        console.log(`🔴 Active session removed: ${userName} (Total: ${activeSessions.size})`);
    }

    // Save conversation ID before resetting
    const savedConversationId = currentConversationId;

    // End conversation and get final score
    const conversationScore = aiEngine.endConversation();
    
    // Calculate final score using server-side counters (more reliable)
    const finalCorrectCount = serverMessageCount - serverIncorrectCount;
    const finalScore = serverMessageCount > 0 
        ? Math.round((finalCorrectCount / serverMessageCount) * 100) 
        : 100;
    
    console.log(`📊 Session ended: ${finalCorrectCount} correct / ${serverIncorrectCount} incorrect / ${serverMessageCount} total = ${finalScore}%`);

    // Create a temporary User object for sessionController
    const tempUser = new User(userId, userName, req.tokenUser.email);
    sessionController.sessionEnded(tempUser);
    const report = sessionController.getSessionReport();

    // Save to MySQL
    if (mysqlAvailable && conversationRepository && savedConversationId) {
        try {
            // Calculate duration
            const durationSeconds = sessionStartTime
                ? Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000)
                : 0;

            // Update conversation with scores (using server-side calculated finalScore)
            await conversationRepository.complete(savedConversationId, {
                overall: finalScore,
                grammar: report?.grammarScore?.value || finalScore,
                fluency: report?.fluencyScore?.value || 0
            });

            // Update duration
            await conversationRepository.updateDuration(savedConversationId, durationSeconds);

            console.log(`✅ Conversation ${savedConversationId} saved with score: ${finalScore}%`);

            // Update user_levels with the new conversation stats
            if (currentUserLanguage.targetLanguage) {
                await updateUserLevels(userId, currentUserLanguage.targetLanguage);
            }

            // Reset for next session
            currentConversationId = null;
            sessionStartTime = null;
        } catch (error) {
            console.error('Error saving conversation:', error);
        }
    }

    res.json({
        success: true,
        message: 'Session ended',
        conversationId: savedConversationId, // Return saved conversation ID
        report: report ? {
            grammarScore: report.grammarScore,
            fluencyScore: report.fluencyScore,
            overallScore: report.overallScore,
            feedback: report.feedback,
            suggestions: report.suggestions
        } : null,
        // Final conversation evaluation (using server-side counters for accurate tracking)
        conversationEvaluation: {
            conversationId: savedConversationId,
            correctSentences: finalCorrectCount,
            incorrectSentences: serverIncorrectCount,
            totalSentences: serverMessageCount,
            accuracyScore: finalScore,
            mistakes: conversationScore.mistakes.map((m: any) => ({
                sentence: m.originalSentence,
                mistakeType: m.mistakeType,
                explanation: m.explanation
            }))
        }
    });
});

// Get session status
app.get('/api/session/status', (_req: Request, res: Response) => {
    const isActive = sessionController.isSessionRecording();
    const session = sessionController.getCurrentSession();

    res.json({
        success: true,
        isActive,
        session: session ? {
            sessionId: session.getSessionId(),
            topicId: session.getTopicId(),
            startTime: session.getStartTime()
        } : null
    });
});

// ==================== PERFORMANCE ROUTES ====================

// Get performance history
app.get('/api/performance/history', (req: Request, res: Response) => {
    if (!req.tokenUser) {
        res.status(401).json({ success: false, message: 'Please login first' });
        return;
    }

    const userId = req.tokenUser.id;
    const history = database.fetchPerformanceHistory(userId);

    res.json({ success: true, history });
});

// ==================== FEEDBACK HISTORY API ====================

// Get user's feedback history
app.get('/api/feedback/history', async (req: Request, res: Response) => {
    if (!req.tokenUser) {
        res.status(401).json({ success: false, message: 'Please login first' });
        return;
    }

    const userId = req.tokenUser.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    try {
        if (mysqlAvailable && feedbackRepository) {
            const history = await feedbackRepository.getByUserId(userId, limit, offset);
            const totalCount = await feedbackRepository.getUserFeedbackCount(userId);
            
            // Parse JSON fields
            const formattedHistory = history.map(item => ({
                ...item,
                detailed_analysis: typeof item.detailed_analysis === 'string' 
                    ? JSON.parse(item.detailed_analysis) 
                    : item.detailed_analysis,
                score_breakdown: typeof item.score_breakdown === 'string' 
                    ? JSON.parse(item.score_breakdown) 
                    : item.score_breakdown
            }));
            
            res.json({
                success: true,
                history: formattedHistory,
                pagination: {
                    total: totalCount,
                    limit: limit,
                    offset: offset,
                    hasMore: offset + limit < totalCount
                }
            });
        } else {
            res.json({ success: true, history: [], pagination: { total: 0, limit, offset, hasMore: false } });
        }
    } catch (error) {
        console.error('Error fetching feedback history:', error);
        res.status(500).json({ success: false, message: 'Error fetching feedback history' });
    }
});

// Get user's mistakes only
app.get('/api/feedback/mistakes', async (req: Request, res: Response) => {
    if (!req.tokenUser) {
        res.status(401).json({ success: false, message: 'Please login first' });
        return;
    }

    const userId = req.tokenUser.id;
    const limit = parseInt(req.query.limit as string) || 20;

    try {
        if (mysqlAvailable && feedbackRepository) {
            const mistakes = await feedbackRepository.getUserMistakes(userId, limit);
            
            // Parse JSON fields
            const formattedMistakes = mistakes.map(item => ({
                ...item,
                detailed_analysis: typeof item.detailed_analysis === 'string' 
                    ? JSON.parse(item.detailed_analysis) 
                    : item.detailed_analysis,
                score_breakdown: typeof item.score_breakdown === 'string' 
                    ? JSON.parse(item.score_breakdown) 
                    : item.score_breakdown
            }));
            
            res.json({ success: true, mistakes: formattedMistakes });
        } else {
            res.json({ success: true, mistakes: [] });
        }
    } catch (error) {
        console.error('Error fetching user mistakes:', error);
        res.status(500).json({ success: false, message: 'Error fetching mistakes' });
    }
});

// Get user's feedback stats
app.get('/api/feedback/stats', async (req: Request, res: Response) => {
    if (!req.tokenUser) {
        res.status(401).json({ success: false, message: 'Please login first' });
        return;
    }

    const userId = req.tokenUser.id;

    try {
        if (mysqlAvailable && feedbackRepository) {
            const stats = await feedbackRepository.getUserErrorStats(userId);
            const totalCount = await feedbackRepository.getUserFeedbackCount(userId);
            
            res.json({
                success: true,
                stats: stats,
                totalFeedbacks: totalCount
            });
        } else {
            res.json({ success: true, stats: [], totalFeedbacks: 0 });
        }
    } catch (error) {
        console.error('Error fetching feedback stats:', error);
        res.status(500).json({ success: false, message: 'Error fetching stats' });
    }
});

// Get single feedback detail
app.get('/api/feedback/:id', async (req: Request, res: Response) => {
    if (!req.tokenUser) {
        res.status(401).json({ success: false, message: 'Please login first' });
        return;
    }

    const feedbackId = parseInt(req.params.id);

    try {
        if (mysqlAvailable && feedbackRepository) {
            const feedback = await feedbackRepository.getById(feedbackId);
            
            if (feedback && feedback.user_id === req.tokenUser.id) {
                // Parse JSON fields
                const formattedFeedback = {
                    ...feedback,
                    detailed_analysis: typeof feedback.detailed_analysis === 'string' 
                        ? JSON.parse(feedback.detailed_analysis) 
                        : feedback.detailed_analysis,
                    score_breakdown: typeof feedback.score_breakdown === 'string' 
                        ? JSON.parse(feedback.score_breakdown) 
                        : feedback.score_breakdown
                };
                
                res.json({ success: true, feedback: formattedFeedback });
            } else {
                res.status(404).json({ success: false, message: 'Feedback not found' });
            }
        } else {
            res.status(404).json({ success: false, message: 'Feedback not found' });
        }
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ success: false, message: 'Error fetching feedback' });
    }
});

// ==================== SERVE FRONTEND ====================

app.get('/', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Admin Panel
app.get('/admin', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Start server
const startServer = async () => {
    // Initialize MySQL (optional)
    await initializeMySQL();

    app.listen(PORT, () => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`  Real-Time Speaking Partner - Web Server`);
        console.log(`${'='.repeat(60)}`);
        console.log(`\n  🌐 Server running at: http://localhost:${PORT}`);
        console.log(`  🔧 Admin Panel: http://localhost:${PORT}/admin`);
        console.log(`  📚 API Documentation: http://localhost:${PORT}/api`);
        console.log(`\n${'='.repeat(60)}\n`);
    });
};

startServer();

export default app;
