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

const StoryReels: React.FC = () => {
  const [users, setUsers] = useState<UserStory[]>([]);
  const { language } = useTranslation();
  const langCode = language === 'ku' ? 'ku' : 'en-US';

  useEffect(() => {
    const loadStories = async () => {
      // 1. Fetch trending movies
      const moviesData = await fetchData(requests.fetchTrendingMoviesDay(langCode), language);
      if (!moviesData) return;

      // Top 8 trending movies
      const topMovies: Content[] = moviesData.slice(0, 8);

      // 2. Fetch trailers for these movies concurrently
      const storiesPromises = topMovies.map(async (movie) => {
        try {
          const videoRes = await fetch(`${API_BASE_URL}/movie/${movie.id}/videos?api_key=${API_KEY}`);
          if (!videoRes.ok) return null;
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
          console.error("Failed to load trailer for story", error);
          return null;
        }
      });

      const resolvedStories = (await Promise.all(storiesPromises)).filter(Boolean) as UserStory[];
      setUsers(resolvedStories);
    };

    loadStories();
  }, [langCode, language]);

  if (users.length === 0) return null;

  return (
    <div className="w-full relative z-30 pt-6 pb-2 px-4 md:px-8 max-w-[100vw]">
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
        {users.map((user) => (
          <div key={user.username} className="snap-start shrink-0">
            <StoryViewer
              stories={user.stories}
              username={user.username}
              avatar={user.avatar}
              timestamp={user.timestamp}
              className="hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoryReels;
