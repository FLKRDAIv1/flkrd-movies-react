
import { PlayerSource } from '../types';

export interface EnhancedPlayerSource extends PlayerSource {
  badge?: 'ku' | 'diamond' | 'crown' | 'bronze';
  displayName: string;
  description: string;
  kurdishName?: string;
  kurdishDesc?: string;
  url?: string;
}

const LOCAL_STORAGE_KEY = 'playerSourceScores';

/** Real display names and Kurdish Sorani translations for each FLKRD SERVER slot */
export const SOURCE_META: Record<string, { 
  displayName: string; 
  description: string;
  kurdishName: string;
  kurdishDesc: string;
}> = {
  'FLKRD SERVER': { 
    displayName: '111Movies Ultra', 
    description: 'Direct Clean 4K BluRay / WEB-DL',
    kurdishName: '١١١ موڤیز (111Movies Ultra)',
    kurdishDesc: 'کوالێتی 4K پاک و بێ پچڕان'
  },
  'FLKRD SERVER 1': { 
    displayName: 'VidLove 4K Pro', 
    description: 'NextGen 4K Player · Custom Theme & Download',
    kurdishName: 'ڤید لۆڤ پرۆ (VidLove 4K Pro)',
    kurdishDesc: 'پەخشی 4K و سفڕ ڕیکلام · خێرایی بەرز'
  },
  'FLKRD SERVER 2': { 
    displayName: 'VidLink Pro 4K', 
    description: 'Ultra-Fast 4K HDR Player · Instant Load',
    kurdishName: 'ڤید لینک پرۆ (VidLink Pro 4K)',
    kurdishDesc: 'خێراترین پەخشی 4K بەبێ چاوەڕوانی'
  },
  'FLKRD SERVER 3': { 
    displayName: 'Videasy HD', 
    description: 'Smart Adaptive Multi-Bitrate · HD 1080p',
    kurdishName: 'ڤید ئیزی (Videasy HD)',
    kurdishDesc: 'پەخشی زیرەک و ڕێکخراو · HD 1080p'
  },
  'FLKRD SERVER 4': { 
    displayName: 'VidKing 4K', 
    description: 'Universal Direct Streaming · 4K UHD',
    kurdishName: 'ڤید کینگ (VidKing 4K)',
    kurdishDesc: 'خێرایی زۆر بەرز و کوالێتی 4K UHD'
  },
  'FLKRD SERVER 5': { 
    displayName: 'AutoEmbed VIP', 
    description: 'Ultra-Fast Multi-Cloud Failover',
    kurdishName: 'ئۆتۆ ئیمبێد (AutoEmbed VIP)',
    kurdishDesc: 'سێرڤەری فرە-هەور بەبێ پچڕان'
  },
  'FLKRD SERVER 6': { 
    displayName: 'VidSrc VIP', 
    description: 'Deep Global Archive · HD 1080p',
    kurdishName: 'ڤید سۆرس ڤی ئای پی (VidSrc VIP)',
    kurdishDesc: 'ئەرشیفی گەورەی فیلم و زنجیرەکان'
  },
  'FLKRD SERVER 7': { 
    displayName: 'SuperEmbed', 
    description: 'Multi-Source Mirror Backup Stream',
    kurdishName: 'سوپەر ئیمبێد (SuperEmbed)',
    kurdishDesc: 'سێرڤەری فرە-سەرچاوەی یەدەگ'
  },
};

const INITIAL_SOURCES: Omit<PlayerSource, 'score'>[] = [
  { name: 'FLKRD SERVER' },
  { name: 'FLKRD SERVER 1' },
  { name: 'FLKRD SERVER 2' },
  { name: 'FLKRD SERVER 3' },
  { name: 'FLKRD SERVER 4' },
  { name: 'FLKRD SERVER 5' },
  { name: 'FLKRD SERVER 6' },
  { name: 'FLKRD SERVER 7' },
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
    'FLKRD SERVER':   700,
    'FLKRD SERVER 1': 670,
    'FLKRD SERVER 2': 640,
    'FLKRD SERVER 3': 600,
    'FLKRD SERVER 4': 560,
    'FLKRD SERVER 5': 520,
    'FLKRD SERVER 6': 480,
    'FLKRD SERVER 7': 440,
  };
};

export const getRankedSources = (hasKurdishSub: boolean = false): EnhancedPlayerSource[] => {
  const scores = getScores();
  const sourcesWithScores: EnhancedPlayerSource[] = INITIAL_SOURCES.map(source => {
    let score = scores[source.name] ?? 0;
    let badge: EnhancedPlayerSource['badge'] = undefined;
    const meta = SOURCE_META[source.name] ?? { 
      displayName: source.name, 
      description: '', 
      kurdishName: source.name, 
      kurdishDesc: '' 
    };

    if (hasKurdishSub) {
      if (
        source.name === 'FLKRD SERVER' ||
        source.name === 'FLKRD SERVER 1' ||
        source.name === 'FLKRD SERVER 2' ||
        source.name === 'FLKRD SERVER 3'
      ) {
        score += 1000;
        badge = 'ku';
      }
    }

    return {
      ...source,
      score,
      badge,
      displayName: meta.displayName,
      description: meta.description,
      kurdishName: meta.kurdishName,
      kurdishDesc: meta.kurdishDesc,
    };
  });
  return sourcesWithScores.sort((a, b) => b.score - a.score);
};

export const getSourceDisplayName = (name: string, isKurdish: boolean = false): string => {
  const meta = SOURCE_META[name];
  if (!meta) return name;
  return isKurdish ? meta.kurdishName : meta.displayName;
};

export const getSourceDescription = (name: string, isKurdish: boolean = false): string => {
  const meta = SOURCE_META[name];
  if (!meta) return '';
  return isKurdish ? meta.kurdishDesc : meta.description;
};

export const getSourceUrl = (
  name: string,
  id: string,
  type: 'movie' | 'tv' | 'anime',
  season?: number,
  episode?: number,
  progress: number = 0,
  accentColor?: string,
  subtitleUrl?: string
) => {
  const isTv = type === 'tv';
  const isAnime = type === 'anime';
  const playerColor = accentColor?.replace('#', '') || 'e50914';
  
  // Strictly sanitize subtitleUrl: only allow public http/https URLs (never local blob: or data: URIs)
  const isCleanHttpSub = subtitleUrl && 
    (subtitleUrl.startsWith('http://') || subtitleUrl.startsWith('https://')) && 
    !subtitleUrl.startsWith('blob:') && 
    !subtitleUrl.startsWith('data:');
  const cleanSubUrl = isCleanHttpSub ? subtitleUrl : '';
  const subParam = cleanSubUrl ? `&sub=${encodeURIComponent(cleanSubUrl)}&subtitle=${encodeURIComponent(cleanSubUrl)}` : '';
  const s = season || 1;
  const e = episode || 1;

  switch (name) {
    case 'FLKRD SERVER': { // 1. 111Movies Ultra 4K / VidLove Direct
      return isTv
        ? `https://player.vidlove.cc/embed/tv/${id}/${s}/${e}?autoplay=false&nextbutton=true`
        : `https://player.vidlove.cc/embed/movie/${id}?autoplay=false`;
    }

    case 'FLKRD SERVER 1': { // 2. VidLove 4K Pro (player.vidlove.cc)
      const vlParams = `?autoplay=true&nextbutton=true&download=true&primarycolor=${playerColor}&secondarycolor=c49de8`;
      return isTv
        ? `https://player.vidlove.cc/embed/tv/${id}/${s}/${e}${vlParams}`
        : `https://player.vidlove.cc/embed/movie/${id}${vlParams}`;
    }

    case 'FLKRD SERVER 2': { // 3. VidLink Pro 4K
      const vlParams = `?primaryColor=${playerColor}&secondaryColor=a2a2a2&iconColor=eefdec&playerIcon=default&title=true&poster=true&autoplay=false&nextbutton=true${progress > 10 ? `&startTime=${Math.floor(progress)}` : ''}${cleanSubUrl ? `&subtitles=${encodeURIComponent(cleanSubUrl)}&subLabel=Kurdish` : ''}`;
      return isTv
        ? `https://vidlink.pro/tv/${id}/${s}/${e}${vlParams}`
        : `https://vidlink.pro/movie/${id}${vlParams}`;
    }

    case 'FLKRD SERVER 3': { // 4. Videasy HD
      const veParams = `?color=${playerColor}&overlay=true${progress > 5 ? `&progress=${Math.floor(progress)}` : ''}`;
      if (isAnime) {
        return e
          ? `https://player.videasy.to/anime/${id}/${e}${veParams}&nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true`
          : `https://player.videasy.to/anime/${id}${veParams}`;
      }
      return isTv
        ? `https://player.videasy.to/tv/${id}/${s}/${e}${veParams}&nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true`
        : `https://player.videasy.to/movie/${id}${veParams}`;
    }

    case 'FLKRD SERVER 4': { // 5. VidKing 4K
      const vkParams = `&color=${playerColor}&autoplay=1&playsinline=1&subtitles=1&sub=1${cleanSubUrl ? `&sub_file=${encodeURIComponent(cleanSubUrl)}&sub_label=Kurdish${subParam}` : ''}`;
      return isTv
        ? `https://www.vidking.net/embed/tv/${id}/${s}/${e}?${vkParams}&nextEpisode=true&episodeSelector=true${progress > 10 ? `&start=${Math.floor(progress)}` : ''}`
        : `https://www.vidking.net/embed/movie/${id}?${vkParams}${progress > 10 ? `&start=${Math.floor(progress)}` : ''}`;
    }

    case 'FLKRD SERVER 5': { // 6. AutoEmbed VIP
      return isTv
        ? `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`
        : `https://autoembed.co/movie/tmdb/${id}`;
    }

    case 'FLKRD SERVER 6': { // 7. VidSrc VIP
      const vsParams = cleanSubUrl ? `&sub=${encodeURIComponent(cleanSubUrl)}&subtitle=${encodeURIComponent(cleanSubUrl)}&sub.ku=${encodeURIComponent(cleanSubUrl)}` : '';
      return isTv
        ? `https://vidsrc.pm/embed/tv/${id}/${s}/${e}${vsParams}`
        : `https://vidsrc.pm/embed/movie/${id}${vsParams}`;
    }

    case 'FLKRD SERVER 7': { // 8. SuperEmbed Multi-Mirror
      const isImdb = id.startsWith('tt');
      const tmdbParam = isImdb ? '' : '&tmdb=1';
      const seParams = cleanSubUrl ? `&subtitle=${encodeURIComponent(cleanSubUrl)}&sub=${encodeURIComponent(cleanSubUrl)}` : '';
      return isTv
        ? `https://multiembed.mov/?video_id=${id}${tmdbParam}&s=${s}&e=${e}${seParams}`
        : `https://multiembed.mov/?video_id=${id}${tmdbParam}${seParams}`;
    }

    default: {
      return isTv
        ? `https://player.vidlove.cc/embed/tv/${id}/${s}/${e}?autoplay=false&nextbutton=true`
        : `https://player.vidlove.cc/embed/movie/${id}?autoplay=false`;
    }
  }
};

/**
 * Safe Ad-Shield Sandbox configuration for iframe video providers.
 * Allows video rendering, DRM/Encrypted Media, fullscreen, and forms,
 * while STRICTLY blocking popups, new window opening, and top-level site hijacking.
 */
export const getSourceSandboxConfig = (_name?: string): string => {
  return "allow-scripts allow-same-origin allow-forms allow-presentation allow-encrypted-media";
};

/**
 * Normalizes raw stream inputs (iframes, direct links, cloud hosts) into direct player/embed URLs
 */
export const extractEmbedSrc = (source: string): string => {
  if (!source) return "";

  let cleanSource = source;
  try {
    cleanSource = cleanSource
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\//g, '/')
      .replace(/\\/g, '');
  } catch (e) {
    console.warn("Error cleaning source URL/iframe:", e);
  }

  let finalUrl = "";

  if (cleanSource.toLowerCase().includes('<iframe')) {
    const match = cleanSource.match(/src=["'](.*?)["']/i);
    if (match && match[1]) {
      finalUrl = match[1];
    } else {
      const fallbackMatch = cleanSource.match(/src=(?:["']|\\")?([^\s"'>\\]+)/i);
      if (fallbackMatch && fallbackMatch[1]) {
        finalUrl = fallbackMatch[1];
      }
    }
  } else {
    const trimmed = cleanSource.trim();
    if (trimmed.toLowerCase().startsWith('http') || trimmed.startsWith('//')) {
      finalUrl = trimmed;
    } else {
      const linkMatch = cleanSource.match(/(?:https?:)?\/\/[^\s"'><]+/i);
      if (linkMatch) {
        finalUrl = linkMatch[0];
      }
    }
  }

  if (!finalUrl) return "";

  if (finalUrl.startsWith('//')) {
    finalUrl = 'https:' + finalUrl;
  }

  // Google Drive
  if (finalUrl.includes('drive.google.com')) {
    if (finalUrl.includes('/view')) {
      finalUrl = finalUrl.replace('/view', '/preview');
    } else if (finalUrl.includes('open?id=')) {
      try {
        const fileId = new URL(finalUrl).searchParams.get('id');
        if (fileId) finalUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      } catch (e) {}
    }
  }
  // OK.ru
  if (finalUrl.includes('ok.ru/video/') && !finalUrl.includes('videoembed')) {
    finalUrl = finalUrl.replace('ok.ru/video/', 'ok.ru/videoembed/');
  }
  // YouTube
  if (finalUrl.includes('youtube.com/watch?v=') || finalUrl.includes('youtu.be/')) {
    try {
      const ytId = finalUrl.includes('youtu.be/')
        ? finalUrl.split('youtu.be/')[1]?.split('?')[0]
        : new URL(finalUrl).searchParams.get('v');
      if (ytId) {
        finalUrl = `https://www.youtube-nocookie.com/embed/${ytId}`;
      }
    } catch (e) {}
  }
  // Vimeo
  if (finalUrl.includes('vimeo.com/') && !finalUrl.includes('player.vimeo.com')) {
    try {
      const vimeoId = finalUrl.split('vimeo.com/')[1]?.split('?')[0];
      if (vimeoId) {
        finalUrl = `https://player.vimeo.com/video/${vimeoId}`;
      }
    } catch (e) {}
  }
  // Dropbox
  if (finalUrl.includes('dropbox.com') && finalUrl.includes('dl=0')) {
    finalUrl = finalUrl.replace('dl=0', 'raw=1');
  }
  // Rashaba
  if (finalUrl.includes('rashaba.com') && !finalUrl.includes('/e/') && !finalUrl.includes('/embed/')) {
    try {
      const matches = finalUrl.match(/\/([a-zA-Z0-9]{3,32})\/?$/) || finalUrl.match(/\/([a-zA-Z0-9]{3,32})\//);
      const rid = matches ? matches[1] : finalUrl.split('/').filter(Boolean).pop();
      if (rid) {
        finalUrl = `https://rashaba.com/e/${rid}`;
      }
    } catch (e) {}
  }

  // Direct Media Check
  const isDirectMedia = (
    finalUrl.toLowerCase().includes('.m3u8') ||
    finalUrl.toLowerCase().includes('.mp4') ||
    finalUrl.toLowerCase().includes('.webm') ||
    finalUrl.toLowerCase().includes('.m4v') ||
    finalUrl.toLowerCase().includes('/storage/v1/object/public/') ||
    finalUrl.toLowerCase().includes('shortbox')
  );

  if (isDirectMedia) {
    return finalUrl;
  }

  // Autoplay params for iframe embeds
  try {
    const url = new URL(finalUrl);
    if (!url.searchParams.has('autoplay')) url.searchParams.append('autoplay', '1');
    if (!url.searchParams.has('play')) url.searchParams.append('play', '1');
    finalUrl = url.toString();
  } catch (e) {
    if (!finalUrl.includes('autoplay=')) {
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'autoplay=1&play=1';
    }
  }

  return finalUrl;
};

/**
 * Splits and formats multi-source dubbed stream strings into an array of enhanced player sources
 */
export const getDubbedSources = (rawStream: string, language: string = 'ku'): EnhancedPlayerSource[] => {
  if (!rawStream || !rawStream.trim()) return [];
  const parts = rawStream.split(/[\n,|]+/).map(s => s.trim()).filter(Boolean);
  
  return parts.map((part, idx) => {
    const cleanUrl = extractEmbedSrc(part);
    const serverName = `FLKRD DUBBED ${idx + 1}`;
    let providerName = (language === 'ku' || language === 'badini') ? `سێرڤەری کوردی ${idx + 1}` : `Kurdish Stream ${idx + 1}`;

    if (part.includes('rashaba')) providerName = `Rashaba Server ${idx + 1}`;
    else if (part.includes('drive.google')) providerName = `Google Drive ${idx + 1}`;
    else if (part.includes('ok.ru')) providerName = `OK.ru Node ${idx + 1}`;
    else if (part.includes('.m3u8')) providerName = `Direct HLS ${idx + 1}`;

    return {
      name: serverName,
      displayName: providerName,
      description: (language === 'ku' || language === 'badini') ? 'پەخشی ڕاستەوخۆ بە دۆبلاژی کوردی' : 'Kurdish Dubbed Direct Stream',
      badge: 'ku',
      score: 1000 - idx,
      url: cleanUrl
    };
  });
};

