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

    if (req.method === 'GET') {
        const { languages, order_by, order_direction, tmdb_id, type } = req.query;
        
        try {
            const OPENSUBTITLES_API_KEY = 'TMK1BRNZCmW3AfZaJBZiGlieOD8Cq1hl';
            const USER_AGENT = 'flkrd_movies_v1';

            let url = `https://api.opensubtitles.com/api/v1/subtitles?`;
            if (languages) url += `languages=${languages}&`;
            if (order_by) url += `order_by=${order_by}&`;
            if (order_direction) url += `order_direction=${order_direction}&`;
            if (tmdb_id) url += `tmdb_id=${tmdb_id}&`;
            if (type) url += `type=${type}&`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Api-Key': OPENSUBTITLES_API_KEY,
                    'User-Agent': USER_AGENT,
                    'Accept': 'application/json'
                }
            });

            const data = await response.json();
            return res.status(response.status).json(data);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST or GET.' });
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
        return res.status(response.status).json(data);
    } catch (error) {
        console.error("Vercel Subtitle Proxy Error:", error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
