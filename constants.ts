
// IMPORTANT: In a real-world application, the API_KEY should be stored in environment variables
import translations from './translations';

export const API_KEY = "39ad6c4210f7e4357f3b5762fcaeb1db";
export const OPENSUBTITLES_API_KEY = "4BixV2IOdGyewzC3a0Dvqq1MYbfZ3yFx";
export const SUBDL_API_KEY = "subdl_s-YmuDA2wsocYnVVHrGzkUkZIWthD4F0fszNqBRfvL8";

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   window.location.hostname.startsWith('192.168.') ||
   window.location.hostname.endsWith('.local'));

export const API_BASE_URL = isLocal ? "/api/tmdb" : "https://api.themoviedb.org/3";
export const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w1280";
export const IMAGE_BASE_URL_POSTER = "https://image.tmdb.org/t/p/w500";
export const IMAGE_BASE_URL_LOGO = "https://image.tmdb.org/t/p/w300";
export const APP_VERSION = "1.8.1";

export const requests = {
  fetchTrending: (lang: string) => `/trending/all/week?api_key=${API_KEY}&language=${lang}`,
  fetchTrendingMovies: (lang: string) => `/trending/movie/week?api_key=${API_KEY}&language=${lang}`,
  fetchTrendingMoviesDay: (lang: string) => `/trending/movie/day?api_key=${API_KEY}&language=${lang}&include_adult=false`,
  fetchTrendingTV: (lang: string) => `/trending/tv/week?api_key=${API_KEY}&language=${lang}`,
  fetchLatestMovies: (lang: string) => `/movie/now_playing?api_key=${API_KEY}&language=${lang}&include_adult=false`,
  fetchLatestActionMovies: (lang: string, page: number = 1) => `/discover/movie?api_key=${API_KEY}&with_genres=28&language=${lang}&sort_by=popularity.desc&include_adult=false&page=${page}`,
  fetchNetflixOriginals: (lang: string) => `/discover/tv?api_key=${API_KEY}&with_networks=213&language=${lang}&include_adult=false`,
  fetchTopRatedMovies: (lang: string) => `/movie/top_rated?api_key=${API_KEY}&language=${lang}&include_adult=false`,
  fetchTopRatedTV: (lang: string) => `/tv/top_rated?api_key=${API_KEY}&language=${lang}&include_adult=false`,
  fetchPopularTV: (lang: string) => `/tv/popular?api_key=${API_KEY}&language=${lang}&include_adult=false`,
  fetchActionMovies: (lang: string) => `/discover/movie?api_key=${API_KEY}&with_genres=28&language=${lang}&include_adult=false`,
  fetchComedyMovies: (lang: string) => `/discover/movie?api_key=${API_KEY}&with_genres=35&language=${lang}&include_adult=false`,
  fetchHorrorMovies: (lang: string) => `/discover/movie?api_key=${API_KEY}&with_genres=27&language=${lang}&include_adult=false`,
  fetchDocumentaries: (lang: string) => `/discover/movie?api_key=${API_KEY}&with_genres=99&language=${lang}&include_adult=false`,
  fetchByYear: (lang: string, year: number) => `/discover/movie?api_key=${API_KEY}&language=${lang}&primary_release_year=${year}&sort_by=popularity.desc&include_adult=false`,
};

export const GENRES_T: { id: number, nameKey: keyof typeof translations['en'] }[] = [
  { id: 28, nameKey: 'genreAction' },
  { id: 12, nameKey: 'genreAdventure' },
  { id: 16, nameKey: 'genreAnimation' },
  { id: 35, nameKey: 'genreComedy' },
  { id: 80, nameKey: 'genreCrime' },
  { id: 99, nameKey: 'genreDocumentary' },
  { id: 18, nameKey: 'genreDrama' },
  { id: 10751, nameKey: 'genreFamily' },
  { id: 14, nameKey: 'genreFantasy' },
  { id: 36, nameKey: 'genreHistory' },
  { id: 27, nameKey: 'genreHorror' },
  { id: 10402, nameKey: 'genreMusic' },
  { id: 9648, nameKey: 'genreMystery' },
  { id: 878, nameKey: 'genreSciFi' },
  { id: 53, nameKey: 'genreThriller' },
  { id: 10752, nameKey: 'genreWar' },
  { id: 37, nameKey: 'genreWestern' },
];

export const fetchByGenre = (id: number, lang: string) => `/discover/movie?api_key=${API_KEY}&with_genres=${id}&language=${lang}&include_adult=false`;
export const fetchByStudio = (id: string, lang: string, page: number = 1) => `/discover/movie?api_key=${API_KEY}&with_companies=${id}&language=${lang}&include_adult=false&page=${page}`;

export const STUDIOS = [
  { id: 420, name: 'Marvel Studios', color: '#ED1D24' },
  { id: 2, name: 'Walt Disney Pictures', color: '#113CCF' },
  { id: 33, name: 'Universal Pictures', color: '#3144A1' },
  { id: 174, name: 'Warner Bros. Pictures', color: '#005596' },
  { id: 4, name: 'Paramount', color: '#004A92' },
  { id: 5, name: 'Columbia Pictures', color: '#F8B61D' },
  { id: 7521, name: 'DreamWorks Animation', color: '#36C4F3' },
  { id: 3, name: 'Pixar', color: '#FFFFFF' },
  { id: 4315, name: 'Nickelodeon', color: '#FF6600' },
  { id: 1, name: 'Lucasfilm', color: '#000000' },
  { id: 7531, name: 'National Geographic', color: '#FFCC00' },
];

// FLKRD PROTECTION System: Stricter blocklists
export const FORBIDDEN_KEYWORDS_EN: string[] = [
  'porn', 'sex', 'erotic', 'lust', 'naked', 'sexy', 'nude', 'nudity',
  'explicit', 'sensual', 'sexual', 'hardcore', 'xxx', 'hentai', 'stripper',
  'ejaculation', 'orgasm', 'pornography', 'bdsm', 'gay porn', 'lesbian porn',
  'hot scene', 'bikini body', 'naked woman', 'naked man'
];

export const FORBIDDEN_KEYWORDS_KU: string[] = [
  'پۆرن', 'سێکس', 'ئیرۆتیک', 'ڕووت', 'سێکسی', 'ڕووتی',
  'بێ پەردە', 'کاری سێکسی', 'ڕووتکردنەوە', 'ئۆرگازم', 'پۆرنۆگرافی'
];

// Block specific IDs (EKS, Risqué, Kulong, Rita, and other extreme content)
export const FORBIDDEN_CONTENT_IDS: number[] = [
  1249764, // EKS
  1216223, // Risqué
  1184000, // Kulong
  1238968, // Rita
  574043,  // High School of the Dead
  1244301, 1214309, 1205315, 1184000, 1159844, 1145325, 1131758, 1121087, 1083862,
];

export const FORBIDDEN_GENRE_IDS: number[] = [10749]; // Blocks pure "Romance" genre


// Global Dubbed Movies Archive - Fully Migrated to Supabase Cloud
export const CUSTOM_DUBBED_ARCHIVE: any[] = [];
