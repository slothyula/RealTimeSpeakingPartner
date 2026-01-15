
// (removed misplaced endpoint, will define after router and repositories)
/**
 * POST /api/admin/topics/update-active-status
 * Tüm konuların aktiflik durumunu usage_count'a göre günceller
 */

/**
 * Admin API Routes
 * Admin Panel için API endpoint'leri
 */

import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
// (moved endpoint definition below repository declarations)
// (removed misplaced endpoint, will define after router and repositories)
import {
    UserRepository,
    ConversationRepository,
    MessageRepository,
    TopicRepository,
    AdminRepository,
    GrammarMistakeRepository
} from '../database/repositories';

// Admin token storage (shared with server.ts)
// This will be set from server.ts
let adminTokenStore: Map<string, { adminId: number; username: string; email: string; fullName: string }> | null = null;

// Set admin token store from server
export function setAdminTokenStore(store: Map<string, { adminId: number; username: string; email: string; fullName: string }>) {
    adminTokenStore = store;
}

// Password hashing function (same as server.ts)
function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate random token
function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Admin authentication middleware
function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (adminTokenStore && adminTokenStore.has(token)) {
            const admin = adminTokenStore.get(token);
            if (admin) {
                (req as any).admin = admin;
                return next();
            }
        }
    }
    
    res.status(401).json({ success: false, message: 'Admin authentication required' });
}

// Extend Express Request to include admin
declare global {
    namespace Express {
        interface Request {
            admin?: { adminId: number; username: string; email: string; fullName: string };
        }
    }
}

const router = Router();

// Repository instances
const userRepo = new UserRepository();
const conversationRepo = new ConversationRepository();
const messageRepo = new MessageRepository();
const topicRepo = new TopicRepository();
const adminRepo = new AdminRepository();
const mistakeRepo = new GrammarMistakeRepository();

// ==================== ADMIN AUTHENTICATION ====================

/**
 * POST /api/admin/login
 * Admin login endpoint
 */
router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;

    console.log('🔐 Admin login attempt:', { username, hasPassword: !!password });

    if (!username || !password) {
        console.log('❌ Missing username or password');
        res.status(400).json({ success: false, message: 'Username and password are required' });
        return;
    }

    try {
        const passwordHash = hashPassword(password);
        console.log('🔑 Password hash generated:', passwordHash.substring(0, 20) + '...');
        const admin = await adminRepo.validateCredentials(username, passwordHash);
        console.log('👤 Admin lookup result:', admin ? `Found: ${admin.username}` : 'Not found');

        if (admin) {
            // Update last login
            await adminRepo.updateLastLogin(admin.admin_id);

            // Generate token
            const token = generateToken();
            console.log('🎫 Token generated:', token.substring(0, 20) + '...');
            console.log('💾 Admin token store available:', !!adminTokenStore);
            
            if (adminTokenStore) {
                adminTokenStore.set(token, {
                    adminId: admin.admin_id,
                    username: admin.username,
                    email: admin.email,
                    fullName: admin.full_name
                });
                console.log('✅ Token stored in adminTokenStore');
            } else {
                console.error('❌ adminTokenStore is null! Token will not be stored.');
            }

            console.log(`✅ Admin logged in: ${admin.username} (${admin.email})`);

            res.json({
                success: true,
                message: 'Login successful',
                token: token,
                admin: {
                    id: admin.admin_id,
                    username: admin.username,
                    email: admin.email,
                    fullName: admin.full_name
                }
            });
        } else {
            console.log('❌ Invalid credentials - admin not found or password mismatch');
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

/**
 * POST /api/admin/logout
 * Admin logout endpoint
 */
router.post('/logout', adminAuthMiddleware, (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (adminTokenStore) {
            adminTokenStore.delete(token);
            console.log(`✅ Admin logged out`);
        }
    }
    res.json({ success: true, message: 'Logout successful' });
});

/**
 * GET /api/admin/me
 * Get current admin info
 */
router.get('/me', adminAuthMiddleware, (req: Request, res: Response) => {
    if (req.admin) {
        res.json({
            success: true,
            admin: req.admin
        });
    } else {
        res.status(401).json({ success: false, message: 'Not authenticated' });
    }
});

// Move endpoint here, after topicRepo is defined
router.post('/topics/update-active-status', adminAuthMiddleware, async (_req: Request, res: Response) => {
    try {
        await topicRepo.updateActiveStatusByUsage();
        res.json({ success: true, message: 'Topic active statuses updated' });
    } catch (error) {
        console.error('Admin Update Topic Active Status Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update topic active statuses' });
    }
});
// ==================== DASHBOARD ====================

/**
 * GET /api/admin/dashboard
 * Dashboard istatistikleri
 */
router.get('/dashboard', adminAuthMiddleware, async (_req: Request, res: Response) => {
    try {
        const stats = await adminRepo.getDashboardStats();
        const dailyStats = await adminRepo.getDailyStats(7);
        const activeUsers = await adminRepo.getMostActiveUsers(5);
        const popularTopics = await adminRepo.getMostPopularTopics(5);

        res.json({
            success: true,
            data: {
                stats: stats || { total_users: 0, new_users_today: 0, conversations_today: 0, messages_today: 0, avg_score: 0, active_sessions: 0 },
                dailyStats: dailyStats || [],
                activeUsers: activeUsers || [],
                popularTopics: popularTopics || []
            }
        });
    } catch (error) {
        console.error('Admin Dashboard Error:', error);
        // Return empty data instead of error
        res.json({
            success: true,
            data: {
                stats: { total_users: 0, new_users_today: 0, conversations_today: 0, messages_today: 0, avg_score: 0, active_sessions: 0 },
                dailyStats: [],
                activeUsers: [],
                popularTopics: []
            }
        });
    }
});

// ==================== USERS ====================

/**
 * GET /api/admin/users
 * Tüm kullanıcıları listele (conversation istatistikleriyle birlikte)
 */
router.get('/users', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        
        // Get users with stats from conversations table
        const usersWithStats = await userRepo.findAllWithStats(limit, offset);
        const total = await userRepo.count();

        // Calculate proficiency level based on avg_score
        const users = usersWithStats.map(user => {
            const avgScore = user.avg_score || 0;
            let calculatedLevel = 'beginner';
            
            if (avgScore >= 80) {
                calculatedLevel = 'advanced';
            } else if (avgScore >= 50) {
                calculatedLevel = 'intermediate';
            } else {
                calculatedLevel = 'beginner';
            }
            
            // Convert seconds to minutes
            const totalPracticeMinutes = Math.round((user.total_practice_seconds || 0) / 60);
            
            return {
                ...user,
                proficiency_level: calculatedLevel,
                total_practice_minutes: totalPracticeMinutes,
                avg_score: Math.round(avgScore * 100) / 100
            };
        });

        res.json({
            success: true,
            data: {
                users,
                total,
                limit,
                offset
            }
        });
    } catch (error) {
        console.error('Admin Users Error:', error);
        res.status(500).json({ success: false, message: 'Failed to load users' });
    }
});

/**
 * GET /api/admin/users/:id
 * Kullanıcı detayı (her dil için ayrı seviye bilgisiyle)
 */
router.get('/users/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await userRepo.findById(userId);
        
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        const conversations = await conversationRepo.findByUserId(userId, 10);
        const mistakes = await mistakeRepo.findByUserId(userId, 10);
        const frequentMistakes = await mistakeRepo.getMostFrequentByUser(userId, 5);
        
        // Her dil için ayrı istatistikleri getir
        const statsByLanguage = await conversationRepo.getUserStatsByLanguage(userId);

        res.json({
            success: true,
            data: {
                user,
                conversations,
                mistakes,
                frequentMistakes,
                // Her dil için ayrı seviye bilgisi
                proficiency_by_language: statsByLanguage
            }
        });
    } catch (error) {
        console.error('Admin User Detail Error:', error);
        res.status(500).json({ success: false, message: 'Failed to load user details' });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Kullanıcıyı sil (soft delete)
 */
router.delete('/users/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            res.status(400).json({ success: false, message: 'Invalid user ID' });
            return;
        }
        
        // Kullanıcının var olup olmadığını kontrol et
        const user = await userRepo.findById(userId);
        
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        // Kullanıcı zaten silinmiş mi kontrol et
        if (!user.is_active) {
            res.status(400).json({ success: false, message: 'User is already deleted' });
            return;
        }

        // Soft delete yap (is_active = FALSE)
        await userRepo.softDelete(userId);
        
        console.log(`✅ Admin: User ${userId} (${user.name}) soft deleted`);
        
        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error('Admin Delete User Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
});

/**
 * POST /api/admin/users/create
 * Yeni kullanıcı oluştur
 */
router.post('/users/create', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const { name, email, password, proficiency_level } = req.body;
        
        // Validation
        if (!name || !email || !password) {
            res.status(400).json({ success: false, message: 'Name, email and password are required' });
            return;
        }
        
        if (password.length < 6) {
            res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
            return;
        }
        
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ success: false, message: 'Invalid email format' });
            return;
        }
        
        // Check if email already exists
        const existingUser = await userRepo.findByEmail(email);
        if (existingUser) {
            res.status(400).json({ success: false, message: 'Email already registered' });
            return;
        }
        
        // Hash password with SHA256 (same as AuthController)
        const crypto = require('crypto');
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
        
        // Create user using existing method
        const userId = await userRepo.createUser(
            name,
            email,
            passwordHash,
            proficiency_level || 'intermediate',
            'English' // default target language
        );
        
        if (!userId) {
            res.status(500).json({ success: false, message: 'Failed to create user' });
            return;
        }
        
        console.log(`✅ Admin: New user created - ID: ${userId}, Name: ${name}, Email: ${email}`);
        
        res.json({
            success: true,
            message: 'User created successfully',
            data: {
                user_id: userId,
                name,
                email,
                proficiency_level: proficiency_level || 'intermediate'
            }
        });
    } catch (error) {
        console.error('Admin Create User Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create user' });
    }
});

// ==================== CONVERSATIONS ====================

/**
 * GET /api/admin/conversations
 * Tüm konuşmaları listele (filtreli)
 */
router.get('/conversations', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        
        const filters = {
            userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
            topicId: req.query.topicId ? parseInt(req.query.topicId as string) : undefined,
            status: req.query.status as string | undefined,
            startDate: req.query.startDate as string | undefined,
            endDate: req.query.endDate as string | undefined
        };

        const conversations = await conversationRepo.findAll(limit, offset, filters);
        const total = await conversationRepo.count();

        res.json({
            success: true,
            data: {
                conversations,
                total,
                limit,
                offset
            }
        });
    } catch (error) {
        console.error('Admin Conversations Error:', error);
        res.status(500).json({ success: false, message: 'Failed to load conversations' });
    }
});

/**
 * GET /api/admin/conversations/:id
 * Konuşma detayı ve mesajları
 */
router.get('/conversations/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const conversationId = parseInt(req.params.id);
        const conversation = await conversationRepo.findByIdWithDetails(conversationId);
        
        if (!conversation) {
            res.status(404).json({ success: false, message: 'Conversation not found' });
            return;
        }

        const messages = await messageRepo.findByConversationId(conversationId);

        res.json({
            success: true,
            data: {
                conversation,
                messages
            }
        });
    } catch (error) {
        console.error('Admin Conversation Detail Error:', error);
        res.status(500).json({ success: false, message: 'Failed to load conversation details' });
    }
});

/**
 * DELETE /api/admin/conversations/:id
 * Konuşmayı sil
 */
router.delete('/conversations/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const conversationId = parseInt(req.params.id);
        
        if (isNaN(conversationId)) {
            res.status(400).json({ success: false, message: 'Invalid conversation ID' });
            return;
        }
        
        // Conversation'ın var olup olmadığını kontrol et
        const conversation = await conversationRepo.findByIdWithDetails(conversationId);
        
        if (!conversation) {
            res.status(404).json({ success: false, message: 'Conversation not found' });
            return;
        }

        // Conversation'ı sil (ilişkili mesajlar ve grammar mistakes de silinecek - CASCADE)
        await conversationRepo.delete(conversationId);
        
        console.log(`✅ Admin: Conversation ${conversationId} (User: ${conversation.user_name}) deleted`);
        
        res.json({ 
            success: true, 
            message: 'Conversation deleted successfully' 
        });
    } catch (error) {
        console.error('Admin Delete Conversation Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete conversation' });
    }
});

// ==================== TOPICS ====================

/**
 * GET /api/admin/topics
 * Tüm konuları listele (language filter support)
 */
router.get('/topics', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const targetLanguage = req.query.language as string | undefined;
        const topics = await topicRepo.findAll(false, targetLanguage); // Include inactive, with language filter
        const categories = await topicRepo.getCategories(targetLanguage);
        const supportedLanguages = await topicRepo.getSupportedLanguages();

        res.json({
            success: true,
            data: {
                topics,
                categories,
                supportedLanguages
            }
        });
    } catch (error) {
        console.error('Admin Topics Error:', error);
        res.status(500).json({ success: false, message: 'Failed to load topics' });
    }
});

/**
 * POST /api/admin/topics
 * Yeni konu oluştur (multilingual support)
 */
router.post('/topics', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const { name, description, category, difficulty, targetLanguage, sampleQuestions } = req.body;
        
        if (!name || !category || !difficulty) {
            res.status(400).json({ success: false, message: 'Missing required fields' });
            return;
        }

        // Default to English if not specified
        const topicTargetLanguage = targetLanguage || 'English';
        
        const topicId = await topicRepo.create(name, description, category, difficulty, topicTargetLanguage, sampleQuestions);
        
        if (topicId) {
            res.json({ success: true, message: 'Topic created', topicId });
        } else {
            res.status(500).json({ success: false, message: 'Failed to create topic' });
        }
    } catch (error) {
        console.error('Admin Create Topic Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create topic' });
    }
});

/**
 * PUT /api/admin/topics/:id
 * Konu güncelle
 */
router.put('/topics/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const topicId = parseInt(req.params.id);
        const updates = req.body;

        await topicRepo.update(topicId, updates);
        res.json({ success: true, message: 'Topic updated' });
    } catch (error) {
        console.error('Admin Update Topic Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update topic' });
    }
});

/**
 * DELETE /api/admin/topics/:id
 * Konu sil
 */
router.delete('/topics/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const topicId = parseInt(req.params.id);
        
        if (isNaN(topicId)) {
            res.status(400).json({ success: false, message: 'Invalid topic ID' });
            return;
        }
        
        // Topic'in var olup olmadığını kontrol et
        const topic = await topicRepo.findById(topicId);
        
        if (!topic) {
            res.status(404).json({ success: false, message: 'Topic not found' });
            return;
        }

        // Topic'i sil
        const deleted = await topicRepo.delete(topicId);
        
        if (deleted) {
            console.log(`✅ Admin: Topic ${topicId} (${topic.name}) deleted`);
            res.json({ 
                success: true, 
                message: 'Topic deleted successfully' 
            });
        } else {
            res.status(500).json({ success: false, message: 'Failed to delete topic' });
        }
    } catch (error) {
        console.error('Admin Delete Topic Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete topic' });
    }
});

// ==================== GRAMMAR MISTAKES ====================

/**
 * GET /api/admin/mistakes
 * Gramer hatası istatistikleri
 */
router.get('/mistakes', adminAuthMiddleware, async (_req: Request, res: Response) => {
    try {
        const mistakesByType = await mistakeRepo.countByType();
        const commonMistakes = await adminRepo.getCommonGrammarMistakes(10);

        res.json({
            success: true,
            data: {
                mistakesByType,
                commonMistakes
            }
        });
    } catch (error) {
        console.error('Admin Mistakes Error:', error);
        res.status(500).json({ success: false, message: 'Failed to load mistakes' });
    }
});

// ==================== ANALYTICS ====================

/**
 * GET /api/admin/analytics/daily
 * Günlük istatistikler
 */
router.get('/analytics/daily', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const dailyStats = await adminRepo.getDailyStats(days);

        res.json({
            success: true,
            data: dailyStats || []
        });
    } catch (error) {
        console.error('Admin Analytics Error:', error);
        res.json({ success: true, data: [] });
    }
});

// ==================== USER LEVELS ====================

/**
 * GET /api/admin/user-levels
 * Tüm kullanıcıların dil seviyelerini getir
 */
router.get('/user-levels', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const db = userRepo['db'];
        const rows = await db.query(`
            SELECT 
                ul.level_id,
                ul.user_id,
                u.name as user_name,
                u.email as user_email,
                ul.language_code,
                ul.language_name,
                ul.proficiency_level,
                ul.total_sessions,
                ul.total_practice_time,
                ul.average_score,
                ul.last_practiced_at,
                ul.created_at
            FROM user_levels ul
            JOIN users u ON ul.user_id = u.user_id
            ORDER BY u.name ASC, ul.language_name ASC
        `);

        // Kullanıcılara göre grupla
        const userLevelsMap = new Map();
        for (const row of rows as any[]) {
            if (!userLevelsMap.has(row.user_id)) {
                userLevelsMap.set(row.user_id, {
                    user_id: row.user_id,
                    user_name: row.user_name,
                    user_email: row.user_email,
                    languages: []
                });
            }
            userLevelsMap.get(row.user_id).languages.push({
                language_code: row.language_code,
                language_name: row.language_name,
                proficiency_level: row.proficiency_level,
                total_sessions: row.total_sessions,
                total_practice_time: row.total_practice_time,
                average_score: row.average_score,
                last_practiced_at: row.last_practiced_at
            });
        }

        res.json({
            success: true,
            data: Array.from(userLevelsMap.values())
        });
    } catch (error) {
        console.error('Admin User Levels Error:', error);
        res.status(500).json({ success: false, message: 'Failed to load user levels' });
    }
});

export default router;
