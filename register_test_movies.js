import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function addTestMovies() {
    const testMovies = [
        { tmdb_id: 1202549, media_type: 'movie', title: 'The Well', poster_path: '/c5kGttzE6QGq10vDCRFj2tJdI3w.jpg' },
        { tmdb_id: 823464, media_type: 'movie', title: 'Godzilla x Kong: The New Empire', poster_path: '/tMefBSflR6PGQLvLuPEHZotAKhQ.jpg' },
        { tmdb_id: 653346, media_type: 'movie', title: 'Kingdom of the Planet of the Apes', poster_path: '/gKkl37BQuEPA924PZ6QpTcCPdaf.jpg' }
    ];

    for (const m of testMovies) {
        const { error } = await supabase.from('kurdish_cc_registry').insert([m]);
        if (error) console.error("Error:", error);
        else console.log("Added", m.title);
    }
}
addTestMovies();
