const mysql = require('mysql2/promise');

async function addUserLevels() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'speaking_partner'
    });
    
    // Mevcut kullanıcıları al
    const [users] = await conn.execute('SELECT user_id, name FROM users');
    console.log('Mevcut kullanıcı sayısı:', users.length);
    
    // Diller
    const languages = [
        { code: 'en', name: 'English' },
        { code: 'de', name: 'German' },
        { code: 'fr', name: 'French' },
        { code: 'es', name: 'Spanish' },
        { code: 'tr', name: 'Turkish' }
    ];
    
    const levels = ['beginner', 'intermediate', 'advanced'];
    
    for (const user of users) {
        // Her kullanıcı için rastgele 2-4 dil ekle
        const numLanguages = Math.floor(Math.random() * 3) + 2;
        const shuffled = [...languages].sort(() => Math.random() - 0.5);
        const selectedLanguages = shuffled.slice(0, numLanguages);
        
        for (const lang of selectedLanguages) {
            const level = levels[Math.floor(Math.random() * 3)];
            const sessions = Math.floor(Math.random() * 20);
            const practiceTime = sessions * Math.floor(Math.random() * 30 + 10);
            const avgScore = Math.floor(Math.random() * 30 + 70);
            
            try {
                await conn.execute(
                    'INSERT INTO user_levels (user_id, language_code, language_name, proficiency_level, total_sessions, total_practice_time, average_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [user.user_id, lang.code, lang.name, level, sessions, practiceTime, avgScore]
                );
            } catch (e) {
                // Duplicate key ise atla
                if (!e.message.includes('Duplicate')) throw e;
            }
        }
    }
    
    console.log('Kullanıcı dil seviyeleri eklendi!');
    
    // Sonuçları göster
    const [result] = await conn.execute(
        'SELECT u.name, ul.language_name, ul.proficiency_level, ul.total_sessions, ul.average_score FROM user_levels ul JOIN users u ON ul.user_id = u.user_id ORDER BY u.name, ul.language_name'
    );
    
    console.log('');
    console.log('User Levels:');
    let currentUser = '';
    result.forEach(r => {
        if (r.name !== currentUser) {
            console.log('');
            console.log('  ' + r.name + ':');
            currentUser = r.name;
        }
        const levelEmoji = r.proficiency_level === 'beginner' ? '🌱' : r.proficiency_level === 'intermediate' ? '⭐' : '🏆';
        console.log('    ' + levelEmoji + ' ' + r.language_name + ': ' + r.proficiency_level + ' | Sessions: ' + r.total_sessions + ' | Avg: ' + r.average_score + '%');
    });
    
    await conn.end();
}

addUserLevels().catch(e => console.error(e));
