import React, { useEffect, useState } from 'react';
import { StoryViewer, Story } from './ui/story-viewer';
import { fetchData } from '../services/tmdbService';
import { requests, API_KEY, API_BASE_URL, IMAGE_BASE_URL_POSTER } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { Content } from '../types';

interface UserStory {
  username: string;
  avatar: string;
  timestamp: string;
  stories: Story[];
}

interface StoryReelsProps {
  size?: "sm" | "md";
}

// Cache resolved user stories in memory per language to avoid redundant calls on page switches
const cachedUserStories: { [key: string]: UserStory[] } = {};

const StoryReels: React.FC<StoryReelsProps> = ({ size = "md" }) => {
  const [users, setUsers] = useState<UserStory[]>([]);
  const { language } = useTranslation();
  const langCode = (language === 'ku' || language === 'badini') ? 'ku' : 'en-US';

  useEffect(() => {
    if (cachedUserStories[langCode] && cachedUserStories[langCode].length > 0) {
      setUsers(cachedUserStories[langCode]);
      return;
    }

    const loadStories = async () => {
      // 1. Fetch trending movies
      const moviesData = await fetchData(requests.fetchTrendingMoviesDay(langCode), language);
      if (!moviesData) return;

      // Top 8 trending movies
      const topMovies: Content[] = moviesData.slice(0, 8);

      // 2. Fetch trailers for these movies concurrently
      const storiesPromises = topMovies.map(async (movie) => {
        try {
          let videoRes;
          try {
            videoRes = await fetch(`${API_BASE_URL}/movie/${movie.id}/videos?api_key=${API_KEY}`);
            if (!videoRes.ok) {
              // Direct TMDB fallback if local dev proxy reports 502/500/timeout
              videoRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${API_KEY}`);
            }
          } catch (e) {
            // Direct TMDB fallback if local proxy has a network connection failure
            videoRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${API_KEY}`);
          }

          if (!videoRes || !videoRes.ok) return null;
          const videoData = await videoRes.json();
          const trailers = videoData.results?.filter((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
          const trailer = trailers?.[0] || videoData.results?.[0]; // Fallback to any video if no trailer

          if (!trailer || trailer.site !== 'YouTube') return null;

          const posterUrl = movie.poster_path 
            ? `${IMAGE_BASE_URL_POSTER}${movie.poster_path}` 
            : 'https://raw.githubusercontent.com/flkrd/cdn/main/default-poster.webp';

          // Ensure valid format for timestamp (fallback to now if invalid)
          const releaseDate = movie.release_date ? new Date(movie.release_date).toISOString() : new Date().toISOString();

          return {
            username: movie.title || movie.name || 'Unknown',
            avatar: posterUrl,
            timestamp: releaseDate,
            stories: [
              {
                id: `trailer-${movie.id}`,
                type: 'youtube' as const,
                src: trailer.key,
              }
            ]
          } as UserStory;
        } catch (error) {
          console.warn(`Failed to load trailer for movie ${movie.id} in story`, error);
          return null;
        }
      });

      const resolvedStories = (await Promise.all(storiesPromises)).filter(Boolean) as UserStory[];
      cachedUserStories[langCode] = resolvedStories;
      setUsers(resolvedStories);
    };

    loadStories();
  }, [langCode, language]);

  if (users.length === 0) return null;

  return (
    <div className={size === "sm" ? "w-full relative z-30 max-w-[100vw]" : "w-full relative z-30 pt-6 pb-2 max-w-[100vw]"}>
      <div className={size === "sm" 
        ? "flex gap-4 overflow-x-auto py-2 px-4 scrollbar-none" 
        : "flex gap-6 md:gap-8 overflow-x-auto pb-4 px-6 md:px-20 scrollbar-hide snap-x"
      }>
        {users.map((user) => (
          <div key={user.username} className={size === "sm" ? "shrink-0" : "snap-start shrink-0"}>
            <StoryViewer
              stories={user.stories}
              username={user.username}
              avatar={user.avatar}
              timestamp={user.timestamp}
              size={size}
              className="hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoryReels;
