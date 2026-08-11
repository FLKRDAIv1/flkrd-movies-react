// api/subtitle-proxy.ts
// Serverless Proxy Endpoint for OpenSubtitles & External Subtitle CORS Bypass
// Handles requests for OpenSubtitles API & direct SRT/VTT file downloads.

interface SubtitleProxyRequest {
  query: Record<string, string | string[] | undefined>;
  body?: any;
  method?: string;
}

interface SubtitleProxyResponse {
  setHeader(name: string, value: string): void;
  status(code: number): SubtitleProxyResponse;
  send(body: any): void;
  end(): void;
}

/**
 * Converts raw SRT text to standard WebVTT format
 */
function convertSrtToVtt(srtText: string): string {
  if (!srtText) return 'WEBVTT\n\n';

  // Strip BOM and RTL directional control markers
  let text = srtText
    .replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  if (text.trim().startsWith('WEBVTT')) {
    return text;
  }

  // Convert SRT timestamps (00:00:00,000 -> 00:00:00.000)
  const vtt = text
    .replace(/(\d{1,2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .replace(/^[ \t]*\d+[ \t]*$/gm, '')
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/\n{3,}/g, '\n\n');

  return 'WEBVTT\n\n' + vtt.trimStart();
}

/**
 * Constructs appropriate request headers for upstream subtitle servers
 */
function getUpstreamHeaders(targetUrl: string): Record<string, string> {
  const isStremio = targetUrl.includes('strem.io') || targetUrl.includes('stremio');
  if (isStremio) {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/plain, application/octet-stream, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.strem.io',
      'Referer': 'https://www.strem.io/',
    };
  }

  const headers: Record<string, string> = {
    'User-Agent': 'FLKRD_Movies_App/1.0 (Mozilla/5.0 Macintosh)',
    'Accept': 'text/plain, application/x-subrip, text/vtt, */*',
    'Accept-Language': 'en-US,en;q=0.9,km;q=0.8',
  };

  // Attach OpenSubtitles API Key securely from server environment if targeting OpenSubtitles
  if (targetUrl.includes('opensubtitles.com') || targetUrl.includes('opensubtitles.org')) {
    const apiKey = process.env.OPENSUBTITLES_API_KEY || '';
    if (apiKey) {
      headers['Api-Key'] = apiKey;
    }
    headers['User-Agent'] = process.env.OPENSUBTITLES_USER_AGENT || 'FLKRD_Movies v1.0';
  }

  return headers;
}

export default async function handler(req: SubtitleProxyRequest, res: SubtitleProxyResponse) {
  // Enforce global CORS headers to allow cross-origin browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Api-Key, X-Requested-With');
  res.setHeader('Content-Type', 'text/vtt; charset=utf-8');

  // Handle CORS OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const targetUrl = (req.query.url || req.body?.url) as string;

    if (!targetUrl) {
      return res.status(400).send('WEBVTT\n\nNOTE Error: Missing target "url" parameter');
    }

    let formattedUrl = targetUrl.trim();
    if (formattedUrl.startsWith('//')) {
      formattedUrl = `https:${formattedUrl}`;
    }

    const headers = getUpstreamHeaders(formattedUrl);
    const upstreamRes = await fetch(formattedUrl, { headers });

    if (!upstreamRes.ok) {
      console.error(`[Subtitle Proxy] Upstream Error ${upstreamRes.status}: ${formattedUrl}`);
      return res
        .status(upstreamRes.status)
        .send(`WEBVTT\n\nNOTE Upstream Error ${upstreamRes.status}: Unable to fetch subtitle file`);
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Multi-encoding fallback (UTF-8 -> Windows-1256 for Arabic/Kurdish -> UTF-8 lossy)
    let rawText = '';
    try {
      rawText = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      try {
        rawText = new TextDecoder('windows-1256').decode(bytes);
      } catch {
        rawText = new TextDecoder('utf-8').decode(bytes);
      }
    }

    // Convert SRT to WebVTT
    const webVttContent = convertSrtToVtt(rawText);

    // Cache responses for 1 day
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(webVttContent);
  } catch (error: any) {
    console.error('[Subtitle Proxy Internal Error]:', error);
    return res.status(500).send(`WEBVTT\n\nNOTE Proxy Failure: ${error.message || 'Unknown Server Error'}`);
  }
}
