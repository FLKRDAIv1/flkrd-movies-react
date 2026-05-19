// This is a Vercel Serverless Function. 
// It proxies all subtitle requests (OpenSubtitles and SubDL) to bypass CORS and Cloudflare blocks.

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

    const OPENSUBTITLES_KEYS = [
        '4BixV2IOdGyewzC3a0Dvqq1MYbfZ3yFx',
        'TMK1BRNZCmW3AfZaJBZiGlieOD8Cq1hl'
    ];
    const SUBDL_KEYS = [
        'subdl_s-YmuDA2wsocYnVVHrGzkUkZIWthD4F0fszNqBRfvL8'
    ];
    const USER_AGENT = 'flkrd_movies_v1';

    if (req.method === 'GET') {
        const { engine, languages, order_by, order_direction, tmdb_id, type, imdb_id, season_number, episode_number } = req.query;
        
        try {
            if (engine === 'subdl') {
                const cleanImdbId = imdb_id ? (imdb_id.startsWith('tt') ? imdb_id : `tt${imdb_id}`) : '';
                
                let url = `https://api.subdl.com/api/v1/subtitles?api_key=${SUBDL_KEYS[0]}&imdb_id=${cleanImdbId}&languages=${languages || 'Kurdish'}`;
                if (season_number && episode_number) {
                    url += `&season_number=${season_number}&episode_number=${episode_number}&type=tv`;
                } else {
                    url += `&type=movie`;
                }
                
                const response = await fetch(url);
                const data = await response.json();
                return res.status(response.status).json(data);
            } else {
                // OpenSubtitles GET with Key Rotation Fallback
                let lastError = null;
                for (const key of OPENSUBTITLES_KEYS) {
                    try {
                        let url = `https://api.opensubtitles.com/api/v1/subtitles?`;
                        if (languages) url += `languages=${languages}&`;
                        if (order_by) url += `order_by=${order_by}&`;
                        if (order_direction) url += `order_direction=${order_direction}&`;
                        if (tmdb_id) url += `tmdb_id=${tmdb_id}&`;
                        if (type) url += `type=${type}&`;
                        if (imdb_id) {
                            const cleanImdb = imdb_id.startsWith('tt') ? imdb_id : `tt${imdb_id}`;
                            url += `imdb_id=${cleanImdb}&`;
                        }
                        if (season_number) url += `season_number=${season_number}&`;
                        if (episode_number) url += `episode_number=${episode_number}&`;

                        const response = await fetch(url, {
                            method: 'GET',
                            headers: {
                                'Api-Key': key,
                                'User-Agent': USER_AGENT,
                                'Accept': 'application/json'
                            }
                        });

                        if (response.ok || response.status === 404) {
                            const data = await response.json();
                            return res.status(response.status).json(data);
                        }
                        lastError = await response.json().catch(() => ({ error: `Status ${response.status}` }));
                    } catch (e) {
                        lastError = e;
                    }
                }
                return res.status(500).json({ error: lastError || 'All API keys failed' });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const { file_id } = req.body;

            if (!file_id) {
                return res.status(400).json({ error: 'file_id is required' });
            }

            let lastError = null;
            for (const key of OPENSUBTITLES_KEYS) {
                try {
                    const response = await fetch('https://api.opensubtitles.com/api/v1/download', {
                        method: 'POST',
                        headers: {
                            'Api-Key': key,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'User-Agent': USER_AGENT
                        },
                        body: JSON.stringify({ file_id: parseInt(file_id) })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        return res.status(response.status).json(data);
                    }
                    lastError = await response.json().catch(() => ({ error: `Status ${response.status}` }));
                } catch (e) {
                    lastError = e;
                }
            }
            return res.status(500).json({ error: lastError || 'All download key routes failed' });
        } catch (error) {
            console.error("Vercel Subtitle Proxy Error:", error);
            return res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
}
