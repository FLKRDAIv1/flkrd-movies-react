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
 * Converts raw SRT text to standard WebVTT format, preserving styling tags
 * and only stripping sequence numbers that directly precede timestamps.
 */
function convertSrtToVtt(srtText: string, offsetMs: number = 0, speedRatio: number = 1.0): string {
  if (!srtText) return 'WEBVTT\n\n';

  // Strip BOM and RTL directional control markers
  let text = srtText
    .replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  if (text.trim().startsWith('WEBVTT') && offsetMs === 0 && Math.abs(speedRatio - 1.0) < 0.001) {
    return text;
  }

  const offsetSec = offsetMs / 1000;
  const parseTimecode = (tc: string): number => {
    const parts = tc.trim().replace(',', '.').split(':');
    if (parts.length === 3) {
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    }
    return 0;
  };

  const formatVttTime = (seconds: number): string => {
    const safeSec = Math.max(0, seconds);
    const hrs = Math.floor(safeSec / 3600);
    const mins = Math.floor((safeSec - hrs * 3600) / 60);
    const secs = Math.floor(safeSec - hrs * 3600 - mins * 60);
    const ms = Math.min(999, Math.floor(Math.round((safeSec % 1) * 1000)));
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // Split into cue blocks
  const blocks = text.trim().split(/\n\n+/);
  let vtt = 'WEBVTT\n\n';
  let cueIdx = 0;

  for (const block of blocks) {
    const lines = block.split('\n');
    const timeLineIdx = lines.findIndex(l => l.includes('-->'));
    if (timeLineIdx === -1) continue;

    const timeParts = lines[timeLineIdx].split('-->');
    if (timeParts.length !== 2) continue;

    const startSec = (parseTimecode(timeParts[0]) * speedRatio) + offsetSec;
    const endSec = (parseTimecode(timeParts[1]) * speedRatio) + offsetSec;

    // Drop cues ending before start of video (prevents WebVTT parser crash)
    if (endSec <= 0.01) continue;

    const effectiveStart = Math.max(0, startSec);
    const effectiveEnd = Math.max(effectiveStart + 0.05, endSec);

    const textLines = lines.slice(timeLineIdx + 1).filter(l => l.trim() !== '');
    const cleanCueText = textLines
      .join('\n')
      .replace(/<font[^>]*>/gi, '')
      .replace(/<\/font>/gi, '');

    if (!cleanCueText.trim()) continue;

    cueIdx++;
    vtt += `${cueIdx}\n`;
    vtt += `${formatVttTime(effectiveStart)} --> ${formatVttTime(effectiveEnd)}\n`;
    vtt += `${cleanCueText}\n\n`;
  }

  return vtt;
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

    // If target URL is JSON (e.g. Stremio discovery endpoint) or upstream is JSON, return JSON
    const isJson = formattedUrl.endsWith('.json') || (upstreamRes.headers.get('content-type') || '').includes('application/json');
    if (isJson) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(rawText);
    }

    // Convert SRT to WebVTT with optional offset and framerate speed calibration
    const reqOffset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
    const reqSpeed = req.query.speed ? parseFloat(String(req.query.speed)) : 1.0;
    const webVttContent = convertSrtToVtt(
      rawText,
      isNaN(reqOffset) ? 0 : reqOffset,
      isNaN(reqSpeed) || reqSpeed <= 0.5 || reqSpeed >= 2.0 ? 1.0 : reqSpeed
    );

    // Cache responses for 1 day
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(webVttContent);
  } catch (error: any) {
    console.error('[Subtitle Proxy Internal Error]:', error);
    return res.status(500).send(`WEBVTT\n\nNOTE Proxy Failure: ${error.message || 'Unknown Server Error'}`);
  }
}
