import { createClient } from '@supabase/supabase-js';

declare global {
    interface ImportMeta {
        env: Record<string, string>;
    }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kqezlyhoqfelgfhdfxzf.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_XD-RWNKEDJLppZ6Cc4MkcA_TAMhxFZt';

export const supabase = createClient(supabaseUrl, supabaseKey);
