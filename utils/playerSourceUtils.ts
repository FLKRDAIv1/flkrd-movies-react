
import { PlayerSource } from '../types';

const LOCAL_STORAGE_KEY = 'playerSourceScores';

const INITIAL_SOURCES: Omit<PlayerSource, 'score'>[] = [
  { name: 'FLKRD SERVER 1' },
  { name: 'FLKRD SERVER 2' },
  { name: 'FLKRD SERVER 3' },
  { name: 'FLKRD SERVER 4' },
  { name: 'FLKRD SERVER 5' },
  { name: 'FLKRD SERVER 6' },
  { name: 'FLKRD SERVER 7' },
  { name: 'FLKRD SERVER 8' },
  { name: 'FLKRD SERVER 9' },
  { name: 'FLKRD SERVER 10' },
];

const getScores = (): { [key: string]: number } => {
  try {
    const storedScores = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedScores) {
      return JSON.parse(storedScores);
    }
  } catch (error) {
    console.error("Failed to parse player source scores", error);
  }
  return {
    'FLKRD SERVER 1': 200,
    'FLKRD SERVER 2': 180,
    'FLKRD SERVER 3': 170,
    'FLKRD SERVER 4': 160,
    'FLKRD SERVER 5': 150,
    'FLKRD SERVER 6': 140,
    'FLKRD SERVER 7': 130,
    'FLKRD SERVER 8': 120,
    'FLKRD SERVER 9': 110,
    'FLKRD SERVER 10': 100,
  };
};

export const getRankedSources = (): PlayerSource[] => {
  const scores = getScores();
  const sourcesWithScores: PlayerSource[] = INITIAL_SOURCES.map(source => ({
    ...source,
    score: scores[source.name] ?? 0,
  }));
  return sourcesWithScores.sort((a, b) => b.score - a.score);
};

export const getSourceUrl = (name: string, id: string, type: 'movie' | 'tv', season?: number, episode?: number, progress: number = 0) => {
  const isTv = type === 'tv';
  // Use 'start' or 'progress' based on Vidking's resume capabilities
  const progressParam = progress > 10 ? `&start=${Math.floor(progress)}` : '';

  switch (name) {
    case 'FLKRD SERVER 1':
      return isTv
        ? `https://vidking.net/embed/tv/${id}/${season}/${episode}?color=e50914&nextEpisode=true&episodeSelector=true${progressParam}`
        : `https://vidking.net/embed/movie/${id}?color=e50914${progressParam}`;
    case 'FLKRD SERVER 2':
      return isTv
        ? `https://player.autoembed.cc/embed/tv/${id}/${season}/${episode}`
        : `https://player.autoembed.cc/embed/movie/${id}`;
    case 'FLKRD SERVER 3':
      return isTv
        ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1`;
    case 'FLKRD SERVER 4':
      return isTv
        ? `https://vidsrc-embed.ru/embed/tv/${id}/${season}-${episode}`
        : `https://vidsrc-embed.ru/embed/movie/${id}`;
    case 'FLKRD SERVER 5':
      return isTv
        ? `https://embed.su/embed/tv/${id}/${season}/${episode}`
        : `https://embed.su/embed/movie/${id}`;
    case 'FLKRD SERVER 6':
      return isTv
        ? `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`
        : `https://www.2embed.cc/embed/${id}`;
    case 'FLKRD SERVER 7':
      return isTv
        ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`
        : `https://vidsrc.me/embed/movie?tmdb=${id}`;
    case 'FLKRD SERVER 8':
      return isTv
        ? `https://vidsrc.pro/embed/tv/${id}/${season}/${episode}`
        : `https://vidsrc.pro/embed/movie/${id}`;
    case 'FLKRD SERVER 9':
      return isTv
        ? `https://multiembed.mov/direct/superembed/tv?tmdb=${id}&s=${season}&e=${episode}`
        : `https://multiembed.mov/direct/superembed/movie?tmdb=${id}`;
    case 'FLKRD SERVER 10':
      return isTv
        ? `https://player.smashy.stream/tv/${id}?s=${season}&e=${episode}`
        : `https://player.smashy.stream/movie/${id}`;
    default:
      return isTv
        ? `https://vidking.net/embed/tv/${id}/${season}/${episode}?color=e50914${progressParam}`
        : `https://vidking.net/embed/movie/${id}?color=e50914${progressParam}`;
  }
};

export const getSourceSandboxConfig = (name: string): string | undefined => {
  // VidKing (SERVER 1) is the only one that tolerates being jaied to block popups/redirects!
  // All other servers (vidsrc, superembed, 2embed, etc.) throw "Sandbox not allowed" if forced into an iframe sandbox.
  if (name === 'FLKRD SERVER 1') {
    return "allow-scripts allow-same-origin allow-forms allow-presentation";
  }

  return undefined; // No sandbox allowed for all other sources
};
