/**
 * User Levels Senkronizasyon Script
 * Conversations tablosundan gerçek verileri çekerek user_levels tablosunu günceller
 */

const mysql = require('mysql2/promise');

const langCodeMap = {
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

async function syncUserLevels() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'speaking_partner'
    });

    try {
        // Sahte verileri sil
        await conn.execute('DELETE FROM user_levels');
        console.log('✓ Sahte veriler silindi');

        // Her kullanıcı ve dil için conversations tablosundan gerçek verileri hesapla
        const [stats] = await conn.execute(`
            SELECT 
                c.user_id,
                c.target_language,
                COUNT(*) as total_sessions,
                SUM(c.duration_seconds) as total_seconds,
                AVG(c.overall_score) as avg_score
            FROM conversations c
            WHERE c.status = 'completed'
            GROUP BY c.user_id, c.target_language
        `);

        console.log('✓ Gerçek conversation istatistikleri:', stats.length, 'kayıt');

        for (const stat of stats) {
            const langCode = langCodeMap[stat.target_language] || stat.target_language.toLowerCase().substring(0, 2);
            const practiceMinutes = Math.round((stat.total_seconds || 0) / 60);
            const avgScore = stat.avg_score ? Math.round(stat.avg_score) : 70;

            // Seviye hesapla
            let level = 'beginner';
            if (avgScore >= 80) level = 'advanced';
            else if (avgScore >= 60) level = 'intermediate';

            await conn.execute(
                `INSERT INTO user_levels (user_id, language_code, language_name, proficiency_level, total_sessions, total_practice_time, average_score)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [stat.user_id, langCode, stat.target_language, level, stat.total_sessions, practiceMinutes, avgScore]
            );
            console.log(`  + user_id=${stat.user_id}, ${stat.target_language} (${stat.total_sessions} sessions, ${avgScore}%)`);
        }

        // Conversation olmayan kullanıcılar için default target_language ekle
        const [users] = await conn.execute(`
            SELECT u.user_id, u.name, u.target_language, u.proficiency_level
            FROM users u
            WHERE u.user_id NOT IN (SELECT DISTINCT user_id FROM conversations WHERE status = 'completed')
        `);

        for (const user of users) {
            const langCode = langCodeMap[user.target_language] || 'en';
            await conn.execute(
                `INSERT INTO user_levels (user_id, language_code, language_name, proficiency_level, total_sessions, total_practice_time, average_score)
                 VALUES (?, ?, ?, ?, 0, 0, 0)`,
                [user.user_id, langCode, user.target_language, user.proficiency_level]
            );
            console.log(`  + Yeni kullanıcı: ${user.name} - ${user.target_language} (0 sessions)`);
        }

        // Sonuç
        const [result] = await conn.execute('SELECT ul.*, u.name FROM user_levels ul JOIN users u ON ul.user_id = u.user_id ORDER BY u.name, ul.language_name');
        console.log('\n✓ Toplam user_levels:', result.length, 'kayıt');
        result.forEach(r => {
            console.log(`   ${r.name}: ${r.language_name} - ${r.proficiency_level} (${r.total_sessions} sessions, ${r.total_practice_time} min, ${r.average_score}%)`);
        });

    } finally {
        await conn.end();
    }
}

syncUserLevels().then(() => {
    console.log('\n✅ User levels senkronizasyonu tamamlandı!');
}).catch(e => {
    console.error('❌ Hata:', e);
    process.exit(1);
});
