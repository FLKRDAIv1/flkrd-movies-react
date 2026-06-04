import fs from 'fs';
import path from 'path';

const API_KEY = "39ad6c4210f7e4357f3b5762fcaeb1db";
const BASE_URL = "https://api.themoviedb.org/3";
const SITEMAP_PATH = path.resolve('public/sitemap.xml');

// Helper to wait to prevent rate limit triggers on TMDB (though they removed the 40reqs/10s limit, good practice)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchFromTMDB(endpoint, pages = 1) {
  const ids = [];
  for (let page = 1; page <= pages; page++) {
    try {
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}&page=${page}&include_adult=false`;
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[SITEMAP GENERATOR] TMDB returned non-OK code for ${endpoint} page ${page}:`, response.status);
        continue;
      }
      const data = await response.json();
      if (data && data.results) {
        data.results.forEach((item) => {
          if (item && item.id) {
            ids.push(item.id);
          }
        });
      }
      await sleep(100); // 100ms throttle
    } catch (e) {
      console.error(`[SITEMAP GENERATOR] Failed to fetch TMDB endpoint ${endpoint} page ${page}:`, e);
    }
  }
  return ids;
}

function parseKurdishCCRegistry() {
  const registryPath = path.resolve('services/kurdishMovieRegistry.ts');
  if (!fs.existsSync(registryPath)) {
    console.warn("[SITEMAP GENERATOR] Kurdish CC Registry not found at services/kurdishMovieRegistry.ts");
    return [];
  }
  
  const content = fs.readFileSync(registryPath, 'utf-8');
  const entries = [];
  const regex = /\{\s*tmdb_id:\s*(\d+),\s*type:\s*['"](movie|tv)['"]\s*\}/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    entries.push({
      id: parseInt(match[1], 10),
      type: match[2]
    });
  }
  
  console.log(`[SITEMAP GENERATOR] Extracted ${entries.length} entries from Kurdish CC Registry.`);
  return entries;
}

async function run() {
  console.log("[SITEMAP GENERATOR] Starting dynamic sitemap compilation...");
  
  const movies = new Set();
  const tvSeries = new Set();
  
  // 1. Extract Kurdish CC Registry entries first
  const ccEntries = parseKurdishCCRegistry();
  ccEntries.forEach((entry) => {
    if (entry.type === 'movie') {
      movies.add(entry.id);
    } else if (entry.type === 'tv') {
      tvSeries.add(entry.id);
    }
  });

  // 2. Fetch Popular Movies & TV Shows (5 pages each = 100 items)
  console.log("[SITEMAP GENERATOR] Fetching popular movies and series...");
  const popMovies = await fetchFromTMDB('/movie/popular', 5);
  const popTV = await fetchFromTMDB('/tv/popular', 5);
  popMovies.forEach(id => movies.add(id));
  popTV.forEach(id => tvSeries.add(id));

  // 3. Fetch Top Rated Movies & TV Shows (5 pages each = 100 items)
  console.log("[SITEMAP GENERATOR] Fetching top rated movies and series...");
  const topMovies = await fetchFromTMDB('/movie/top_rated', 5);
  const topTV = await fetchFromTMDB('/tv/top_rated', 5);
  topMovies.forEach(id => movies.add(id));
  topTV.forEach(id => tvSeries.add(id));

  // 4. Fetch Trending Movies & TV Shows (3 pages each = 60 items)
  console.log("[SITEMAP GENERATOR] Fetching weekly trending items...");
  const trendMovies = await fetchFromTMDB('/trending/movie/week', 3);
  const trendTV = await fetchFromTMDB('/trending/tv/week', 3);
  trendMovies.forEach(id => movies.add(id));
  trendTV.forEach(id => tvSeries.add(id));

  console.log(`[SITEMAP GENERATOR] Compiled unique items list: ${movies.size} movies, ${tvSeries.size} series.`);

  const today = new Date().toISOString().split('T')[0];

  // 5. Generate XML Structure
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Core Static Landing Pages -->
  <url>
    <loc>https://fkurd.pro/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://fkurd.pro/#/tv</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://fkurd.pro/#/dubbed</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://fkurd.pro/#/kurdish-cc</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://fkurd.pro/#/search</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://fkurd.pro/#/discover</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Curated & Popular Movies -->`;

  movies.forEach((id) => {
    xml += `
  <url>
    <loc>https://fkurd.pro/#/details/movie/${id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  xml += `

  <!-- Curated & Popular TV Series -->`;

  tvSeries.forEach((id) => {
    xml += `
  <url>
    <loc>https://fkurd.pro/#/details/tv/${id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  xml += `
</urlset>
`;

  // Make sure directories exist
  const dir = path.dirname(SITEMAP_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf-8');
  console.log(`[SITEMAP GENERATOR] Successfully created dynamic sitemap at: ${SITEMAP_PATH} with ${movies.size + tvSeries.size + 6} URLs.`);
}

run().catch(err => {
  console.error("[SITEMAP GENERATOR] Critical execution failure:", err);
});
