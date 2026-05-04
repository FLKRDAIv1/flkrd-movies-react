import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Fetching existing...");
    const { data: fetch1, error: err1 } = await supabase.from('kurdish_cc_registry').select('*');
    console.log("Fetch result:", fetch1, err1);

    console.log("Trying to insert...");
    const { data, error } = await supabase
        .from('kurdish_cc_registry')
        .insert([{
            tmdb_id: 1202549,
            media_type: 'movie',
            title: 'The Well',
            poster_path: '/c5kGttzE6QGq10vDCRFj2tJdI3w.jpg'
        }])
        .select();
        
    console.log("Insert result:", data, error);
}
test();
