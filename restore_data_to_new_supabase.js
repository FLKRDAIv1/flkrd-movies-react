import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ofddaeofptotnxeoxfko.supabase.co';
const SUPABASE_KEY = process.argv[2] || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ Please provide your Supabase Anon/Service Key as an argument or in .env.local!');
    console.error('Usage: node restore_data_to_new_supabase.js <YOUR_SUPABASE_KEY>');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function restore() {
    console.log(`🚀 Starting data restoration to ${SUPABASE_URL}...`);
    
    // 1. Load movies backup
    const backupPath = 'data movie restored/dubbed_movies_backup (2).json';
    if (!fs.existsSync(backupPath)) {
        console.error(`❌ Backup file not found: ${backupPath}`);
        return;
    }

    const movies = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`📦 Loaded ${movies.length} movies from backup.`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < movies.length; i++) {
        const m = movies[i];
        console.log(`[${i + 1}/${movies.length}] Restoring: ${m.title || m.kurdishTitle || m.id}`);

        const { error } = await supabase.from('dubbed_movies').upsert(m, { onConflict: 'id' });
        if (error) {
            console.error(`   ⚠️ Error restoring ${m.id}:`, error.message);
            failCount++;
        } else {
            successCount++;
        }
    }

    console.log(`\n🎉 Restoration complete!`);
    console.log(`✅ Successfully restored: ${successCount} movies`);
    if (failCount > 0) {
        console.log(`❌ Failed: ${failCount} movies (Make sure the dubbed_movies table exists first!)`);
    }
}

restore();
