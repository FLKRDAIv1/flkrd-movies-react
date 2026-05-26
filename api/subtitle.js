// This is a Vercel Serverless Function. 
// It proxies all subtitle requests (Kurdish Scraper, OpenSubtitles, and SubDL) to bypass CORS and Cloudflare blocks.

const TMDB_API_KEY = '39ad6c4210f7e4357f3b5762fcaeb1db';
const USER_AGENT = 'flkrd_movies_v1';

const OPENSUBTITLES_KEYS = [
    '4BixV2IOdGyewzC3a0Dvqq1MYbfZ3yFx',
    'TMK1BRNZCmW3AfZaJBZiGlieOD8Cq1hl'
];

const SUBDL_KEYS = [
    'subdl_s-YmuDA2wsocYnVVHrGzkUkZIWthD4F0fszNqBRfvL8'
];

/**
 * Resolve IMDb ID or TMDb ID to an English title using TMDB API
 */
async function getMovieTitle(imdbId, tmdbId, type) {
    try {
        if (imdbId) {
            const cleanImdb = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
            const res = await fetch(`https://api.themoviedb.org/3/find/${cleanImdb}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
            if (res.ok) {
                const data = await res.json();
                const item = (data.movie_results && data.movie_results[0]) || (data.tv_results && data.tv_results[0]);
                if (item) {
                    return item.title || item.name || item.original_title || item.original_name;
                }
            }
        }
        if (tmdbId) {
            const res = await fetch(`https://api.themoviedb.org/3/${type === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`);
            if (res.ok) {
                const data = await res.json();
                return data.title || data.name || data.original_title || data.original_name;
            }
        }
    } catch (e) {
        console.warn("[BACKEND SUBTITLE PROXY] TMDB title lookup failed:", e.message);
    }
    return null;
}

/**
 * Scrape free Kurdish subtitles from kurdsubtitle.live WordPress REST API
 */
async function scrapeKurdishSubtitles(title) {
    if (!title) return [];
    const results = [];
    try {
        // Clean special characters to avoid breaking search
        const cleanQuery = title.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        if (!cleanQuery) return [];

        const wpUrl = `https://kurdsubtitle.live/wp-json/wp/v2/posts?search=${encodeURIComponent(cleanQuery)}&_fields=id,title,content`;
        const response = await fetch(wpUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        });
        
        if (!response.ok) return [];

        const posts = await response.json();
        if (!Array.isArray(posts)) return [];

        for (const post of posts) {
            const content = post.content?.rendered || '';
            const postTitle = post.title?.rendered || 'Kurdish Subtitle';
            
            // Extract links from content.rendered ending in srt, vtt, zip, rar or holding download paths
            const hrefRegex = /href="([^"]+)"/gi;
            let match;
            let index = 0;
            while ((match = hrefRegex.exec(content)) !== null) {
                const url = match[1];
                const isSubtitleLink = url.includes('.zip') || 
                                       url.includes('.rar') || 
                                       url.includes('.srt') || 
                                       url.includes('.vtt') || 
                                       url.includes('/download/');
                                       
                if (isSubtitleLink) {
                    const cleanPostTitle = postTitle.replace(/<\/?[^>]+(>|$)/g, "").trim();
                    const filename = url.split('/').pop().split('?')[0] || 'subtitle';
                    const display_name = `${cleanPostTitle} - ${decodeURIComponent(filename)}`;
                    
                    results.push({
                        id: `kurdsubtitle-${post.id}-${index++}`,
                        attributes: {
                            language: 'ku',
                            display_name: display_name,
                            url: url,
                            file_id: 0
                        }
                    });
                }
            }
        }
    } catch (e) {
        console.warn("[BACKEND SUBTITLE PROXY] Kurdsubtitle scraper error:", e.message);
    }
    return results;
}

export default async function handler(req, res) {
    // Add CORS headers so localhost dev can access it
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Api-Key');

    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            const { engine, languages, order_by, order_direction, tmdb_id, type, imdb_id, season_number, episode_number } = req.query;
            
            if (engine === 'subdl') {
                try {
                    const cleanImdbId = imdb_id ? (imdb_id.startsWith('tt') ? imdb_id : `tt${imdb_id}`) : '';
                    let url = `https://api.subdl.com/api/v1/subtitles?api_key=${SUBDL_KEYS[0]}&imdb_id=${cleanImdbId}&languages=${languages || 'Kurdish'}`;
                    if (season_number && episode_number) {
                        url += `&season_number=${season_number}&episode_number=${episode_number}&type=tv`;
                    } else {
                        url += `&type=movie`;
                    }
                    
                    const response = await fetch(url);
                    if (!response.ok) {
                        return res.status(200).json({ status: true, subtitles: [], _error: `SubDL returned ${response.status}` });
                    }
                    const data = await response.json();
                    return res.status(200).json(data);
                } catch (subdlErr) {
                    return res.status(200).json({ status: true, subtitles: [], _error: subdlErr.message });
                }
            } else {
                // Consolidated Discovery: Kurdish Scraper + OpenSubtitles Fallback
                let scraperResults = [];
                try {
                    const title = await getMovieTitle(imdb_id, tmdb_id, type);
                    if (title) {
                        scraperResults = await scrapeKurdishSubtitles(title);
                    }
                } catch (err) {
                    console.warn("[BACKEND SUBTITLE PROXY] Scraper failed:", err.message);
                }

                // OpenSubtitles GET with Key Rotation Fallback
                let openSubsResults = [];
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
                            openSubsResults = data.data || [];
                            lastError = null;
                            break; // Stop key rotation on success
                        }
                        lastError = await response.json().catch(() => ({ error: `Status ${response.status}` }));
                    } catch (e) {
                        lastError = e;
                    }
                }

                // Combine results (Scraper Kurdish Subtitles first!)
                const combined = [...scraperResults, ...openSubsResults];
                return res.status(200).json({ data: combined, status: true, _error: lastError ? (lastError.message || lastError.error) : undefined });
            }
        }

        if (req.method === 'POST') {
            try {
                let body = req.body;
                if (typeof body === 'string') {
                    try { body = JSON.parse(body); } catch(e) {}
                }
                const { file_id } = body || {};

                if (!file_id) {
                    return res.status(200).json({ link: null, error: 'file_id is required' });
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
                            return res.status(200).json(data);
                        }
                        lastError = await response.json().catch(() => ({ error: `Status ${response.status}` }));
                    } catch (e) {
                        lastError = e;
                    }
                }
                return res.status(200).json({ link: null, _error: lastError || 'All download key routes failed' });
            } catch (postErr) {
                return res.status(200).json({ link: null, _error: postErr.message });
            }
        }

        return res.status(200).json({ error: 'Method not allowed. Use GET or POST.' });
    } catch (globalError) {
        console.warn("[BACKEND SUBTITLE PROXY] Global serverless error caught:", globalError.message);
        return res.status(200).json({
            data: [],
            subtitles: [],
            status: true,
            link: null,
            _error: globalError.message || 'Internal server recovery triggered.'
        });
    }
}
