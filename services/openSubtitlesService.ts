
import { OPENSUBTITLES_API_KEY } from '../constants';
import { SubtitleFile, SubtitleLine } from '../types';

const API_BASE_URL = 'https://api.opensubtitles.com/api/v1';

// Function to search for available subtitles for a given TMDB ID
export const searchSubtitles = async (tmdbId: string, type: 'movie' | 'tv'): Promise<SubtitleFile[]> => {
  const headers = {
    'Api-Key': OPENSUBTITLES_API_KEY,
    'Accept': 'application/json',
    'User-Agent': 'FLKRD_Streaming_App_v1.0.0', // Updated to a more specific string
  };

  try {
    const apiType = type === 'tv' ? 'episode' : 'movie';
    // Use 'ckb' for Kurdish (Sorani) and 'en' for English
    const response = await fetch(`${API_BASE_URL}/subtitles?tmdb_id=${tmdbId}&languages=ckb,en&type=${apiType}`, { headers });
    
    if (!response.ok) {
        console.warn('OpenSubtitles API search failed with status:', response.status);
        return [];
    }

    const data = await response.json();
    if (!data.data || data.data.length === 0) {
      return [];
    }

    const subtitles: SubtitleFile[] = data.data
      .filter((item: any) => item.attributes.language === 'ckb' || item.attributes.language === 'en')
      .map((item: any) => ({
        language: item.attributes.language === 'ckb' ? 'Kurdish' : 'English',
        language_code: item.attributes.language,
        file_id: item.attributes.files[0].file_id,
      }));
    
    // Deduplicate to ensure only one of each language is returned (prioritizing the first result)
    const uniqueSubtitles = Array.from(new Map(subtitles.map(item => [item.language, item])).values());
    
    return uniqueSubtitles;
  } catch (error) {
    console.error('Error searching for subtitles:', error);
    return [];
  }
};

// Function to get the subtitle content from a file ID
export const getSubtitleContent = async (fileId: number): Promise<string | null> => {
  const headers = {
    'Api-Key': OPENSUBTITLES_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'FLKRD_Streaming_App_v1.0.0',
  };

  try {
    // First, get the download link
    const downloadResponse = await fetch(`${API_BASE_URL}/download`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ file_id: fileId }),
    });

    if (!downloadResponse.ok) {
        console.error('OpenSubtitles download link request failed:', downloadResponse.status);
        return null;
    }

    const downloadData = await downloadResponse.json();
    const subtitleUrl = downloadData.link;

    if (!subtitleUrl) {
        return null;
    }

    // Then, fetch the subtitle content from the link via a CORS proxy
    const proxyUrl = 'https://corsproxy.io/?';
    const contentResponse = await fetch(`${proxyUrl}${subtitleUrl}`);
    if (!contentResponse.ok) {
        console.error('Failed to fetch subtitle content from URL:', contentResponse.status);
        return null;
    }
    
    return await contentResponse.text();

  } catch (error) {
    console.error('Error getting subtitle content:', error);
    throw new Error('Failed to fetch subtitle content.');
  }
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