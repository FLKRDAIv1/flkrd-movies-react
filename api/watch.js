import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fmahzalaxbkmhbpcally.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYWh6YWxheGJrbWhicGNhbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjQ0NDYsImV4cCI6MjA5MzM0MDQ0Nn0.d4y612cjG6bSHL6vNK1YdxFmKjCJ6YpDIV7oG9XFis4';
const TMDB_API_KEY = '39ad6c4210f7e4357f3b5762fcaeb1db';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    const { ticket_id } = req.query;

    if (!ticket_id) {
        return res.status(400).send('ticket_id is required');
    }

    try {
        // 1. Fetch ticket from Supabase
        const { data: ticket, error: dbError } = await supabase
            .from('watch_tickets')
            .select('*')
            .eq('id', ticket_id)
            .single();

        if (dbError || !ticket) {
            return res.status(200).send(`<!DOCTYPE html>
<html>
<head>
    <script>
        window.location.href = "/#/watch/${ticket_id}";
    </script>
</head>
<body style="background: #000; color: #fff;">
</body>
</html>`);
        }

        // 2. Fetch movie/show details
        const rawMovieId = String(ticket.movie_id);
        const pinCode = ticket.pin_code;
        let title = 'FLKRD Co-Watch Cinema';
        let description = `🔑 Entry PIN: ${pinCode} | Join us to watch together!`;
        let image = 'https://fkurd.vercel.app/flkrd-icon.png';

        if (rawMovieId.startsWith('tv_')) {
            const cleanId = rawMovieId.replace('tv_', '');
            try {
                const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${cleanId}?api_key=${TMDB_API_KEY}&language=en-US`);
                if (tmdbRes.ok) {
                    const data = await tmdbRes.json();
                    const year = data.first_air_date ? data.first_air_date.split('-')[0] : '';
                    title = `🎬 وەرە پێکەوە سەیری "${data.name || data.original_name}" بکەین!`;
                    description = `🔑 کۆدی چوونەژوورەوە: ${pinCode} | هۆڵی سینەمای هاوبەشی FLKRD ${year ? `(${year})` : ''}`;
                    if (data.backdrop_path) {
                        image = `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`;
                    } else if (data.poster_path) {
                        image = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
                    }
                }
            } catch (e) {}
        } else if (rawMovieId.startsWith('custom_')) {
            const cleanId = rawMovieId.replace('custom_', '');
            try {
                const { data: dubData } = await supabase
                    .from('dubbed_movies')
                    .select('*')
                    .eq('id', cleanId)
                    .single();
                if (dubData) {
                    const year = dubData.created_at ? new Date(dubData.created_at).getFullYear() : '';
                    title = `🎬 وەرە پێکەوە سەیری "${dubData.kurdishTitle || dubData.title || 'Dubbed Movie'}" بکەین!`;
                    description = `🔑 کۆدی چوونەژوورەوە: ${pinCode} | هۆڵی سینەمای هاوبەشی FLKRD ${year ? `(${year})` : ''}`;
                    if (dubData.bannerBase64 || dubData.imageBase64 || dubData.poster_path) {
                        image = dubData.bannerBase64 || dubData.imageBase64 || dubData.poster_path;
                    }
                }
            } catch (e) {}
        } else {
            try {
                const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${rawMovieId}?api_key=${TMDB_API_KEY}&language=en-US`);
                if (tmdbRes.ok) {
                    const data = await tmdbRes.json();
                    const year = data.release_date ? data.release_date.split('-')[0] : '';
                    title = `🎬 وەرە پێکەوە سەیری "${data.title || data.original_title}" بکەین!`;
                    description = `🔑 کۆدی چوونەژوورەوە: ${pinCode} | هۆڵی سینەمای هاوبەشی FLKRD ${year ? `(${year})` : ''}`;
                    if (data.backdrop_path) {
                        image = `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`;
                    } else if (data.poster_path) {
                        image = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
                    }
                }
            } catch (e) {}
        }

        // Point social media open graph previews to the dynamic Watch Party Ticket image generator
        image = `https://fkurd.vercel.app/api/watch-image?ticket_id=${ticket_id}`;

        // Return a beautiful HTML page with rich open graph properties and immediate client redirect
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`<!DOCTYPE html>
<html lang="ku">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <!-- Open Graph Meta Tags for beautiful rich social shares -->
    <meta property="og:type" content="video.movie">
    <meta property="og:url" content="https://fkurd.vercel.app/watch/${ticket_id}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:site_name" content="FLKRD CINEMA">

    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">

    <!-- Immediate Client-Side Navigation -->
    <script>
        window.location.href = "/#/watch/${ticket_id}";
    </script>
</head>
<body style="background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
    <div>
        <h1 style="color: #e50914; font-size: 2rem; margin-bottom: 10px; font-weight: 900;">FLKRD CINEMA</h1>
        <p style="color: #888; font-size: 1rem;">Redirecting to screening room...</p>
    </div>
</body>
</html>`);

    } catch (error) {
        console.error("Vercel Ticket Social Share Preview Error:", error);
        // Fail-safe redirect
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`<!DOCTYPE html>
<html>
<head>
    <script>
        window.location.href = "/#/watch/${ticket_id}";
    </script>
</head>
<body style="background: #000; color: #fff;">
</body>
</html>`);
    }
}
