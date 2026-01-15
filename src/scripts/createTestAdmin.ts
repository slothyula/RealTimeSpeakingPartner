/**
 * Test Admin Oluşturma Scripti
 * 
 * Bu script test için bir admin kullanıcısı oluşturur.
 * Password: "admin123" (SHA256 hash'lenmiş)
 */

import { AdminRepository } from '../database/repositories/AdminRepository';
import MySQLConnection from '../database/MySQLConnection';
import crypto from 'crypto';

function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function createTestAdmin() {
    try {
        // Connect to database first
        console.log('🔌 Connecting to database...');
        const db = MySQLConnection.getInstance();
        const connected = await db.connect();
        
        if (!connected) {
            console.error('❌ Failed to connect to database. Please check your MySQL server and config.');
            console.log('');
            console.log('💡 Alternative: Run the SQL script directly in phpMyAdmin or MySQL console:');
            console.log('   database/create_test_admin.sql');
            process.exit(1);
        }

        const adminRepo = new AdminRepository();
        
        const username = 'admin';
        const email = 'admin@test.com';
        const password = 'admin123'; // Test password
        const passwordHash = hashPassword(password);
        const fullName = 'Test Administrator';
        const role = 'super_admin';

        console.log('🔧 Creating test admin...');
        console.log(`   Username: ${username}`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password} (will be hashed)`);
        console.log(`   Password Hash: ${passwordHash}`);

        // Check if admin already exists
        const existingAdmin = await adminRepo.findByUsername(username);
        if (existingAdmin) {
            console.log('⚠️  Admin already exists! Updating password...');
            const updated = await adminRepo.updatePassword(username, passwordHash);
            if (updated) {
                console.log('✅ Admin password updated successfully!');
                console.log('');
                console.log('📋 Login Credentials:');
                console.log(`   Username: ${username}`);
                console.log(`   Password: ${password}`);
                console.log('');
                console.log('🌐 Access admin panel at: http://localhost:4499/admin');
            } else {
                console.log('❌ Failed to update admin password.');
            }
            return;
        }

        const adminId = await adminRepo.create(
            username,
            email,
            passwordHash,
            fullName,
            role
        );

        if (adminId) {
            console.log('✅ Test admin created successfully!');
            console.log(`   Admin ID: ${adminId}`);
            console.log('');
            console.log('📋 Login Credentials:');
            console.log(`   Username: ${username}`);
            console.log(`   Password: ${password}`);
            console.log('');
            console.log('🌐 Access admin panel at: http://localhost:4499/admin');
        } else {
            console.log('❌ Failed to create admin. Check database connection.');
        }
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
}

// Run the script
createTestAdmin()
    .then(() => {
        console.log('✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

