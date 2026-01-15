/**
 * AIEngine Class
 * Class Diagram'dan: Core Engines (System Components) katmanı
 * 
 * Methods:
 * + generateResponse(transcribedText: String, context: Context): String
 * 
 * Relations:
 * - SessionController uses -> AIEngine
 */

import { Context } from '../models/types';

export class AIEngine {
    // Konuşma şablonları
    private responseTemplates: Map<string, string[]>;
    
    // Topic-specific responses
    private topicResponses: Map<string, string[]>;
    
    // Conversation memory
    private conversationHistory: string[];

    constructor() {
        this.responseTemplates = new Map();
        this.topicResponses = new Map();
        this.conversationHistory = [];
        
        this.initializeResponseTemplates();
        this.initializeTopicResponses();
        
        console.log('AIEngine: AI Engine initialized');
    }

    /**
     * + generateResponse(transcribedText: String, context: Context): String
     * Kullanıcı girdisine göre AI yanıtı üretir
     * Relation: SessionController uses -> AIEngine
     */
    public generateResponse(transcribedText: string, context: Context): string {
        console.log('AIEngine: Generating response...');
        
        // Konuşma geçmişine ekle
        this.conversationHistory.push(`User: ${transcribedText}`);
        
        // Context'ten bilgi al
        const userLevel = context.userProfile?.proficiencyLevel || 'intermediate';
        
        // Conversation turn'a göre yanıt karmaşıklığını ayarla
        const responseComplexity = context.currentTurn > 5 ? 'detailed' : 'simple';
        console.log(`AIEngine: Topic ${context.topicId}, Turn ${context.currentTurn}, Complexity: ${responseComplexity}`);
        
        // Intent'e göre yanıt belirle
        const intent = this.detectBasicIntent(transcribedText);
        
        let response = '';
        
        // Intent'e göre yanıt seç
        switch (intent) {
            case 'greeting':
                response = this.generateGreetingResponse(userLevel);
                break;
            case 'question':
                response = this.generateQuestionResponse(transcribedText, context);
                break;
            case 'farewell':
                response = this.generateFarewellResponse();
                break;
            case 'topic_change':
                response = this.generateTopicChangeResponse(context);
                break;
            default:
                response = this.generateConversationalResponse(transcribedText, context);
        }
        
        // Yanıtı geçmişe ekle
        this.conversationHistory.push(`AI: ${response}`);
        
        console.log(`AIEngine: Response generated: "${response.substring(0, 50)}..."`);
        return response;
    }

    /**
     * Basit intent algılama
     */
    private detectBasicIntent(text: string): string {
        const lowercaseText = text.toLowerCase();
        
        if (/^(hello|hi|hey|good morning|good afternoon|good evening)/.test(lowercaseText)) {
            return 'greeting';
        }
        
        if (/^(bye|goodbye|see you|take care)/.test(lowercaseText) || 
            /thank you for/.test(lowercaseText)) {
            return 'farewell';
        }
        
        if (/let's talk about|change.*topic|discuss/.test(lowercaseText)) {
            return 'topic_change';
        }
        
        if (/\?$/.test(text) || 
            /^(what|where|when|why|how|who|which|can|could|would)/.test(lowercaseText)) {
            return 'question';
        }
        
        return 'statement';
    }

    /**
     * Selamlama yanıtı üretir
     */
    private generateGreetingResponse(userLevel: string): string {
        const greetings = this.responseTemplates.get('greeting') || [];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        
        // Seviyeye göre ek mesaj
        let additionalMessage = '';
        if (userLevel === 'beginner') {
            additionalMessage = " Let's start with some simple conversation. Don't worry if you make mistakes!";
        } else if (userLevel === 'advanced') {
            additionalMessage = " Shall we discuss something challenging today?";
        }
        
        return randomGreeting + additionalMessage;
    }

    /**
     * Soru yanıtı üretir
     */
    private generateQuestionResponse(question: string, context: Context): string {
        const questionResponses = [
            "That's a great question! Let me think about it...",
            "Interesting question! From my perspective,",
            "I'm glad you asked that.",
            "Good point! Here's what I think:"
        ];
        
        // Sorunun uzunluğuna göre yanıt seç
        const questionLength = question.split(' ').length;
        const baseIndex = questionLength > 10 ? 0 : Math.floor(Math.random() * questionResponses.length);
        const base = questionResponses[baseIndex];
        
        // Konuya göre yanıt ekle
        const topicResponse = this.getTopicBasedResponse(context.topicId);
        
        return `${base} ${topicResponse} What do you think about this?`;
    }

    /**
     * Veda yanıtı üretir
     */
    private generateFarewellResponse(): string {
        const farewells = this.responseTemplates.get('farewell') || [];
        return farewells[Math.floor(Math.random() * farewells.length)];
    }

    /**
     * Konu değişikliği yanıtı üretir
     */
    private generateTopicChangeResponse(context: Context): string {
        const currentTopicId = context.topicId;
        const responses = [
            `Sure! We've been discussing topic ${currentTopicId}. What would you like to discuss next?`,
            "Of course! What topic interests you?",
            "No problem! Feel free to choose any topic you'd like to practice."
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    /**
     * Genel konuşma yanıtı üretir
     */
    private generateConversationalResponse(text: string, context: Context): string {
        const topicResponse = this.getTopicBasedResponse(context.topicId);
        
        // Kullanıcı metninin uzunluğuna göre yanıt ayarla
        const isDetailedInput = text.split(' ').length > 15;
        
        const conversationalElements = isDetailedInput ? [
            "That's a very detailed point!",
            "I appreciate your thorough explanation.",
            "You've given this a lot of thought."
        ] : [
            "That's interesting!",
            "I see what you mean.",
            "That's a valid point.",
            "I understand.",
            "That makes sense."
        ];
        
        const followUpQuestions = [
            "Could you tell me more about that?",
            "What made you think that way?",
            "How does that make you feel?",
            "Can you give me an example?",
            "What do you think about the opposite view?"
        ];
        
        const element = conversationalElements[Math.floor(Math.random() * conversationalElements.length)];
        const followUp = followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
        
        return `${element} ${topicResponse} ${followUp}`;
    }

    /**
     * Konu bazlı yanıt getirir
     */
    private getTopicBasedResponse(topicId: number): string {
        // TopicId'ye göre yanıt seç
        const topicResponses: { [key: number]: string[] } = {
            1: [ // Daily Conversations
                "In everyday life, communication is key.",
                "Daily interactions help us connect with others.",
                "Simple conversations can be very meaningful."
            ],
            2: [ // Business English
                "In the business world, clarity is essential.",
                "Professional communication requires precision.",
                "Effective workplace communication can boost productivity."
            ],
            3: [ // Travel and Tourism
                "Traveling opens up new perspectives.",
                "Exploring new places can be very enriching.",
                "Cultural experiences make travel memorable."
            ],
            4: [ // Academic Discussions
                "Academic discourse requires critical thinking.",
                "Analytical skills are crucial in scholarly discussions.",
                "Research and evidence support strong arguments."
            ]
        };
        
        const responses = topicResponses[topicId] || [
            "That's an interesting perspective.",
            "There are many ways to look at this.",
            "Let's explore this idea further."
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    /**
     * Yanıt şablonlarını başlatır
     */
    private initializeResponseTemplates(): void {
        this.responseTemplates.set('greeting', [
            "Hello! It's great to practice with you today. How are you feeling?",
            "Hi there! Welcome to your speaking practice session. What would you like to talk about?",
            "Good to see you! Ready for some conversation practice?",
            "Hello! I'm your AI speaking partner. Let's have a great conversation!"
        ]);
        
        this.responseTemplates.set('farewell', [
            "Great session today! You did an excellent job. See you next time!",
            "Thank you for practicing with me. Keep up the good work!",
            "It was wonderful talking with you. Practice makes perfect!",
            "Goodbye! Remember to practice regularly. You're making great progress!"
        ]);
        
        this.responseTemplates.set('encouragement', [
            "You're doing great! Keep going!",
            "Excellent effort! Your English is improving!",
            "Well done! That was a good sentence.",
            "Nice work! Your pronunciation is getting better."
        ]);
        
        this.responseTemplates.set('clarification', [
            "Could you please repeat that? I want to make sure I understand.",
            "Interesting! Could you elaborate on that?",
            "I'd like to hear more about what you mean.",
            "Can you explain that in more detail?"
        ]);
    }

    /**
     * Konu bazlı yanıtları başlatır
     */
    private initializeTopicResponses(): void {
        this.topicResponses.set('daily', [
            "How do you usually spend your weekends?",
            "What's your favorite thing to do after work?",
            "Do you prefer cooking at home or eating out?"
        ]);
        
        this.topicResponses.set('business', [
            "What do you think makes a good leader?",
            "How do you handle stress at work?",
            "What skills do you think are most important in your field?"
        ]);
        
        this.topicResponses.set('travel', [
            "What's your dream destination?",
            "Have you ever experienced culture shock while traveling?",
            "What do you usually do to prepare for a trip?"
        ]);
        
        this.topicResponses.set('academic', [
            "What are your thoughts on this theory?",
            "Can you provide evidence to support your argument?",
            "How would you approach this problem analytically?"
        ]);
    }

    /**
     * Konuşma geçmişini temizler
     */
    public clearHistory(): void {
        this.conversationHistory = [];
        console.log('AIEngine: Conversation history cleared');
    }

    /**
     * Konuşma geçmişini döndürür
     */
    public getConversationHistory(): string[] {
        return [...this.conversationHistory];
    }
}
