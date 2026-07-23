
import { OPENSUBTITLES_KEYS } from '../constants';
import { SubtitleFile, SubtitleLine } from '../types';

const API_BASE_URL = 'https://api.opensubtitles.com/api/v1';

// Function to search for available subtitles for a given TMDB ID with key rotation
export const searchSubtitles = async (tmdbId: string, type: 'movie' | 'tv'): Promise<SubtitleFile[]> => {
  const apiType = type === 'tv' ? 'episode' : 'movie';
  const url = `${API_BASE_URL}/subtitles?tmdb_id=${tmdbId}&languages=ckb,en&type=${apiType}`;

  for (const key of OPENSUBTITLES_KEYS) {
    try {
      const response = await fetch(url, {
        headers: {
          'Api-Key': key,
          'Accept': 'application/json',
          'User-Agent': 'FLKRD_Streaming_App_v1.0.0',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.data || data.data.length === 0) return [];

        const subtitles: SubtitleFile[] = data.data
          .filter((item: any) => item.attributes.language === 'ckb' || item.attributes.language === 'en')
          .map((item: any) => ({
            language: item.attributes.language === 'ckb' ? 'Kurdish' : 'English',
            language_code: item.attributes.language,
            file_id: item.attributes.files[0].file_id,
          }));

        return Array.from(new Map(subtitles.map(item => [item.language, item])).values());
      }
      console.warn(`[OpenSubtitles] Key failed with status ${response.status}, rotating...`);
    } catch (error) {
      console.warn('[OpenSubtitles] Search error with key, trying next:', error);
    }
  }

  return [];
};

// Function to get subtitle content from a file ID with key rotation
export const getSubtitleContent = async (fileId: number): Promise<string | null> => {
  for (const key of OPENSUBTITLES_KEYS) {
    try {
      const downloadResponse = await fetch(`${API_BASE_URL}/download`, {
        method: 'POST',
        headers: {
          'Api-Key': key,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FLKRD_Streaming_App_v1.0.0',
        },
        body: JSON.stringify({ file_id: fileId }),
      });

      if (downloadResponse.ok) {
        const downloadData = await downloadResponse.json();
        const subtitleUrl = downloadData.link;
        if (!subtitleUrl) continue;

        const proxyUrl = 'https://corsproxy.io/?';
        const contentResponse = await fetch(`${proxyUrl}${subtitleUrl}`);
        if (contentResponse.ok) {
          return await contentResponse.text();
        }
      }
      console.warn(`[OpenSubtitles] Download key failed with status ${downloadResponse.status}, rotating...`);
    } catch (error) {
      console.warn('[OpenSubtitles] Download error with key, trying next:', error);
    }
  }

  return null;
};

// Function to parse SRT content into a structured array
export const parseSrt = (srtContent: string): SubtitleLine[] => {
    const lines = srtContent.split(/\r?\n/);
    const subtitleLines: SubtitleLine[] = [];
    let i = 0;
    while (i < lines.length) {
        const idStr = lines[i];
        if (idStr && !isNaN(Number(idStr))) {
            const id = Number(idStr);
            const timeStr = lines[i + 1];
            if (timeStr) {
                const [startTime, endTime] = timeStr.split(' --> ');
                const textLines: string[] = [];
                let textIndex = i + 2;
                while (lines[textIndex]) {
                    textLines.push(lines[textIndex]);
                    textIndex++;
                }
                subtitleLines.push({
                    id,
                    startTime,
                    endTime,
                    text: textLines.join('\n').replace(/<[^>]*>/g, ''), // Remove HTML tags
                });
                i = textIndex;
            }
        }
        i++;
    }
    return subtitleLines;
};