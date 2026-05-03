
import { PlayerSource } from '../types';

const LOCAL_STORAGE_KEY = 'playerSourceScores';

const INITIAL_SOURCES: Omit<PlayerSource, 'score'>[] = [
  { name: 'FLKRD SERVER 1' }, // VidKing
  { name: 'FLKRD SERVER 2' }, // Vidsrc.to
  { name: 'FLKRD SERVER 3' }, // Embed.su
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
    'FLKRD SERVER 1': 300, // VidKing (Top Priority)
    'FLKRD SERVER 2': 280, // Vidsrc.to
    'FLKRD SERVER 3': 270, // Embed.su
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

export const getSourceUrl = (name: string, id: string, type: 'movie' | 'tv', season?: number, episode?: number, progress: number = 0, accentColor?: string, subtitleUrl?: string) => {
  const isTv = type === 'tv';
  const playerColor = accentColor?.replace('#', '') || 'e50914';
  const subParam = subtitleUrl ? `&sub=${encodeURIComponent(subtitleUrl)}&subtitle=${encodeURIComponent(subtitleUrl)}` : '';

  switch (name) {
    case 'FLKRD SERVER 1': // VidKing (Professional Source)
      const vkParams = `&color=${playerColor}&autoplay=1&playsinline=1&subtitles=1&sub=1${subParam}`;
      return isTv
        ? `https://www.vidking.net/embed/tv/${id}/${season}/${episode}?${vkParams}&nextEpisode=true&episodeSelector=true${progress > 10 ? `&start=${Math.floor(progress)}` : ''}`
        : `https://www.vidking.net/embed/movie/${id}?${vkParams}${progress > 10 ? `&start=${Math.floor(progress)}` : ''}`;
    
    case 'FLKRD SERVER 2': // Vidsrc.to
      return isTv
        ? `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`
        : `https://vidsrc.to/embed/movie/${id}`;
    
    case 'FLKRD SERVER 3': // Embed.su
      const esSub = subtitleUrl ? `&subtitles=${encodeURIComponent(subtitleUrl)}` : '';
      return isTv
        ? `https://embedsu.vip/embed/tv/${id}/${season}/${episode}${esSub ? `?${esSub.slice(1)}` : ''}`
        : `https://embedsu.vip/embed/movie/${id}${esSub ? `?${esSub.slice(1)}` : ''}`;
        
    case 'FLKRD SERVER 4':
      return isTv
        ? `https://player.autoembed.cc/embed/tv/${id}/${season}/${episode}`
        : `https://player.autoembed.cc/embed/movie/${id}`;
        
    case 'FLKRD SERVER 5':
      return isTv
        ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1`;
        
    case 'FLKRD SERVER 6':
      return isTv
        ? `https://vidsrc-embed.ru/embed/tv/${id}/${season}-${episode}`
        : `https://vidsrc-embed.ru/embed/movie/${id}`;
        
    case 'FLKRD SERVER 7':
      return isTv
        ? `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`
        : `https://www.2embed.cc/embed/${id}`;
        
    case 'FLKRD SERVER 8':
      return isTv
        ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`
        : `https://vidsrc.me/embed/movie?tmdb=${id}`;
        
    case 'FLKRD SERVER 9':
      return isTv
        ? `https://vidsrc.pro/embed/tv/${id}/${season}/${episode}`
        : `https://vidsrc.pro/embed/movie/${id}`;
        
    case 'FLKRD SERVER 10':
      return isTv
        ? `https://player.smashy.stream/tv/${id}?s=${season}&e=${episode}`
        : `https://player.smashy.stream/movie/${id}`;
        
    default:
      const defParams = `&color=${playerColor}&autoplay=1&playsinline=1&sub=1`;
      return isTv
        ? `https://www.vidking.net/embed/tv/${id}/${season}/${episode}?${defParams}${progress > 10 ? `&start=${Math.floor(progress)}` : ''}`
        : `https://www.vidking.net/embed/movie/${id}?${defParams}${progress > 10 ? `&start=${Math.floor(progress)}` : ''}`;
  }
};

export const getSourceSandboxConfig = (name: string): string | undefined => {
  // USER explicitly requested removing sandbox to avoid detection!
  return undefined; 
};
