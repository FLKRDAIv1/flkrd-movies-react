// api/vtt-inline.js
// Serves pre-built VTT content via a same-origin URL so iOS AVPlayer (Safari)
// can load it as a native <track> element.
//
// iOS/Safari AVPlayer CANNOT load:
//   - blob: URLs (sandboxed to the JS heap — AVFoundation can't reach them)
//   - data: URIs (same restriction)
//   - addTextTrack() JS cues (not visible in native fullscreen)
//
// This endpoint accepts base64-encoded VTT content and serves it as
// a proper text/vtt response from the same origin. This makes the subtitle
// track accessible to AVPlayer in native fullscreen mode.
//
// Query params:
//   d  – base64url-encoded VTT text (plain UTF-8)
//   t  – cache-busting timestamp (ignored, optional)

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Timing-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const rawData = req.query?.d || '';

  if (!rawData) {
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send('WEBVTT\n\n');
    return;
  }

  try {
    const base64 = rawData
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .replace(/\s/g, '');

    const vttText = Buffer.from(base64, 'base64').toString('utf-8');

    if (!vttText.trimStart().startsWith('WEBVTT')) {
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.status(400).send('WEBVTT\n\nNOTE Invalid content: does not start with WEBVTT header');
      return;
    }

    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    const buf = Buffer.from(vttText, 'utf-8');
    res.setHeader('Content-Length', buf.length);
    res.status(200).send(buf);
  } catch (err) {
    console.error('[vtt-inline] decode error:', err.message);
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).send('WEBVTT\n\nNOTE Server error decoding subtitle data');
  }
}
