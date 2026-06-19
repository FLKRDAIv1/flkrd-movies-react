export default async (request: Request, context: any) => {
  const url = new URL(request.url);
  const path = url.pathname;
  const host = request.headers.get("host") || "fkurd.pro";

  // Match routes:
  // Movie: /details/movie/:id
  // TV: /details/tv/:id
  // Dubbed: /dubbed-details/:id
  let type = "";
  let id = "";

  if (path.startsWith("/details/movie/")) {
    type = "movie";
    id = path.replace("/details/movie/", "");
  } else if (path.startsWith("/details/tv/")) {
    type = "tv";
    id = path.replace("/details/tv/", "");
  } else if (path.startsWith("/dubbed-details/")) {
    type = "dubbed";
    id = path.replace("/dubbed-details/", "");
  }

  // Get default response (the index.html bundle)
  const response = await context.next();
  
  if (!type || !id || response.status !== 200) {
    return response;
  }

  let html = await response.text();

  let title = 'FLKRD MOVIES | Stream Movies & Series';
  let description = 'Watch the latest movies, international series, and animated classics on FLKRD MOVIES. High-quality streaming with instant access.';
  let image = 'https://fkurd.pro/flkrd-icon.png';
  let canonicalUrl = `https://fkurd.pro${path}`;
  let structuredData: any = null;

  const TMDB_API_KEY = Deno.env.get("VITE_TMDB_API_KEY") || Deno.env.get("TMDB_API_KEY");
  const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || "https://fmahzalaxbkmhbpcally.supabase.co";
  const supabaseKey = Deno.env.get("VITE_SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  try {
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
          "genre": data.genres ? data.genres.map((g: any) => g.name) : []
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
    } else if (type === 'dubbed' && supabaseUrl && supabaseKey) {
      const cleanId = id.startsWith('custom_') ? id : `custom_${id}`;
      const supabaseEndpoint = `${supabaseUrl}/rest/v1/dubbed_movies?id=eq.${cleanId}&select=*`;
      const res = await fetch(supabaseEndpoint, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data[0]) {
          const dubData = data[0];
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
  } catch (e: any) {
    console.error("[SEO EDGE] Enrichment error:", e.message);
  }

  // Dynamic Tag Replacement Engine
  html = html
    .replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`)
    .replace(/<meta[^>]*name="description"[^>]*>/gi, `<meta name="description" content="${description}" />`)
    .replace(/<meta[^>]*property="og:title"[^>]*>/gi, `<meta property="og:title" content="${title}">`)
    .replace(/<meta[^>]*property="og:description"[^>]*>/gi, `<meta property="og:description" content="${description}">`)
    .replace(/<meta[^>]*property="og:image"[^>]*>/gi, `<meta property="og:image" content="${image}">`)
    .replace(/<meta[^>]*property="og:url"[^>]*>/gi, `<meta property="og:url" content="${canonicalUrl}">`);

  // Canonical tag check and inject
  const canonicalTag = `<link rel="canonical" href="${canonicalUrl}" />`;
  if (!html.includes('rel="canonical"')) {
    html = html.replace("</head>", `${canonicalTag}\n</head>`);
  } else {
    html = html.replace(/<link rel="canonical" href=".*?"\s*\/?>/gi, canonicalTag);
  }

  // Inject Schema.org Structured Data
  if (structuredData) {
    const jsonLd = `\n<script type="application/ld+json">\n${JSON.stringify(structuredData, null, 2)}\n</script>\n`;
    html = html.replace("</head>", `${jsonLd}</head>`);
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "public, max-age=86400, s-maxage=86400"
    },
  });
};
