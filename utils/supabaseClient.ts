import { createClient } from '@supabase/supabase-js';

declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

const DIRECT_SUPABASE_HOST = 'https://ofddaeofptotnxeoxfko.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZGRhZW9mcHRvdG54ZW94ZmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDk1NDIsImV4cCI6MjEwMDMyNTU0Mn0.Y502Vk2zlev9d4Hbkjt6VniV_xFXjl41YW4EE26wCNc';

// Compute the cloaked same-origin endpoint so the browser Network Tab never exposes supabase.co
const getCoreEndpoint = (): string => {
  if (typeof window === 'undefined') {
    return 'https://fkurd.pro/api/flkrd-core';
  }
  const proto = window.location.protocol;
  // If running inside native Tauri desktop app or file://, target the production gateway
  if (proto === 'tauri:' || proto === 'file:' || (window as any).__TAURI_INTERNALS__) {
    return 'https://fkurd.pro/api/flkrd-core';
  }
  // In browser (both production and localhost), route seamlessly via same-origin proxy
  return `${window.location.origin}/api/flkrd-core`;
};

const supabaseUrl = getCoreEndpoint();
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

/**
 * Resilient Supabase Fetcher with Automatic Bypass & Failover
 * 
 * 1. Tries the cloaked same-origin proxy (/api/flkrd-core) first.
 * 2. If proxy returns 502/503/504 or network fetch throws (e.g. proxy offline, Vercel edge timeout, CORS),
 *    it AUTOMATICALLY BYPASSES the proxy and retries directly against Supabase upstream.
 * 3. Never throws uncaught network rejections that would crash React state.
 */
const resilientSupabaseFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  const prepareHeaders = (existing?: HeadersInit): Headers => {
    const h = new Headers(existing || {});
    if (!h.has('apikey')) h.set('apikey', supabaseKey);
    if (!h.has('authorization')) h.set('authorization', `Bearer ${supabaseKey}`);
    return h;
  };

  try {
    const res = await fetch(input, init);
    // If the proxy responds with 502/503/504 Bad Gateway, bypass directly to upstream
    if (res.status >= 502 && res.status <= 504 && urlStr.includes('/api/flkrd-core')) {
      console.warn('[SUPABASE SHIELD] Proxy gateway issue (' + res.status + ') — bypassing directly to Supabase upstream...');
      const directUrl = urlStr.replace(/^https?:\/\/[^/]+\/api\/flkrd-core/, DIRECT_SUPABASE_HOST);
      const directHeaders = prepareHeaders(init?.headers);
      return await fetch(directUrl, { ...init, headers: directHeaders });
    }
    return res;
  } catch (proxyError: any) {
    // If fetch failed completely (network error, CORS block, proxy down), bypass directly
    if (urlStr.includes('/api/flkrd-core')) {
      console.warn('[SUPABASE SHIELD] Proxy unreachable, activating direct Supabase bypass:', proxyError?.message);
      try {
        const directUrl = urlStr.replace(/^https?:\/\/[^/]+\/api\/flkrd-core/, DIRECT_SUPABASE_HOST);
        const directHeaders = prepareHeaders(init?.headers);
        return await fetch(directUrl, { ...init, headers: directHeaders });
      } catch (directError: any) {
        console.warn('[SUPABASE SHIELD] Direct connection also degraded:', directError?.message);
        return new Response(JSON.stringify({ error: directError?.message || 'Network unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    throw proxyError;
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'flkrd_auth_session',
  },
  global: {
    fetch: resilientSupabaseFetch,
    headers: {
      'x-client-info': 'flkrd-quantum-core',
    },
  },
});

// Configure Realtime client to use direct upstream Supabase WebSocket host
// so channels/presences connect reliably without failing on HTTP-only edge proxies
try {
  const REALTIME_WS = 'wss://ofddaeofptotnxeoxfko.supabase.co/realtime/v1/websocket';
  if ((supabase as any).realtime) {
    (supabase as any).realtime.endPoint = REALTIME_WS;
    (supabase as any).realtime.httpEndpoint = 'https://ofddaeofptotnxeoxfko.supabase.co/realtime/v1';
  }
} catch (e) {
  // Silent fallback
}
