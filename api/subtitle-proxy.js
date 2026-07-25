// api/subtitle-proxy.js
// Vercel Serverless Function: Universal Subtitle CORS & Encoding Proxy
// Fetches external subtitle files (from OpenSubtitles, SubDL, Stremio, Supabase, etc.),
// cleans BOM/RTL markers, converts SRT to standard WebVTT, and returns HTTP 200 with Access-Control-Allow-Origin: * headers.

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

export default async function handler(req, res) {
    // Enable CORS for all domains and mobile webviews
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Content-Type'
    );
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

        // Fetch external subtitle file
        const fetchRes = await fetch(rawUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        });

        if (!fetchRes.ok) {
            return res.status(fetchRes.status).send(`WEBVTT\n\nNOTE Fetch Error: ${fetchRes.statusText}`);
        }

        const rawText = await fetchRes.text();
        const vttText = convertSrtToVtt(rawText);

        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
        return res.status(200).send(vttText);
    } catch (err) {
        console.error('[SUBTITLE PROXY ERROR]', err);
        return res.status(500).send(`WEBVTT\n\nNOTE Proxy Failure: ${err.message || 'Unknown'}`);
    }
}
