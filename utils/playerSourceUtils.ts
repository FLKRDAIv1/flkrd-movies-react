
import { PlayerSource } from '../types';

export interface EnhancedPlayerSource extends PlayerSource {
  badge?: 'ku' | 'diamond' | 'crown' | 'bronze';
}

const LOCAL_STORAGE_KEY = 'playerSourceScores';

const INITIAL_SOURCES: Omit<PlayerSource, 'score'>[] = [
  { name: 'FLKRD SERVER' }, // Premium VidLink (Ad-Free)
  { name: 'FLKRD SERVER 1' }, // VidKing
  { name: 'FLKRD SERVER 2' }, // Vidsrc.to
  { name: 'FLKRD SERVER 5' },
  { name: 'FLKRD SERVER 6' },
  { name: 'FLKRD SERVER 7' },
  { name: 'FLKRD SERVER 8' },
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
    'FLKRD SERVER': 500, // Premium VidLink (Master)
    'FLKRD SERVER 1': 480, // SuperEmbed VIP (Diamond)
    'FLKRD SERVER 2': 460, // VidKing (Bronze)
    'FLKRD SERVER 5': 150,
    'FLKRD SERVER 6': 140,
    'FLKRD SERVER 7': 130,
    'FLKRD SERVER 8': 120,
  };
};

export const getRankedSources = (hasKurdishSub: boolean = false): EnhancedPlayerSource[] => {
  const scores = getScores();
  const sourcesWithScores: EnhancedPlayerSource[] = INITIAL_SOURCES.map(source => {
    let score = scores[source.name] ?? 0;
    let badge: EnhancedPlayerSource['badge'] = undefined;

    // Pinning Logic: If Kurdish sub is found, boost specific servers that handle it best
    if (hasKurdishSub) {
      if (source.name === 'FLKRD SERVER' || source.name === 'FLKRD SERVER 1') {
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
    case 'FLKRD SERVER': // Premium VidLink (Ad-Free / Beenama Style)
      const vlParams = `?primaryColor=${playerColor}&secondaryColor=5c4747&iconColor=eefdec&icons=vid&player=jw&title=true&poster=true&autoplay=true&nextbutton=true${progress > 10 ? `&startAt=${Math.floor(progress)}` : ''}${subtitleUrl ? `&sub_file=${encodeURIComponent(subtitleUrl)}&sub_label=Kurdish` : ''}`;
      return isTv
        ? `https://vidlink.pro/tv/${id}/${season}/${episode}${vlParams}`
        : `https://vidlink.pro/movie/${id}${vlParams}`;

    case 'FLKRD SERVER 1': // SuperEmbed Standard (Diamond Source - Reliable)
      const isImdb = id.startsWith('tt');
      const tmdbParam = isImdb ? '' : '&tmdb=1';
      const seUrl = isTv
        ? `https://multiembed.mov/?video_id=${id}${tmdbParam}&s=${season}&e=${episode}`
        : `https://multiembed.mov/?video_id=${id}${tmdbParam}`;
      return seUrl;

    case 'FLKRD SERVER 2': // VidKing (Bronze Source)
      const vkParams = `&color=${playerColor}&autoplay=1&playsinline=1&subtitles=1&sub=1&sub_file=${encodeURIComponent(subtitleUrl || '')}&sub_label=Kurdish${subParam}`;
      return isTv
        ? `https://www.vidking.net/embed/tv/${id}/${season}/${episode}?${vkParams}&nextEpisode=true&episodeSelector=true${progress > 10 ? `&start=${Math.floor(progress)}` : ''}`
        : `https://www.vidking.net/embed/movie/${id}?${vkParams}${progress > 10 ? `&start=${Math.floor(progress)}` : ''}`;
    
        
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
