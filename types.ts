
export interface Video {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
}

export interface Content {
  id: number;
  title: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: 'movie' | 'tv';
  genres?: { id: number; name:string }[];
  seasons?: Season[];
  adult?: boolean;
  genre_ids?: number[];
  production_companies?: { id: number; name: string; logo_path: string | null; origin_country: string }[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  videos?: { results: Video[] };
  runtime?: number;
}

export interface Season {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
}

export interface Episode {
    id: number;
    name: string;
    overview: string;
    still_path: string | null;
    episode_number: number;
    season_number: number;
    vote_average: number;
}

export interface SeasonDetails extends Season {
    episodes: Episode[];
}

export interface WatchProgress {
  id: number;
  type: 'movie' | 'tv' | 'dubbed';
  title: string;
  poster_path: string;
  progress: number;
  duration: number;
  lastWatched: number;
  season?: number;
  episode?: number;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface Credits {
  cast: CastMember[];
}

export interface MyListItem {
  id: number;
  media_type: 'movie' | 'tv';
  title: string;
  name?: string;
  poster_path: string;
}

export interface Studio {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface SubtitleFile {
    language: string;
    language_code: string;
    file_id: number;
}

export interface SubtitleLine {
    id: number;
    startTime: string;
    endTime: string;
    text: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface PlayerSource {
  name: string;
  score: number;
}
