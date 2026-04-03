import { createClient } from '@supabase/supabase-js';

declare global {
    interface ImportMeta {
        env: Record<string, string>;
    }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uipblcgmjvgkncvbqqma.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_wephsiCymEXfeNJxcRfEFg_f7pP4FKv';

export const supabase = createClient(supabaseUrl, supabaseKey);
