/**
 * Moderator Admin Kaydını Silme Scripti
 * 
 * Role-based control kullanılmadığı için gereksiz moderator kaydını siler.
 */

import { AdminRepository } from '../database/repositories/AdminRepository';
import MySQLConnection from '../database/MySQLConnection';

async function removeModerator() {
    try {
        // Connect to database first
        console.log('🔌 Connecting to database...');
        const db = MySQLConnection.getInstance();
        const connected = await db.connect();
        
        if (!connected) {
            console.error('❌ Failed to connect to database. Please check your MySQL server and config.');
            console.log('');
            console.log('💡 Alternative: Run the SQL script directly in phpMyAdmin:');
            console.log('   DELETE FROM admins WHERE username = "moderator";');
            process.exit(1);
        }

        const adminRepo = new AdminRepository();
        
        // Check if moderator exists
        const moderator = await adminRepo.findByUsername('moderator');
        
        if (!moderator) {
            console.log('ℹ️  Moderator admin not found. Already deleted or never existed.');
            return;
        }

        console.log('🔍 Found moderator admin:');
        console.log(`   ID: ${moderator.admin_id}`);
        console.log(`   Username: ${moderator.username}`);
        console.log(`   Email: ${moderator.email}`);
        console.log(`   Role: ${moderator.role}`);
        console.log('');

        // Delete moderator using direct SQL
        console.log('🗑️  Deleting moderator admin...');
        const sql = 'DELETE FROM admins WHERE username = ?';
        const result = await db.execute(sql, ['moderator']);
        
        if (result.affectedRows === 0) {
            console.log('⚠️  No rows affected. Moderator may already be deleted.');
            return;
        }
        
        console.log(`   Deleted ${result.affectedRows} row(s)`);

        console.log('✅ Moderator admin deleted successfully!');
        console.log('');

        // Verify deletion
        const remainingModerator = await adminRepo.findByUsername('moderator');
        if (remainingModerator) {
            console.error('❌ Warning: Moderator still exists after deletion attempt!');
        } else {
            console.log('✅ Verification: Moderator successfully removed.');
        }

        // List remaining admins
        console.log('');
        console.log('📋 Remaining admin accounts:');
        const allAdmins = await db.query('SELECT admin_id, username, email, full_name, role FROM admins ORDER BY admin_id');
        if (allAdmins.length === 0) {
            console.log('   (No admins found)');
        } else {
            allAdmins.forEach((admin: any) => {
                console.log(`   - ${admin.username} (${admin.email}) - ${admin.role}`);
            });
        }

    } catch (error) {
        console.error('❌ Error removing moderator:', error);
        process.exit(1);
    }
}

// Run the script
removeModerator()
    .then(() => {
        console.log('');
        console.log('✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

