/**
 * AIEngine Class - Google Gemini API Integration
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Context } from '../models/types';

export class AIEngine {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private conversationHistory: string[];
    private chat: any;
    private currentSessionId: number | null = null;
    private userMessageCount: number = 0;
    private incorrectCount: number = 0;
    private lastScore: number = 100;

    constructor() {
        this.genAI = new GoogleGenerativeAI('AIzaSyB94B2lrCOuIney1ypYpVZ0L94JW8NLGM4');
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        this.conversationHistory = [];
        this.chat = null;
        console.log('AIEngine: AI Engine initialized with Google Gemini API');
    }

    public startConversation(sessionId: number): void {
        this.currentSessionId = sessionId;
        this.conversationHistory = [];
        this.userMessageCount = 0;
        this.incorrectCount = 0;
        this.lastScore = 100;
        this.chat = null;
    }

    public recordUserMessage(text: string): void {
        this.userMessageCount++;
        this.conversationHistory.push('User: ' + text);
    }

    public async analyzeAndRespond(text: string, context: Context): Promise<any> {
        try {
            const systemPrompt = this.createSystemPrompt(context);
            if (!this.chat) {
                this.chat = this.model.startChat({
                    history: [
                        { role: 'user', parts: [{ text: systemPrompt }] },
                        { role: 'model', parts: [{ text: 'I understand! Ready to help practice.' }] }
                    ],
                    generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
                });
            }
            const result = await this.chat.sendMessage(text);
            const response = result.response.text();
            let feedback = response;
            let sentenceStatus = 'correct';
            let mistakes: any[] = [];
            try {
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    feedback = parsed.feedback || response;
                    sentenceStatus = parsed.sentence_status || 'correct';
                    mistakes = parsed.mistakes || [];
                }
            } catch (e) { feedback = response; }
            this.conversationHistory.push('AI: ' + feedback);
            const isCorrect = sentenceStatus === 'correct' && mistakes.length === 0;
            if (!isCorrect) this.incorrectCount++;
            this.lastScore = isCorrect ? 100 : Math.max(60, 100 - mistakes.length * 10);
            return { sentence_status: sentenceStatus, mistakes, feedback, scoring: { is_correct_sentence: isCorrect, mistake_count: mistakes.length } };
        } catch (error) {
            console.error('AIEngine: Gemini API error:', error);
            const fallback = 'That is interesting! Can you tell me more?';
            this.conversationHistory.push('AI: ' + fallback);
            return { sentence_status: 'correct', mistakes: [], feedback: fallback, scoring: { is_correct_sentence: true, mistake_count: 0 } };
        }
    }

    public getCurrentStats() {
        return { score: this.lastScore, total: this.userMessageCount, incorrect: this.incorrectCount };
    }

    public endConversation() {
        return { finalScore: this.lastScore, mistakes: [], totalSentences: this.userMessageCount, incorrectSentences: this.incorrectCount, correctSentenceCount: this.userMessageCount - this.incorrectCount };
    }

    private createSystemPrompt(context: Context): string {
        const topicName = context.topicName || 'General Conversation';
        const targetLanguage = context.targetLanguage || 'English';
        const userLevel = context.userProfile?.proficiencyLevel || 'intermediate';
        return 'You are a helpful ' + targetLanguage + ' language practice partner. Topic: ' + topicName + '. User level: ' + userLevel + '. Engage in natural conversation, correct mistakes gently, provide encouraging feedback, ask follow-up questions.';
    }

    public async generateResponseAsync(text: string, context: Context): Promise<string> {
        const result = await this.analyzeAndRespond(text, context);
        return result.feedback;
    }

    public clearHistory(): void {
        this.conversationHistory = [];
        this.chat = null;
    }

    public getConversationHistory(): string[] {
        return [...this.conversationHistory];
    }
}
