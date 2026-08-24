import { createClient } from '@supabase/supabase-js';

declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

// Compute the cloaked same-origin endpoint so the browser Network Tab never exposes supabase.co
const getCoreEndpoint = (): string => {
  if (typeof window === 'undefined') {
    return 'https://fkurd.pro/api/flkrd-core';
  }
  const proto = window.location.protocol;
  // If running inside native Tauri desktop app, target the production gateway
  if (proto === 'tauri:' || (window as any).__TAURI_INTERNALS__) {
    return 'https://fkurd.pro/api/flkrd-core';
  }
  // In browser (both production and localhost), route seamlessly via same-origin proxy
  return `${window.location.origin}/api/flkrd-core`;
};

const supabaseUrl = getCoreEndpoint();
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZGRhZW9mcHRvdG54ZW94ZmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDk1NDIsImV4cCI6MjEwMDMyNTU0Mn0.Y502Vk2zlev9d4Hbkjt6VniV_xFXjl41YW4EE26wCNc';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'flkrd_auth_session',
  },
  global: {
    headers: {
      'x-client-info': 'flkrd-quantum-core',
    },
  },
});
