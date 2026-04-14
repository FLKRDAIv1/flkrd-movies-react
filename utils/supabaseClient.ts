import { createClient } from '@supabase/supabase-js';

declare global {
    interface ImportMeta {
        env: Record<string, string>;
    }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kqezlyhoqfelgfhdfxzf.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_1kQfO_UIJTrLrID6J2yXMg_Ym-NacoA';

export const supabase = createClient(supabaseUrl, supabaseKey);
