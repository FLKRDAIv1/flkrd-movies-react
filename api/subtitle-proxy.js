// api/subtitle-proxy.js
// Vercel Serverless Function: Universal Subtitle CORS & Encoding Proxy
// Fetches external subtitle files (from OpenSubtitles, SubDL, Stremio, Supabase, etc.),
// cleans BOM/RTL markers, converts SRT to standard WebVTT, and returns HTTP 200 with CORS headers.

function convertSrtToVtt(srtText) {
    if (!srtText) return 'WEBVTT\n\n';

    // Remove BOM and directional markers
    let text = srtText
        .replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
        .replace(/\u00A0/g, ' ')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

    if (text.trim().startsWith('WEBVTT')) {
        return text;
    }

    // Convert SRT timestamp format: 00:00:00,000 -> 00:00:00.000
    let vtt = text
        .replace(/(\d{1,2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
        .replace(/^[ \t]*\d+[ \t]*$/gm, '')
        .replace(/<font[^>]*>/gi, '')
        .replace(/<\/font>/gi, '')
        .replace(/\n{3,}/g, '\n\n');

    return 'WEBVTT\n\n' + vtt.trimStart();
}

/**
 * Build the correct headers for each subtitle source.
 * subs5.strem.io / stremio returns HTTP 469 unless the request looks like
 * it comes from the Stremio desktop/web app.
 */
function buildHeadersForUrl(rawUrl) {
    const isStremio = rawUrl.includes('strem.io') || rawUrl.includes('stremio');
    const isOpenSubtitles = rawUrl.includes('opensubtitles');

    if (isStremio) {
        return {
            // These mimic what the Stremio web app sends
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/plain, application/octet-stream, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Origin': 'https://www.strem.io',
            'Referer': 'https://www.strem.io/',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
        };
    }

    if (isOpenSubtitles) {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/plain, */*',
            'Referer': 'https://www.opensubtitles.com/',
        };
    }

    return {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/plain, application/octet-stream, */*',
        'Accept-Language': 'en-US,en;q=0.9',
    };
}

export default async function handler(req, res) {
    // Enable CORS for all domains and mobile webviews
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const targetUrl = req.query.url || req.body?.url;
        if (!targetUrl) {
            return res.status(400).send('WEBVTT\n\nNOTE Error: Missing url parameter');
        }

        let rawUrl = String(targetUrl);
        if (rawUrl.startsWith('//')) {
            rawUrl = `https:${rawUrl}`;
        }

        const headers = buildHeadersForUrl(rawUrl);

        // First attempt
        let fetchRes = await fetch(rawUrl, { headers });

        // If stremio returns 469, retry once with a slightly different UA
        if (!fetchRes.ok && (fetchRes.status === 469 || fetchRes.status === 403) && rawUrl.includes('strem.io')) {
            console.warn(`[SUBTITLE PROXY] Stremio returned ${fetchRes.status}, retrying with alternate headers...`);
            fetchRes = await fetch(rawUrl, {
                headers: {
                    ...headers,
                    'User-Agent': 'Stremio/5.0.0 (Windows NT 10.0; Win64; x64)',
                    'X-Stremio-Auth': '',
                }
            });
        }

        if (!fetchRes.ok) {
            console.error(`[SUBTITLE PROXY] Upstream error ${fetchRes.status} for: ${rawUrl}`);
            return res.status(502).send(`WEBVTT\n\nNOTE Upstream Error ${fetchRes.status}: ${fetchRes.statusText} — ${rawUrl}`);
        }

        const rawText = await fetchRes.text();

        // Sanity-check: if the response looks like an HTML error page, reject it
        if (rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html')) {
            console.error('[SUBTITLE PROXY] Got HTML instead of subtitle text');
            return res.status(502).send('WEBVTT\n\nNOTE Error: Server returned HTML instead of subtitle data');
        }

        const vttText = convertSrtToVtt(rawText);

        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
        return res.status(200).send(vttText);
    } catch (err) {
        console.error('[SUBTITLE PROXY ERROR]', err);
        return res.status(500).send(`WEBVTT\n\nNOTE Proxy Failure: ${err.message || 'Unknown'}`);
    }
}
