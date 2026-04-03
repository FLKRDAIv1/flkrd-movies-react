import { createClient } from '@supabase/supabase-js';

declare global {
    interface ImportMeta {
        env: Record<string, string>;
    }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uipblcgmjvgkncvbqqma.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpcGJsY2dtanZna25jdmJxcW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTM0ODEsImV4cCI6MjA4ODQ2OTQ4MX0.5fQ0ZPsZ-SdCXkpUkvehRRy1YWbkQVmFAH_NRr03QdE';

export const supabase = createClient(supabaseUrl, supabaseKey);
