export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  // Add Cloudflare Worker environment bindings if required
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Extract path (e.g. /t/p/w500/poster.jpg)
    const tmdbPath = url.pathname;
    if (!tmdbPath || tmdbPath === '/') {
      return new Response('FLKRD MOVIES Edge Image Proxy Active', { status: 200 });
    }

    const originUrl = `https://image.tmdb.org${tmdbPath}`;
    const acceptHeader = request.headers.get('Accept') || '';

    // Determine target format based on browser support
    let format: 'avif' | 'webp' | undefined = undefined;
    if (acceptHeader.includes('image/avif')) {
      format = 'avif';
    } else if (acceptHeader.includes('image/webp')) {
      format = 'webp';
    }

    // Check Cloudflare Edge Cache
    const cache = (caches as any).default;
    const cacheKey = new Request(request.url, request);
    let response = await cache.match(cacheKey);

    if (!response) {
      // Pass image transformation flags to Cloudflare Edge Engine
      const fetchOptions: RequestInit & { cf?: any } = {
        cf: {
          image: {
            format: format || 'auto',
            quality: 80,
            fit: 'scale-down'
          }
        }
      };

      const originResponse = await fetch(originUrl, fetchOptions);

      if (!originResponse.ok) {
        return originResponse;
      }

      // Re-build response headers with aggressive 1-year immutable edge caching
      const headers = new Headers(originResponse.headers);
      headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
      headers.set('Vary', 'Accept');

      response = new Response(originResponse.body, {
        status: originResponse.status,
        headers
      });

      // Store in Cloudflare Edge cache asynchronously
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  }
};
