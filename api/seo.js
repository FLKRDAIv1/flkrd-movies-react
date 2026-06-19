import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fmahzalaxbkmhbpcally.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYWh6YWxheGJrbWhicGNhbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjQ0NDYsImV4cCI6MjA5MzM0MDQ0Nn0.d4y612cjG6bSHL6vNK1YdxFmKjCJ6YpDIV7oG9XFis4';
const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || process.env.TMDB_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

let htmlTemplate = null;

async function getTemplate(host) {
    if (htmlTemplate) return htmlTemplate;

    // 1. Try local file system read first (fastest)
    try {
        const fs = await import('fs');
        const path = await import('path');
        const localPath = path.join(process.cwd(), 'dist', 'index.html');
        if (fs.existsSync(localPath)) {
            htmlTemplate = fs.readFileSync(localPath, 'utf8');
            return htmlTemplate;
        }
    } catch (e) {
        console.warn("[SEO] Local dist/index.html read failed, trying root fallback:", e.message);
    }

    // 2. Try root folder fallback
    try {
        const fs = await import('fs');
        const path = await import('path');
        const rootPath = path.join(process.cwd(), 'index.html');
        if (fs.existsSync(rootPath)) {
            htmlTemplate = fs.readFileSync(rootPath, 'utf8');
            return htmlTemplate;
        }
    } catch (e) {
        console.warn("[SEO] Local index.html read failed:", e.message);
    }

    // 3. Network fetch fallback (bulletproof for serverless environments)
    try {
        const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
        const fetchUrl = `${protocol}://${host}/index.html`;
        console.log(`[SEO] Fetching template from ${fetchUrl}`);
        const res = await fetch(fetchUrl);
        if (res.ok) {
            htmlTemplate = await res.text();
            return htmlTemplate;
        }
    } catch (e) {
        console.error("[SEO] Failed to fetch index.html template from host:", e.message);
    }

    // 4. Ultimate skeleton fallback
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FLKRD MOVIES</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>`;
}

export default async function handler(req, res) {
    const { type, id } = req.query;
    const host = req.headers.host || 'fkurd.pro';

    let title = 'FLKRD MOVIES | Stream Movies & Series';
    let description = 'Watch the latest movies, international series, and animated classics on FLKRD MOVIES. High-quality streaming with instant access.';
    let image = 'https://fkurd.pro/flkrd-icon.png';
    let canonicalUrl = `https://fkurd.pro/${type && id ? `details/${type}/${id}` : ''}`;
    let structuredData = null;

    if (type === 'dubbed') {
        canonicalUrl = `https://fkurd.pro/dubbed-details/${id}`;
    }

    try {
        if (id) {
            if (type === 'movie' && TMDB_API_KEY) {
                const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
                if (tmdbRes.ok) {
                    const data = await tmdbRes.json();
                    const year = data.release_date ? ` (${data.release_date.split('-')[0]})` : '';
                    title = `Watch ${data.title || data.original_title}${year} | FLKRD`;
                    description = data.overview ? data.overview.slice(0, 160) : description;
                    if (data.backdrop_path) {
                        image = `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`;
                    } else if (data.poster_path) {
                        image = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
                    }
                    
                    structuredData = {
                        "@context": "https://schema.org",
                        "@type": "Movie",
                        "name": data.title || data.original_title,
                        "description": data.overview || description,
                        "image": image,
                        "datePublished": data.release_date || null,
                        "genre": data.genres ? data.genres.map(g => g.name) : []
                    };
                }
            } else if (type === 'tv' && TMDB_API_KEY) {
                const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
                if (tmdbRes.ok) {
                    const data = await tmdbRes.json();
                    const year = data.first_air_date ? ` (${data.first_air_date.split('-')[0]})` : '';
                    title = `Watch ${data.name || data.original_name}${year} | FLKRD`;
                    description = data.overview ? data.overview.slice(0, 160) : description;
                    if (data.backdrop_path) {
                        image = `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`;
                    } else if (data.poster_path) {
                        image = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
                    }

                    structuredData = {
                        "@context": "https://schema.org",
                        "@type": "TVSeries",
                        "name": data.name || data.original_name,
                        "description": data.overview || description,
                        "image": image,
                        "datePublished": data.first_air_date || null
                    };
                }
            } else if (type === 'dubbed') {
                const cleanId = id.startsWith('custom_') ? id : `custom_${id}`;
                const { data: dubData, error } = await supabase
                    .from('dubbed_movies')
                    .select('*')
                    .eq('id', cleanId)
                    .single();

                if (dubData && !error) {
                    title = `${dubData.title} (فیلمی دۆبلاژکراوی کوردی) | FLKRD`;
                    description = dubData.description ? dubData.description.slice(0, 160) : description;
                    if (dubData.bannerBase64 || dubData.imageBase64 || dubData.poster_path) {
                        image = dubData.bannerBase64 || dubData.imageBase64 || dubData.poster_path;
                    }

                    structuredData = {
                        "@context": "https://schema.org",
                        "@type": "Movie",
                        "name": dubData.title,
                        "description": dubData.description || description,
                        "image": image,
                        "inLanguage": "Kurdish"
                    };
                }
            }
        }
    } catch (e) {
        console.error("[SEO] Metadata enrichment error:", e.message);
    }

    let html = await getTemplate(host);

    // Dynamic Tag Replacement Engine
    html = html
        .replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`)
        .replace(/<meta[^>]*name="description"[^>]*>/gi, `<meta name="description" content="${description}" />`)
        .replace(/<meta[^>]*property="og:title"[^>]*>/gi, `<meta property="og:title" content="${title}">`)
        .replace(/<meta[^>]*property="og:description"[^>]*>/gi, `<meta property="og:description" content="${description}">`)
        .replace(/<meta[^>]*property="og:image"[^>]*>/gi, `<meta property="og:image" content="${image}">`)
        .replace(/<meta[^>]*property="og:url"[^>]*>/gi, `<meta property="og:url" content="${canonicalUrl}">`);

    // Clean up duplicate header SEO tags if they were injected in index.html
    const canonicalTag = `<link rel="canonical" href="${canonicalUrl}" />`;
    if (!html.includes('rel="canonical"')) {
        html = html.replace("</head>", `${canonicalTag}\n</head>`);
    } else {
        html = html.replace(/<link rel="canonical" href=".*?"\s*\/?>/gi, canonicalTag);
    }

    // Inject Schema.org JSON-LD Structured Data
    if (structuredData) {
        const jsonLd = `\n<script type="application/ld+json">\n${JSON.stringify(structuredData, null, 2)}\n</script>\n`;
        html = html.replace("</head>", `${jsonLd}</head>`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // Cache SEO page for 24 hours on Edge CDN
    return res.status(200).send(html);
}
