// This is a Vercel Serverless Function. 
// It proxies the POST request to OpenSubtitles to bypass CORS and Cloudflare blocks.

export default async function handler(req, res) {
    // Add CORS headers so localhost dev can access it if needed
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Api-Key');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        const { file_id } = req.body;

        if (!file_id) {
            return res.status(400).json({ error: 'file_id is required' });
        }

        const OPENSUBTITLES_API_KEY = 'TMK1BRNZCmW3AfZaJBZiGlieOD8Cq1hl';
        const USER_AGENT = 'flkrd_movies_v1';

        const response = await fetch('https://api.opensubtitles.com/api/v1/download', {
            method: 'POST',
            headers: {
                'Api-Key': OPENSUBTITLES_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': USER_AGENT
            },
            body: JSON.stringify({ file_id: parseInt(file_id) })
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error("Vercel Subtitle Proxy Error:", error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
