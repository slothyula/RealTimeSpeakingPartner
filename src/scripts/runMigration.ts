/**
 * Database Migration Runner
 * Çok dilli destek için veritabanı migration'ını çalıştırır
 */

import MySQLConnection from '../database/MySQLConnection';

async function runMigration() {
    console.log('🚀 Starting database migration for multilingual support...\n');
    
    const db = MySQLConnection.getInstance();
    
    try {
        // Bağlantıyı başlat
        const connected = await db.connect();
        if (!connected) {
            console.error('❌ Failed to connect to database. Please check your MySQL connection settings.');
            process.exit(1);
        }

        console.log('✅ Connected to database\n');

        // Helper: Kolonun var olup olmadığını kontrol et
        async function columnExists(tableName: string, columnName: string): Promise<boolean> {
            try {
                const result = await db.query<any[]>(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = ? 
                    AND COLUMN_NAME = ?
                `, [tableName, columnName]);
                return result.length > 0;
            } catch (error) {
                return false;
            }
        }

        // Helper: Index'in var olup olmadığını kontrol et
        async function indexExists(tableName: string, indexName: string): Promise<boolean> {
            try {
                const result = await db.query<any[]>(`
                    SELECT INDEX_NAME 
                    FROM INFORMATION_SCHEMA.STATISTICS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = ? 
                    AND INDEX_NAME = ?
                `, [tableName, indexName]);
                return result.length > 0;
            } catch (error) {
                return false;
            }
        }

        // 1. USERS tablosuna target_language ekle
        console.log('⏳ Step 1: Adding target_language to users table...');
        try {
            if (!(await columnExists('users', 'target_language'))) {
                await db.execute(`
                    ALTER TABLE users 
                    ADD COLUMN target_language VARCHAR(50) DEFAULT 'English' AFTER native_language
                `);
                console.log('   ✅ Column added to users table');
            } else {
                console.log('   ✓ Column already exists in users table');
            }

            if (!(await indexExists('users', 'idx_target_language'))) {
                await db.execute(`ALTER TABLE users ADD INDEX idx_target_language (target_language)`);
                console.log('   ✅ Index added to users table');
            } else {
                console.log('   ✓ Index already exists in users table');
            }

            await db.execute(`UPDATE users SET target_language = 'English' WHERE target_language IS NULL OR target_language = ''`);
            console.log('   ✅ Updated existing users\n');
        } catch (error: any) {
            console.error('   ❌ Error:', error.message);
        }

        // 2. TOPICS tablosuna target_language ekle
        console.log('⏳ Step 2: Adding target_language to topics table...');
        try {
            if (!(await columnExists('topics', 'target_language'))) {
                await db.execute(`
                    ALTER TABLE topics 
                    ADD COLUMN target_language VARCHAR(50) DEFAULT 'English' AFTER difficulty
                `);
                console.log('   ✅ Column added to topics table');
            } else {
                console.log('   ✓ Column already exists in topics table');
            }

            if (!(await indexExists('topics', 'idx_target_language'))) {
                await db.execute(`ALTER TABLE topics ADD INDEX idx_target_language (target_language)`);
                console.log('   ✅ Index added to topics table');
            } else {
                console.log('   ✓ Index already exists in topics table');
            }

            await db.execute(`UPDATE topics SET target_language = 'English' WHERE target_language IS NULL OR target_language = ''`);
            console.log('   ✅ Updated existing topics\n');
        } catch (error: any) {
            console.error('   ❌ Error:', error.message);
        }

        // 3. CONVERSATIONS tablosuna target_language ekle
        console.log('⏳ Step 3: Adding target_language to conversations table...');
        try {
            if (!(await columnExists('conversations', 'target_language'))) {
                await db.execute(`
                    ALTER TABLE conversations 
                    ADD COLUMN target_language VARCHAR(50) DEFAULT 'English' AFTER topic_id
                `);
                console.log('   ✅ Column added to conversations table');
            } else {
                console.log('   ✓ Column already exists in conversations table');
            }

            if (!(await indexExists('conversations', 'idx_target_language'))) {
                await db.execute(`ALTER TABLE conversations ADD INDEX idx_target_language (target_language)`);
                console.log('   ✅ Index added to conversations table');
            } else {
                console.log('   ✓ Index already exists in conversations table');
            }

            await db.execute(`UPDATE conversations SET target_language = 'English' WHERE target_language IS NULL OR target_language = ''`);
            console.log('   ✅ Updated existing conversations\n');
        } catch (error: any) {
            console.error('   ❌ Error:', error.message);
        }

        console.log('\n✅ Migration completed successfully!\n');
        console.log('📝 Summary:');
        console.log('   - Users table: target_language column added');
        console.log('   - Topics table: target_language column added');
        console.log('   - Conversations table: target_language column added');
        console.log('\n🎉 Database is now ready for multilingual support!\n');

        await db.disconnect();
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        await db.disconnect();
        process.exit(1);
    }
}

// Script'i çalıştır
runMigration();

