/**
 * AuthController Class
 * Class Diagram'dan: Backend Web Services & Controllers katmanı
 * 
 * Methods:
 * + processCredentials(data: Map): boolean
 * + createUser(data: Map): boolean
 * + login(email: String, password: String): void
 * 
 * Relations:
 * - WebInterface sends credentials -> AuthController
 * - AuthController creates -> Database
 * - AuthController validates -> Database
 */

import { Database } from '../database/Database';
import { User } from '../models/User';
import { DataMap } from '../models/types';

export class AuthController {
    // Relation: AuthController creates/validates -> Database
    private database: Database;
    
    // Aktif kullanıcı oturumu
    private currentUser: User | null;

    constructor(database: Database) {
        this.database = database;
        this.currentUser = null;
        
        console.log('AuthController: Authentication controller initialized');
    }

    /**
     * + processCredentials(data: Map): boolean
     * Kullanıcı kimlik bilgilerini işler ve doğrular
     * Relation: WebInterface sends credentials -> AuthController
     */
    public processCredentials(data: DataMap): boolean {
        console.log('AuthController: Processing credentials...');
        
        const email = data.get('email') as string;
        const password = data.get('password') as string;
        
        // Gerekli alanları kontrol et
        if (!email || !password) {
            console.log('AuthController: Missing email or password');
            return false;
        }
        
        // Email format kontrolü
        if (!this.validateEmailFormat(email)) {
            console.log('AuthController: Invalid email format');
            return false;
        }
        
        // Şifre gücü kontrolü
        if (!this.validatePasswordStrength(password)) {
            console.log('AuthController: Password does not meet requirements');
            return false;
        }
        
        // Relation: AuthController validates -> Database
        const isValid = this.database.validateUserCredentials(email, password);
        
        if (isValid) {
            // Kullanıcıyı getir ve oturumu başlat
            const user = this.database.getUserByEmail(email);
            if (user) {
                this.currentUser = user;
                console.log(`AuthController: Credentials processed successfully for ${email}`);
            }
        }
        
        return isValid;
    }

    /**
     * + createUser(data: Map): boolean
     * Yeni kullanıcı oluşturur
     * Relation: AuthController creates -> Database
     */
    public createUser(data: DataMap): boolean {
        console.log('AuthController: Creating new user...');
        
        const name = data.get('name') as string;
        const email = data.get('email') as string;
        const password = data.get('password') as string;
        
        // Gerekli alanları kontrol et
        if (!name || !email || !password) {
            console.log('AuthController: Missing required fields');
            return false;
        }
        
        // Email format kontrolü
        if (!this.validateEmailFormat(email)) {
            console.log('AuthController: Invalid email format');
            return false;
        }
        
        // Şifre gücü kontrolü
        if (!this.validatePasswordStrength(password)) {
            console.log('AuthController: Password does not meet requirements');
            return false;
        }
        
        // Email benzersizliği kontrolü
        if (this.database.getUserByEmail(email)) {
            console.log('AuthController: Email already exists');
            return false;
        }
        
        // Yeni kullanıcı oluştur
        const userId = this.database.generateUserId();
        const newUser = new User(userId, name, email, password);
        
        // Relation: AuthController creates -> Database
        const success = this.database.storeUser(newUser);
        
        if (success) {
            console.log(`AuthController: User "${name}" created successfully with ID ${userId}`);
        }
        
        return success;
    }

    /**
     * + login(email: String, password: String): void
     * Kullanıcı girişi yapar
     * Relation: WebInterface sends credentials -> AuthController
     */
    public login(email: string, password: string): void {
        console.log(`AuthController: Login attempt for ${email}...`);
        
        // Kimlik bilgilerini doğrula
        const credentials: DataMap = new Map([
            ['email', email],
            ['password', password]
        ]);
        
        const isValid = this.processCredentials(credentials);
        
        if (isValid) {
            const user = this.database.getUserByEmail(email);
            if (user) {
                this.currentUser = user;
                console.log(`AuthController: Login successful for ${user.getName()}`);
            }
        } else {
            console.log('AuthController: Login failed - Invalid credentials');
            this.currentUser = null;
        }
    }

    /**
     * Kullanıcı çıkışı yapar
     */
    public logout(): void {
        if (this.currentUser) {
            console.log(`AuthController: Logging out user ${this.currentUser.getName()}`);
            this.currentUser = null;
        }
    }

    /**
     * Aktif kullanıcıyı döndürür
     */
    public getCurrentUser(): User | null {
        return this.currentUser;
    }

    /**
     * Aktif kullanıcıyı ayarlar (MySQL login için)
     */
    public setCurrentUser(user: User): void {
        this.currentUser = user;
    }

    /**
     * Kullanıcının giriş yapıp yapmadığını kontrol eder
     */
    public isLoggedIn(): boolean {
        return this.currentUser !== null;
    }

    // Private helper methods

    /**
     * Email format doğrulaması
     */
    private validateEmailFormat(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Şifre gücü kontrolü (min 6 karakter)
     */
    private validatePasswordStrength(password: string): boolean {
        return password.length >= 6;
    }

}

