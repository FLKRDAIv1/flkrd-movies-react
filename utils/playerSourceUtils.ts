
import { PlayerSource } from '../types';

export interface EnhancedPlayerSource extends PlayerSource {
  badge?: 'ku' | 'diamond' | 'crown' | 'bronze';
  displayName: string;
  description: string;
  kurdishName?: string;
  kurdishDesc?: string;
  url?: string;
}

const LOCAL_STORAGE_KEY = 'playerSourceScores_v3';

/** Real display names and Kurdish Sorani translations for each FLKRD SERVER slot */
export const SOURCE_META: Record<string, { 
  displayName: string; 
  description: string; 
  kurdishName: string; 
  kurdishDesc: string; 
}> = {
  'FLKRD SERVER': { 
    displayName: 'Videasy Pro 4K', 
    description: 'Ultra Fast Direct 4K Stream · Subtitles & Zero Buffering',
    kurdishName: 'ڤید ئیزی پرۆ (Videasy Pro 4K)',
    kurdishDesc: 'سێرڤەری سەرەکی خێرا و کارا · پەخشی 4K و سفڕ ڕیکلام'
  },
  'FLKRD SERVER 1': { 
    displayName: 'VidSrc Me 4K', 
    description: 'Universal Direct Multi-Host Stream Engine · TMDb & IMDb',
    kurdishName: 'ڤید سۆرس می (VidSrc Me 4K)',
    kurdishDesc: 'پەخشی خێرای جیهانی بەبێ پچڕان بۆ هەموو فیلم و دراماکان'
  },
  'FLKRD SERVER 2': { 
    displayName: 'VidSrc Ultra 4K', 
    description: 'High-Bitrate 4K Stream · Global Fast CDN',
    kurdishName: 'ڤید سۆرس ئاڵترا (VidSrc Ultra 4K)',
    kurdishDesc: 'خێرایی زۆر بەرز و کوالێتی 4K UHD بەبێ پچڕان'
  },
  'FLKRD SERVER 3': { 
    displayName: 'VidSrc Su 4K', 
    description: 'Instant Cloud Playback Node · High Uptime',
    kurdishName: 'ڤید سۆرس ئێس یوو (VidSrc Su 4K)',
    kurdishDesc: 'پەخشی خێرای هەوری بەبێ چاوەڕوانی'
  },
  'FLKRD SERVER 4': { 
    displayName: 'SuperEmbed Multi-Server', 
    description: 'Multi-Source Mirror Backup Stream · All Titles',
    kurdishName: 'سوپەر ئیمبێد (SuperEmbed Multi-Server)',
    kurdishDesc: 'سێرڤەری فرە-سەرچاوەی بەهێز بۆ هەموو فیلم و زنجیرەکان'
  },
  'FLKRD SERVER 5': { 
    displayName: 'VidLink Pro 4K', 
    description: 'Direct Clean Modern Player · Adaptive HDR & Subs',
    kurdishName: 'ڤید لینک پرۆ (VidLink Pro 4K)',
    kurdishDesc: 'پەخشی کوالێتی بەرز بە دیزاینی مۆدێرن و ژێرنووس'
  },
  'FLKRD SERVER 6': { 
    displayName: 'VidSrc Prime 1080p', 
    description: 'Deep Global Archive · HD 1080p LiteSpeed',
    kurdishName: 'ڤید سۆرس پڕایم (VidSrc Prime)',
    kurdishDesc: 'ئەرشیفی گەورەی فیلم و زنجیرەکان'
  },
  'FLKRD SERVER 7': { 
    displayName: '2Embed Ultra 4K', 
    description: 'Multi-Server Universal Stream Engine · All Titles',
    kurdishName: 'تو ئیمبێد (2Embed Ultra 4K)',
    kurdishDesc: 'سێرڤەری نوێ و جیاواز · لێدانی فرە-کەناڵ'
  },
  'FLKRD SERVER 8': { 
    displayName: 'AutoEmbed VIP', 
    description: 'Ultra-Fast Multi-Cloud Failover',
    kurdishName: 'ئۆتۆ ئیمبێد (AutoEmbed VIP)',
    kurdishDesc: 'سێرڤەری فرە-هەور بەبێ پچڕان'
  },
  'FLKRD SERVER 9': { 
    displayName: 'SmashyStream Multi-Host', 
    description: 'Fast Multi-Server Stream Node',
    kurdishName: 'سماشی ستریم (SmashyStream Multi-Host)',
    kurdishDesc: 'سێرڤەری خێرای هەوری بە کوالێتی بەرز'
  },
  'FLKRD SERVER 10': { 
    displayName: 'VidSrc IO Global', 
    description: 'Global Fast CDN Stream Engine',
    kurdishName: 'ڤید سۆرس ئای ئۆ (VidSrc IO Global)',
    kurdishDesc: 'پەخشی جیهانی خێرا لەسەر تۆڕی CDN'
  },
  'FLKRD SERVER 11': { 
    displayName: 'NontonGo Cloud 4K', 
    description: 'High-Definition Cloud Mirror Backup',
    kurdishName: 'نۆنتۆنگۆ کلاود (NontonGo Cloud 4K)',
    kurdishDesc: 'سێرڤەری یەدەگی هەوری بۆ فیلم و دراماکان'
  },
  'FLKRD SERVER 12': { 
    displayName: 'VidSrc Net VIP', 
    description: 'Direct High-Speed Media Backup Node',
    kurdishName: 'ڤید سۆرس نێت (VidSrc Net VIP)',
    kurdishDesc: 'سێرڤەری یەدەگی فەرمی'
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
  { name: 'FLKRD SERVER 8' },
  { name: 'FLKRD SERVER 9' },
  { name: 'FLKRD SERVER 10' },
  { name: 'FLKRD SERVER 11' },
  { name: 'FLKRD SERVER 12' },
];

const getScores = (): { [key: string]: number } => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem('playerSourceScores');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error("Failed to parse player source scores", error);
  }
  return {
    'FLKRD SERVER':    1000,
    'FLKRD SERVER 1':  960,
    'FLKRD SERVER 2':  920,
    'FLKRD SERVER 3':  880,
    'FLKRD SERVER 4':  840,
    'FLKRD SERVER 5':  800,
    'FLKRD SERVER 6':  760,
    'FLKRD SERVER 7':  720,
    'FLKRD SERVER 8':  680,
    'FLKRD SERVER 9':  640,
    'FLKRD SERVER 10': 600,
    'FLKRD SERVER 11': 560,
    'FLKRD SERVER 12': 500,
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
        source.name === 'FLKRD SERVER 3' ||
        source.name === 'FLKRD SERVER 4'
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
  const cleanId = String(id || '').replace(/^custom_/, '').trim();
  
  // If no ID is provided, return empty
  if (!cleanId) return '';

  const isImdb = cleanId.startsWith('tt');
  const s = Math.max(1, Number(season) || 1);
  const e = Math.max(1, Number(episode) || 1);

  // Strictly sanitize subtitleUrl: only allow public http/https URLs (never local blob: or data: URIs)
  const isCleanHttpSub = subtitleUrl && 
    (subtitleUrl.startsWith('http://') || subtitleUrl.startsWith('https://')) && 
    !subtitleUrl.startsWith('blob:') && 
    !subtitleUrl.startsWith('data:');
  const cleanSubUrl = isCleanHttpSub ? subtitleUrl : '';

  switch (name) {
    case 'FLKRD SERVER': { // 1. Videasy Pro 4K (Ultra Fast, Zero Buffering, Custom Color & Subs)
      const veParams = `?color=${playerColor}&overlay=true${progress > 5 ? `&progress=${Math.floor(progress)}` : ''}${cleanSubUrl ? `&sub=${encodeURIComponent(cleanSubUrl)}` : ''}`;
      if (isAnime) {
        return e
          ? `https://player.videasy.to/anime/${cleanId}/${e}${veParams}&nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true`
          : `https://player.videasy.to/anime/${cleanId}${veParams}`;
      }
      return isTv
        ? `https://player.videasy.to/tv/${cleanId}/${s}/${e}${veParams}&nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true`
        : `https://player.videasy.to/movie/${cleanId}${veParams}`;
    }

    case 'FLKRD SERVER 1': { // 2. VidSrc Me 4K (Direct Universal Multi-Host Stream Engine)
      const idParam = isImdb ? `imdb=${cleanId}` : `tmdb=${cleanId}`;
      return isTv
        ? `https://vidsrc.me/embed/tv?${idParam}&season=${s}&episode=${e}`
        : `https://vidsrc.me/embed/movie?${idParam}`;
    }

    case 'FLKRD SERVER 2': { // 3. VidSrc Ultra 4K (vidsrc.to)
      return isTv
        ? `https://vidsrc.to/embed/tv/${cleanId}/${s}/${e}`
        : `https://vidsrc.to/embed/movie/${cleanId}`;
    }

    case 'FLKRD SERVER 3': { // 4. VidSrc Su 4K (vidsrc.su - Instant CDN)
      return isTv
        ? `https://vidsrc.su/embed/tv/${cleanId}/${s}/${e}`
        : `https://vidsrc.su/embed/movie/${cleanId}`;
    }

    case 'FLKRD SERVER 4': { // 5. SuperEmbed Multi-Mirror 4K (multiembed.mov)
      const tmdbParam = isImdb ? '' : '&tmdb=1';
      const seParams = cleanSubUrl ? `&subtitle=${encodeURIComponent(cleanSubUrl)}&sub=${encodeURIComponent(cleanSubUrl)}` : '';
      return isTv
        ? `https://multiembed.mov/?video_id=${cleanId}${tmdbParam}&s=${s}&e=${e}${seParams}`
        : `https://multiembed.mov/?video_id=${cleanId}${tmdbParam}${seParams}`;
    }

    case 'FLKRD SERVER 5': { // 6. VidLink Pro 4K (vidlink.pro)
      const vlParams = `?primaryColor=${playerColor}&secondaryColor=a2a2a2&iconColor=eefdec&playerIcon=default&title=true&poster=true&autoplay=false&nextbutton=true${progress > 10 ? `&startTime=${Math.floor(progress)}` : ''}${cleanSubUrl ? `&subtitles=${encodeURIComponent(cleanSubUrl)}&subLabel=Kurdish` : ''}`;
      return isTv
        ? `https://vidlink.pro/tv/${cleanId}/${s}/${e}${vlParams}`
        : `https://vidlink.pro/movie/${cleanId}${vlParams}`;
    }

    case 'FLKRD SERVER 6': { // 7. VidSrc Prime (vidsrc.pm)
      return isTv
        ? `https://vidsrc.pm/embed/tv/${cleanId}/${s}/${e}`
        : `https://vidsrc.pm/embed/movie/${cleanId}`;
    }

    case 'FLKRD SERVER 7': { // 8. 2Embed Ultra 4K (2embed.cc)
      return isTv
        ? `https://www.2embed.cc/embedtv/${cleanId}?s=${s}&e=${e}`
        : `https://www.2embed.cc/embed/${cleanId}`;
    }

    case 'FLKRD SERVER 8': { // 9. AutoEmbed VIP (autoembed.co)
      return isTv
        ? `https://autoembed.co/tv/tmdb/${cleanId}-${s}-${e}`
        : `https://autoembed.co/movie/tmdb/${cleanId}`;
    }

    case 'FLKRD SERVER 9': { // 10. SmashyStream Multi-Host (smashystream.com)
      return isTv
        ? `https://embed.smashystream.com/playere.php?tmdb=${cleanId}&season=${s}&episode=${e}`
        : `https://embed.smashystream.com/playere.php?tmdb=${cleanId}`;
    }

    case 'FLKRD SERVER 10': { // 11. VidSrc IO Global (vidsrc.io)
      return isTv
        ? `https://vidsrc.io/embed/tv/${cleanId}/${s}/${e}`
        : `https://vidsrc.io/embed/movie/${cleanId}`;
    }

    case 'FLKRD SERVER 11': { // 12. NontonGo Cloud 4K (nontongo.win)
      return isTv
        ? `https://www.nontongo.win/embed/tv/${cleanId}/${s}/${e}`
        : `https://www.nontongo.win/embed/movie/${cleanId}`;
    }

    case 'FLKRD SERVER 12': { // 13. VidSrc Net VIP (vidsrc.net)
      return isTv
        ? `https://vidsrc.net/embed/tv/${cleanId}/${s}/${e}`
        : `https://vidsrc.net/embed/movie/${cleanId}`;
    }

    default: {
      const veParams = `?color=${playerColor}&overlay=true${cleanSubUrl ? `&sub=${encodeURIComponent(cleanSubUrl)}` : ''}`;
      return isTv
        ? `https://player.videasy.to/tv/${cleanId}/${s}/${e}${veParams}`
        : `https://player.videasy.to/movie/${cleanId}${veParams}`;
    }
  }
};
/**
 * Universal Bypass Sandbox configuration for iframe video providers.
 * Enables all essential web APIs, media keys, presentation, and downloads
 * while preventing background ad redirects.
 */
export const getSourceSandboxConfig = (_name?: string): string => {
  return "allow-scripts allow-same-origin allow-forms allow-presentation allow-encrypted-media allow-downloads allow-pointer-lock allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-popups";
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

  // 1. If contains <iframe tag anywhere in string
  if (cleanSource.toLowerCase().includes('<iframe')) {
    const match = cleanSource.match(/src=["'](.*?)["']/i);
    if (match && match[1]) {
      finalUrl = match[1].trim();
    } else {
      const fallbackMatch = cleanSource.match(/src=(?:["']|\\")?([^\s"'>\\]+)/i);
      if (fallbackMatch && fallbackMatch[1]) {
        finalUrl = fallbackMatch[1].trim();
      }
    }
  } else {
    // 2. Direct string or link extraction
    const trimmed = cleanSource.trim();
    if (trimmed.toLowerCase().startsWith('http://') || trimmed.toLowerCase().startsWith('https://') || trimmed.startsWith('//')) {
      finalUrl = trimmed.split(/\s+/)[0]; // strip any trailing words/comments
    } else {
      const linkMatch = cleanSource.match(/(?:https?:)?\/\/[^\s"'><]+/i);
      if (linkMatch) {
        finalUrl = linkMatch[0].trim();
      }
    }
  }

  if (!finalUrl) return "";

  // Clean HTML entities like &amp;
  finalUrl = finalUrl.replace(/&amp;/g, '&');

  if (finalUrl.startsWith('//')) {
    finalUrl = 'https:' + finalUrl;
  }

  // Direct Media Check (.m3u8, .mp4, .webm, etc.) — must run first before provider rewrites
  const isDirectMedia = (
    finalUrl.toLowerCase().includes('.m3u8') ||
    finalUrl.toLowerCase().includes('.mp4') ||
    finalUrl.toLowerCase().includes('.webm') ||
    finalUrl.toLowerCase().includes('.m4v') ||
    finalUrl.toLowerCase().includes('.mkv') ||
    finalUrl.toLowerCase().includes('/storage/v1/object/public/') ||
    finalUrl.toLowerCase().includes('shortbox')
  );

  if (isDirectMedia) {
    return finalUrl;
  }

  // Google Drive Embed
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

  // OK.ru Video Embed
  if (finalUrl.includes('ok.ru/video/') && !finalUrl.includes('videoembed')) {
    finalUrl = finalUrl.replace('ok.ru/video/', 'ok.ru/videoembed/');
  }

  // YouTube Links -> Embed
  if (finalUrl.includes('youtube.com/watch?v=') || finalUrl.includes('youtu.be/') || finalUrl.includes('youtube.com/embed/')) {
    try {
      let ytId = '';
      if (finalUrl.includes('youtu.be/')) {
        ytId = finalUrl.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0];
      } else if (finalUrl.includes('youtube.com/embed/')) {
        ytId = finalUrl.split('youtube.com/embed/')[1]?.split('?')[0]?.split('&')[0];
      } else {
        ytId = new URL(finalUrl).searchParams.get('v') || '';
      }
      if (ytId) {
        finalUrl = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`;
        return finalUrl;
      }
    } catch (e) {}
  }

  // Vimeo
  if (finalUrl.includes('vimeo.com/') && !finalUrl.includes('player.vimeo.com')) {
    try {
      const vimeoId = finalUrl.split('vimeo.com/')[1]?.split('?')[0]?.split('/')[0];
      if (vimeoId) {
        finalUrl = `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
        return finalUrl;
      }
    } catch (e) {}
  }

  // Dailymotion
  if (finalUrl.includes('dailymotion.com/video/') && !finalUrl.includes('/embed/video/')) {
    try {
      const dmId = finalUrl.split('dailymotion.com/video/')[1]?.split('?')[0];
      if (dmId) {
        finalUrl = `https://www.dailymotion.com/embed/video/${dmId}?autoplay=1`;
        return finalUrl;
      }
    } catch (e) {}
  }

  // Dropbox
  if (finalUrl.includes('dropbox.com') && finalUrl.includes('dl=0')) {
    finalUrl = finalUrl.replace('dl=0', 'raw=1');
  }

  // Rashaba Player Embed
  if (finalUrl.includes('rashaba.com')) {
    if (!finalUrl.includes('/e/') && !finalUrl.includes('/embed/')) {
      try {
        const matches = finalUrl.match(/\/([a-zA-Z0-9]{3,32})\/?$/) || finalUrl.match(/\/([a-zA-Z0-9]{3,32})\//);
        const rid = matches ? matches[1] : finalUrl.split('/').filter(Boolean).pop();
        if (rid) {
          finalUrl = `https://rashaba.com/e/${rid}`;
        }
      } catch (e) {}
    }
  }

  // Streamtape Embed
  if (finalUrl.includes('streamtape.com/v/')) {
    finalUrl = finalUrl.replace('streamtape.com/v/', 'streamtape.com/e/');
  }

  // DoodStream Embed
  if (finalUrl.includes('doodstream.com/d/') || finalUrl.includes('dood.to/d/') || finalUrl.includes('dood.ws/d/')) {
    finalUrl = finalUrl.replace('/d/', '/e/');
  }

  // Autoplay parameters for generic iframe embeds
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
  
  // Extract individual iframe blocks or delimited strings
  const iframeMatches = rawStream.match(/<iframe[\s\S]*?<\/iframe>/gi);
  let parts: string[] = [];

  if (iframeMatches && iframeMatches.length > 0) {
    parts = iframeMatches;
  } else {
    parts = rawStream.split(/[\n,|]+/).map(s => s.trim()).filter(Boolean);
  }
  
  return parts.map((part, idx) => {
    const cleanUrl = extractEmbedSrc(part);
    const serverName = `FLKRD DUBBED ${idx + 1}`;
    let providerName = (language === 'ku' || language === 'badini') ? `سێرڤەری کوردی ${idx + 1}` : `Kurdish Stream ${idx + 1}`;

    const lowerPart = part.toLowerCase();
    if (lowerPart.includes('rashaba')) providerName = `Rashaba HD ${idx + 1}`;
    else if (lowerPart.includes('drive.google')) providerName = `Google Drive ${idx + 1}`;
    else if (lowerPart.includes('ok.ru')) providerName = `OK.ru HD ${idx + 1}`;
    else if (lowerPart.includes('youtube') || lowerPart.includes('youtu.be')) providerName = `YouTube Stream ${idx + 1}`;
    else if (lowerPart.includes('.m3u8')) providerName = `Direct HLS 4K ${idx + 1}`;
    else if (lowerPart.includes('.mp4')) providerName = `Direct MP4 ${idx + 1}`;

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

