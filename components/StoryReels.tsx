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

      let resolvedStories = (await Promise.all(storiesPromises)).filter(Boolean) as UserStory[];
      if (resolvedStories.length === 0) {
        resolvedStories = [
          {
            username: "Moana 2",
            avatar: "https://image.tmdb.org/t/p/w200/hSu87w3LOq2m4Z6gOSnOA4q5JcR.jpg",
            timestamp: new Date().toISOString(),
            stories: [{ id: "moana-2-trailer", type: 'youtube', src: "hSu87w3LOq2m" }]
          },
          {
            username: "Oppenheimer",
            avatar: "https://image.tmdb.org/t/p/w200/8Gxv2wY4n0k3rkjQ45jK2jK2jK2.jpg",
            timestamp: new Date().toISOString(),
            stories: [{ id: "oppenheimer-trailer", type: 'youtube', src: "uYPbbESgTOg" }]
          },
          {
            username: "Wednesday",
            avatar: "https://image.tmdb.org/t/p/w200/9PF4gdNx448nLV4eyoZ7jPGcm4l.jpg",
            timestamp: new Date().toISOString(),
            stories: [{ id: "wednesday-trailer", type: 'youtube', src: "Di310WS8zLk" }]
          },
          {
            username: "Avatar: Way of Water",
            avatar: "https://image.tmdb.org/t/p/w200/t6z8hp702rmre6t748C4X9tZ14.jpg",
            timestamp: new Date().toISOString(),
            stories: [{ id: "avatar-trailer", type: 'youtube', src: "d9MyW72HcF0" }]
          },
          {
            username: "Dune: Part Two",
            avatar: "https://image.tmdb.org/t/p/w200/czemb6f1a8S6jQjZaVAsHGzHlQI.jpg",
            timestamp: new Date().toISOString(),
            stories: [{ id: "dune-trailer", type: 'youtube', src: "Way9Dexny3w" }]
          }
        ] as any[];
      }
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
        : "flex gap-4 md:gap-6 overflow-x-auto pb-4 px-4 md:px-6 lg:px-8 max-w-[1920px] mx-auto scrollbar-hide snap-x"
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
