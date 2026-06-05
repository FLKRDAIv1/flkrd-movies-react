
import { PlayerSource } from '../types';

export interface EnhancedPlayerSource extends PlayerSource {
  badge?: 'ku' | 'diamond' | 'crown' | 'bronze';
}

const LOCAL_STORAGE_KEY = 'playerSourceScores';

const INITIAL_SOURCES: Omit<PlayerSource, 'score'>[] = [
  { name: 'FLKRD SERVER' }, // VidKing (TOP 1)
  { name: 'FLKRD SERVER 1' }, // VidEasy (TOP 2)
  { name: 'FLKRD SERVER 2' }, // VidLink Pro (TOP 3)
  { name: 'FLKRD SERVER 3' }, // VidSrc (TOP 4)
  { name: 'FLKRD SERVER 4' }, // SuperEmbed (TOP 5)
  { name: 'FLKRD SERVER 5' }, // CinePro (TOP 6)
  { name: 'FLKRD SERVER 6' }, // VidSrc.pro
  { name: 'FLKRD SERVER 7' }, // VidSrc-embed.ru
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
    'FLKRD SERVER': 500, // VidKing
    'FLKRD SERVER 1': 480, // VidEasy
    'FLKRD SERVER 2': 460, // VidLink Pro
    'FLKRD SERVER 3': 440, // VidSrc
    'FLKRD SERVER 4': 420, // SuperEmbed
    'FLKRD SERVER 5': 400, // CinePro
    'FLKRD SERVER 6': 150,
    'FLKRD SERVER 7': 140,
  };
};

export const getRankedSources = (hasKurdishSub: boolean = false): EnhancedPlayerSource[] => {
  const scores = getScores();
  const sourcesWithScores: EnhancedPlayerSource[] = INITIAL_SOURCES.map(source => {
    let score = scores[source.name] ?? 0;
    let badge: EnhancedPlayerSource['badge'] = undefined;

    // Pinning Logic: If Kurdish sub is found, boost specific servers that handle it best
    if (hasKurdishSub) {
      if (
        source.name === 'FLKRD SERVER' || 
        source.name === 'FLKRD SERVER 1' || 
        source.name === 'FLKRD SERVER 2' || 
        source.name === 'FLKRD SERVER 5'
      ) {
        score += 1000; // Force to top
        badge = 'ku';
      }
    }

    return {
      ...source,
      score,
      badge
    };
  });
  return sourcesWithScores.sort((a, b) => b.score - a.score);
};

export const getSourceUrl = (name: string, id: string, type: 'movie' | 'tv', season?: number, episode?: number, progress: number = 0, accentColor?: string, subtitleUrl?: string) => {
  const isTv = type === 'tv';
  const playerColor = accentColor?.replace('#', '') || 'e50914';
  const subParam = subtitleUrl ? `&sub=${encodeURIComponent(subtitleUrl)}&subtitle=${encodeURIComponent(subtitleUrl)}` : '';

  switch (name) {
    case 'FLKRD SERVER': // VidKing (TOP 1)
      const vkParams = `&color=${playerColor}&autoplay=1&playsinline=1&subtitles=1&sub=1&sub_file=${encodeURIComponent(subtitleUrl || '')}&sub_label=Kurdish${subParam}`;
      return isTv
        ? `https://www.vidking.net/embed/tv/${id}/${season}/${episode}?${vkParams}&nextEpisode=true&episodeSelector=true${progress > 10 ? `&start=${Math.floor(progress)}` : ''}`
        : `https://www.vidking.net/embed/movie/${id}?${vkParams}${progress > 10 ? `&start=${Math.floor(progress)}` : ''}`;

    case 'FLKRD SERVER 1': { // Videasy (TOP 2) — uses built-in subtitle upload UI
      const veParams = `?color=${playerColor}&overlay=true&playsinline=1${progress > 10 ? `&progress=${Math.floor(progress)}` : ''}`;
      return isTv
        ? `https://player.videasy.net/tv/${id}/${season}/${episode}${veParams}&nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true`
        : `https://player.videasy.net/movie/${id}${veParams}`;
    }



    case 'FLKRD SERVER 2': // VidLink Pro (TOP 3)
      const vlParams = `?primaryColor=${playerColor}&secondaryColor=a2a2a2&iconColor=eefdec&playerIcon=default&title=true&poster=true&autoplay=false&nextbutton=true${progress > 10 ? `&startTime=${Math.floor(progress)}` : ''}${subtitleUrl ? `&subtitles=${encodeURIComponent(subtitleUrl)}&subLabel=Kurdish` : ''}`;
      return isTv
        ? `https://vidlink.pro/tv/${id}/${season}/${episode}${vlParams}`
        : `https://vidlink.pro/movie/${id}${vlParams}`;

    case 'FLKRD SERVER 3': // VidSrc (TOP 4)
      return isTv
        ? `https://vidsrcme.ru/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`
        : `https://vidsrcme.ru/embed/movie?tmdb=${id}`;

    case 'FLKRD SERVER 4': // SuperEmbed (TOP 5)
      const isImdb = id.startsWith('tt');
      const tmdbParam = isImdb ? '' : '&tmdb=1';
      return isTv
        ? `https://multiembed.mov/?video_id=${id}${tmdbParam}&s=${season}&e=${episode}`
        : `https://multiembed.mov/?video_id=${id}${tmdbParam}`;

    case 'FLKRD SERVER 5': // CinePro (TOP 6)
      const cpSubParams = subtitleUrl 
        ? `&sub=${encodeURIComponent(subtitleUrl)}&subtitle=${encodeURIComponent(subtitleUrl)}&subtitles=${encodeURIComponent(subtitleUrl)}&sub_file=${encodeURIComponent(subtitleUrl)}&subtitleUrl=${encodeURIComponent(subtitleUrl)}&sub_label=Kurdish&subLabel=Kurdish` 
        : '';
      const cpBaseParams = `color=${playerColor}&autoplay=1&playsinline=1${cpSubParams}`;
      
      let cpBaseUrl = 'http://localhost:3001';
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('cinepro_base_url');
        if (stored) {
          cpBaseUrl = stored;
        } else {
          const currentPort = window.location.port;
          const currentHostname = window.location.hostname;
          if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
            if (currentPort === '3000') {
              cpBaseUrl = 'http://localhost:3001';
            } else if (currentPort === '3001') {
              cpBaseUrl = 'http://localhost:3000';
            } else if (currentPort === '5173') {
              cpBaseUrl = 'http://localhost:3000';
            }
          }
        }
      }

      return isTv
        ? `${cpBaseUrl}/tv/${id}/${season}/${episode}?${cpBaseParams}`
        : `${cpBaseUrl}/movie/${id}?${cpBaseParams}`;

    case 'FLKRD SERVER 6': // VidSrc.pro (TOP 7)
      return isTv
        ? `https://vidsrc.pro/embed/tv/${id}/${season}/${episode}`
        : `https://vidsrc.pro/embed/movie/${id}`;

    case 'FLKRD SERVER 7': // VidSrc-embed.ru (TOP 8)
      return isTv
        ? `https://vidsrc-embed.ru/embed/tv/${id}/${season}-${episode}`
        : `https://vidsrc-embed.ru/embed/movie/${id}`;

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
