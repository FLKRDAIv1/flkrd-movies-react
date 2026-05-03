import { createClient } from '@supabase/supabase-js';

declare global {
    interface ImportMeta {
        env: Record<string, string>;
    }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fmahzalaxbkmhbpcally.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYWh6YWxheGJrbWhicGNhbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjQ0NDYsImV4cCI6MjA5MzM0MDQ0Nn0.d4y612cjG6bSHL6vNK1YdxFmKjCJ6YpDIV7oG9XFis4';

export const supabase = createClient(supabaseUrl, supabaseKey);
