// api/flkrd-core.ts
// FLKRD Quantum Defense Edge Proxy
// Cloaks Supabase backend infrastructure, strips server fingerprints, and shields API endpoints

export const config = {
  runtime: 'edge',
};

const UPSTREAM_ORIGIN = 'https://ofddaeofptotnxeoxfko.supabase.co';
const DEFAULT_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZGRhZW9mcHRvdG54ZW94ZmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDk1NDIsImV4cCI6MjEwMDMyNTU0Mn0.Y502Vk2zlev9d4Hbkjt6VniV_xFXjl41YW4EE26wCNc';

export default async function handler(req: Request): Promise<Response> {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer, Range, x-client-info, X-Requested-With',
        'Access-Control-Max-Age': '86400',
        'Server': 'FLKRD-Shield',
      },
    });
  }

  try {
    const reqUrl = new URL(req.url);
    
    // Extract target sub-path after /api/flkrd-core
    let subPath = reqUrl.pathname.replace(/^\/api\/flkrd-core/, '');
    
    // Check if path is passed via rewrite query
    const searchParams = new URLSearchParams(reqUrl.search);
    if ((!subPath || subPath === '/' || subPath === '') && searchParams.has('path')) {
      subPath = searchParams.get('path') || '';
      searchParams.delete('path');
    }

    if (!subPath.startsWith('/')) {
      subPath = '/' + subPath;
    }

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const upstreamUrl = `${UPSTREAM_ORIGIN}${subPath}${queryString}`;

    // 2. Clone and sanitize request headers
    const forwardHeaders = new Headers();
    req.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      // Skip host and connection headers
      if (lowerKey !== 'host' && lowerKey !== 'connection') {
        forwardHeaders.set(key, value);
      }
    });

    forwardHeaders.set('host', 'ofddaeofptotnxeoxfko.supabase.co');

    // Ensure apikey header is present
    if (!forwardHeaders.has('apikey')) {
      forwardHeaders.set('apikey', DEFAULT_ANON_KEY);
    }
    if (!forwardHeaders.has('authorization')) {
      forwardHeaders.set('authorization', `Bearer ${DEFAULT_ANON_KEY}`);
    }

    // 3. Fetch from Upstream
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
      // @ts-ignore
      duplex: 'half'
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = req.body;
    }

    const upstreamRes = await fetch(upstreamUrl, fetchOptions);

    // 4. Sanitize and cloak response headers (strip all Supabase & Cloudflare fingerprints)
    const responseHeaders = new Headers();
    upstreamRes.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      // Strip any Supabase, project ref, or tracking headers
      if (
        lowerKey.startsWith('sb-') ||
        lowerKey.startsWith('x-supabase') ||
        lowerKey === 'cf-ray' ||
        lowerKey === 'server-timing'
      ) {
        return;
      }
      responseHeaders.set(key, value);
    });

    // Enforce FLKRD Shield Identity
    responseHeaders.set('Server', 'FLKRD-Shield');
    responseHeaders.set('X-Powered-By', 'FLKRD-Security-Core');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Encoding, Content-Location, Content-Range, Content-Type, Date, Location, Range-Unit');

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Internal Security Gateway Error' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Server': 'FLKRD-Shield',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
