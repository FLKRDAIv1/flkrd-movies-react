
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
    displayName: 'RiveStream 4K Ultra', 
    description: 'Primary Direct 4K Stream · Modern Interface & Zero Lag',
    kurdishName: 'ڕایڤ ستریم (RiveStream 4K Ultra)',
    kurdishDesc: 'سێرڤەری سەرەکی 4K خێرا و کارا'
  },
  'FLKRD SERVER 1': { 
    displayName: 'VidLove 4K Pro', 
    description: 'Direct Clean 4K Player · Zero Buffering & Direct Download',
    kurdishName: 'ڤید لۆڤ پرۆ (VidLove 4K Pro)',
    kurdishDesc: 'پەخشی 4K و سفڕ ڕیکلام · خێرایی بەرز لەگەڵ داگرتن'
  },
  'FLKRD SERVER 2': { 
    displayName: 'VidLink Pro 4K', 
    description: 'Ultra-Fast 4K HDR Player · Instant Load',
    kurdishName: 'ڤید لینک پرۆ (VidLink Pro 4K)',
    kurdishDesc: 'خێراترین پەخشی 4K بەبێ چاوەڕوانی'
  },
  'FLKRD SERVER 3': { 
    displayName: 'VidKing 4K', 
    description: 'Universal Direct Streaming · 4K UHD',
    kurdishName: 'ڤید کینگ (VidKing 4K)',
    kurdishDesc: 'خێرایی زۆر بەرز و کوالێتی 4K UHD'
  },
  'FLKRD SERVER 4': { 
    displayName: 'Videasy HD', 
    description: 'Smart Adaptive Multi-Bitrate · HD 1080p',
    kurdishName: 'ڤید ئیزی (Videasy HD)',
    kurdishDesc: 'پەخشی زیرەک و ڕێکخراو · HD 1080p'
  },
  'FLKRD SERVER 5': { 
    displayName: 'NontonGo Direct', 
    description: 'Cloud HLS High-Speed Video Player',
    kurdishName: 'نۆنتۆن گۆ (NontonGo Direct)',
    kurdishDesc: 'پەخشی خێرای هەوری بەبێ پچڕان'
  },
  'FLKRD SERVER 6': { 
    displayName: 'VidSrc VIP', 
    description: 'Deep Global Archive · HD 1080p LiteSpeed',
    kurdishName: 'ڤید سۆرس ڤی ئای پی (VidSrc VIP)',
    kurdishDesc: 'ئەرشیفی گەورەی فیلم و زنجیرەکان'
  },
  'FLKRD SERVER 7': { 
    displayName: '2Embed Ultra 4K', 
    description: 'Multi-Server Universal Stream Engine · All Titles',
    kurdishName: 'تو ئیمبێد (2Embed Ultra 4K)',
    kurdishDesc: 'سێرڤەری نوێ و جیاواز · لێدانی فرە-کەناڵ'
  },
  'FLKRD SERVER 8': { 
    displayName: 'RiveStream Multi-Host', 
    description: 'Multi-Server Aggregator Engine · 1080p/4K Failover',
    kurdishName: 'ڕایڤ ئاگریگەیتەر (Rive Aggregator)',
    kurdishDesc: 'سێرڤەری فرە-سەرچاوەی زیرەک'
  },
  'FLKRD SERVER 9': { 
    displayName: 'RiveStream Torrent 4K', 
    description: 'Torrent-Backed High Bitrate 4K Stream',
    kurdishName: 'ڕایڤ تۆڕێنت (Rive Torrent 4K)',
    kurdishDesc: 'پەخشی کوالێتی بەرز بە تۆڕێنت'
  },
  'FLKRD SERVER 10': { 
    displayName: 'AutoEmbed VIP', 
    description: 'Ultra-Fast Multi-Cloud Failover',
    kurdishName: 'ئۆتۆ ئیمبێد (AutoEmbed VIP)',
    kurdishDesc: 'سێرڤەری فرە-هەور بەبێ پچڕان'
  },
  'FLKRD SERVER 11': { 
    displayName: 'SuperEmbed', 
    description: 'Multi-Source Mirror Backup Stream',
    kurdishName: 'سوپەر ئیمبێد (SuperEmbed)',
    kurdishDesc: 'سێرڤەری فرە-سەرچاوەی یەدەگ'
  },
  'FLKRD SERVER 12': { 
    displayName: 'RiveStream Downloader', 
    description: 'Direct High-Speed Media Downloader',
    kurdishName: 'ڕایڤ داونلۆدەر (Rive Downloader)',
    kurdishDesc: 'داگرتنی خێرای فیلم و زنجیرەکان'
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
    const storedScores = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedScores) {
      return JSON.parse(storedScores);
    }
  } catch (error) {
    console.error("Failed to parse player source scores", error);
  }
  return {
    'FLKRD SERVER':    990,
    'FLKRD SERVER 1':  950,
    'FLKRD SERVER 2':  900,
    'FLKRD SERVER 3':  850,
    'FLKRD SERVER 4':  800,
    'FLKRD SERVER 5':  750,
    'FLKRD SERVER 6':  700,
    'FLKRD SERVER 7':  650,
    'FLKRD SERVER 8':  600,
    'FLKRD SERVER 9':  550,
    'FLKRD SERVER 10': 500,
    'FLKRD SERVER 11': 450,
    'FLKRD SERVER 12': 400,
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
    case 'FLKRD SERVER': { // 1. RiveStream 4K Ultra (Default Primary #1)
      return isTv
        ? `https://rivestream.ru/embed?type=tv&id=${id}&season=${s}&episode=${e}`
        : `https://rivestream.ru/embed?type=movie&id=${id}`;
    }

    case 'FLKRD SERVER 1': { // 2. VidLove 4K Pro (Primary Rock-Solid 100% Working Stream)
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

    case 'FLKRD SERVER 3': { // 4. VidKing 4K
      const vkParams = `&color=${playerColor}&autoplay=1&playsinline=1&subtitles=1&sub=1${cleanSubUrl ? `&sub_file=${encodeURIComponent(cleanSubUrl)}&sub_label=Kurdish${subParam}` : ''}`;
      return isTv
        ? `https://www.vidking.net/embed/tv/${id}/${s}/${e}?${vkParams}&nextEpisode=true&episodeSelector=true${progress > 10 ? `&start=${Math.floor(progress)}` : ''}`
        : `https://www.vidking.net/embed/movie/${id}?${vkParams}${progress > 10 ? `&start=${Math.floor(progress)}` : ''}`;
    }

    case 'FLKRD SERVER 4': { // 5. Videasy HD
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

    case 'FLKRD SERVER 5': { // 6. NontonGo Direct (Brand New Cloud HLS Stream Engine)
      return isTv
        ? `https://www.nontongo.win/embed/tv/${id}/${s}/${e}`
        : `https://www.nontongo.win/embed/movie/${id}`;
    }

    case 'FLKRD SERVER 6': { // 7. VidSrc VIP (vidsrc.in)
      return isTv
        ? `https://vidsrc.in/embed/tv/${id}/${s}/${e}`
        : `https://vidsrc.in/embed/movie/${id}`;
    }

    case 'FLKRD SERVER 7': { // 8. 2Embed Ultra 4K (Brand New Universal Stream Engine)
      return isTv
        ? `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
        : `https://www.2embed.cc/embed/${id}`;
    }

    case 'FLKRD SERVER 8': { // 9. RiveStream Aggregator (Multi-Host VIP)
      return isTv
        ? `https://rivestream.ru/embed/agg?type=tv&id=${id}&season=${s}&episode=${e}`
        : `https://rivestream.ru/embed/agg?type=movie&id=${id}`;
    }

    case 'FLKRD SERVER 9': { // 10. RiveStream Torrent Engine (Ultra 4K Stream)
      return isTv
        ? `https://rivestream.ru/embed/torrent?type=tv&id=${id}&season=${s}&episode=${e}`
        : `https://rivestream.ru/embed/torrent?type=movie&id=${id}`;
    }

    case 'FLKRD SERVER 10': { // 11. AutoEmbed VIP
      return isTv
        ? `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`
        : `https://autoembed.co/movie/tmdb/${id}`;
    }

    case 'FLKRD SERVER 11': { // 12. SuperEmbed Multi-Mirror
      const isImdb = id.startsWith('tt');
      const tmdbParam = isImdb ? '' : '&tmdb=1';
      const seParams = cleanSubUrl ? `&subtitle=${encodeURIComponent(cleanSubUrl)}&sub=${encodeURIComponent(cleanSubUrl)}` : '';
      return isTv
        ? `https://multiembed.mov/?video_id=${id}${tmdbParam}&s=${s}&e=${e}${seParams}`
        : `https://multiembed.mov/?video_id=${id}${tmdbParam}${seParams}`;
    }

    case 'FLKRD SERVER 12': { // 13. RiveStream Direct Downloader
      return isTv
        ? `https://rivestream.ru/download?type=tv&id=${id}&season=${s}&episode=${e}`
        : `https://rivestream.ru/download?type=movie&id=${id}`;
    }

    default: {
      return isTv
        ? `https://rivestream.ru/embed?type=tv&id=${id}&season=${s}&episode=${e}`
        : `https://rivestream.ru/embed?type=movie&id=${id}`;
    }
  }
};

/**
 * Universal Bypass Sandbox configuration for iframe video providers.
 * Spoofs and enables all essential web APIs, media keys, presentation, and downloads
 * while preventing background ad redirects.
 */
export const getSourceSandboxConfig = (_name?: string): string => {
  return "allow-scripts allow-same-origin allow-forms allow-presentation allow-encrypted-media allow-downloads allow-pointer-lock allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation";
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

  // Direct Media Check (.m3u8, .mp4, .webm, etc.)
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

