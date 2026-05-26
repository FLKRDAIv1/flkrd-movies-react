import React, { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { WatchProgress } from '../types';

interface UseWatchProgressProps {
  movieId: string | number;
  movieType: 'movie' | 'tv' | 'dubbed';
  videoRef: React.RefObject<HTMLVideoElement | null>;
  title?: string;
  posterPath?: string;
  backdropPath?: string;
  voteAverage?: number;
}

export const useWatchProgress = ({
  movieId,
  movieType,
  videoRef,
  title = '',
  posterPath = '',
  backdropPath = '',
  voteAverage = 0,
}: UseWatchProgressProps) => {
  const stringId = String(movieId).replace('custom_', '');
  const lastSavedTimeRef = useRef<number>(0);
  const progressRef = useRef<{ currentTime: number; duration: number }>({ currentTime: 0, duration: 0 });
  const isLoadedRef = useRef<boolean>(false);

  // Keep references updated for the latest state inside async/unmount callbacks
  useEffect(() => {
    progressRef.current = { currentTime: 0, duration: 0 };
    isLoadedRef.current = false;
    lastSavedTimeRef.current = 0;
  }, [movieId, movieType]);

  // Helper to update localStorage and sync watch history globally in client-side tabs
  const syncToLocalStorage = useCallback((time: number, duration: number) => {
    try {
      const progressData = localStorage.getItem('watchProgress');
      let progressList: WatchProgress[] = progressData ? JSON.parse(progressData) : [];

      const index = progressList.findIndex(
        (i) => String(i.id).replace('custom_', '') === stringId && i.type === movieType
      );

      const isCompleted = duration > 0 && time / duration >= 0.95;
      const finalProgress = isCompleted ? 0 : time;

      const progressItem: WatchProgress = {
        id: Number(stringId) || 0,
        type: movieType,
        title,
        poster_path: posterPath,
        backdrop_path: backdropPath,
        vote_average: voteAverage,
        progress: finalProgress,
        duration: duration || 7200,
        lastWatched: Date.now(),
      };

      if (index > -1) {
        progressList[index] = progressItem;
      } else {
        progressList.push(progressItem);
      }

      localStorage.setItem('watchProgress', JSON.stringify(progressList));
      window.dispatchEvent(new Event('watchProgressUpdated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.warn("[WatchProgress LocalSync] Cache failed:", err);
    }
  }, [stringId, movieType, title, posterPath, backdropPath, voteAverage]);

  // Core API saving function to database (Supabase)
  const saveProgressToDatabase = useCallback(async (time: number, duration: number) => {
    try {
      // 1. Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return; // Silent return for unauthenticated users

      const isCompleted = duration > 0 && time / duration >= 0.95;
      const finalProgress = isCompleted ? 0 : time;

      // 2. Perform UPSERT to write progress or update existing
      const { error } = await supabase
        .from('user_watch_progress')
        .upsert(
          {
            user_id: user.id,
            movie_id: stringId,
            movie_type: movieType,
            progress_seconds: finalProgress,
            total_duration: duration,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,movie_id,movie_type' }
        );

      if (error) throw error;
      
      console.log(`[WatchProgress SupabaseSync] Synchronized ${stringId} at ${Math.floor(finalProgress)}s`);
    } catch (err) {
      console.error("[WatchProgress SupabaseSync] Registry failed:", err);
    }
  }, [stringId, movieType]);

  // Load progress from Supabase (or fallback to localStorage)
  const loadProgress = useCallback(async () => {
    if (isLoadedRef.current || !videoRef.current) return;
    isLoadedRef.current = true;

    let savedSeconds = 0;
    let duration = 0;

    try {
      // 1. Retrieve current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 2. Query Supabase progress
        const { data, error } = await supabase
          .from('user_watch_progress')
          .select('progress_seconds, total_duration')
          .eq('user_id', user.id)
          .eq('movie_id', stringId)
          .eq('movie_type', movieType)
          .maybeSingle();

        if (!error && data) {
          savedSeconds = data.progress_seconds || 0;
          duration = data.total_duration || 0;
        }
      }

      // 3. LocalStorage Fallback (if Supabase is null or offline/unauthenticated)
      if (savedSeconds === 0) {
        const progressData = localStorage.getItem('watchProgress');
        if (progressData) {
          const progressList: WatchProgress[] = JSON.parse(progressData);
          const saved = progressList.find(
            (p) => String(p.id).replace('custom_', '') === stringId && p.type === movieType
          );
          if (saved) {
            savedSeconds = saved.progress || 0;
            duration = saved.duration || 0;
          }
        }
      }

      // 4. Instantly set video progress if valid and above threshold
      if (savedSeconds > 10 && videoRef.current) {
        videoRef.current.currentTime = savedSeconds;
        console.log(`[WatchProgress Loader] Resumed playback for ${stringId} at ${savedSeconds}s`);
      }
      
      progressRef.current = { currentTime: savedSeconds, duration };
    } catch (err) {
      console.error("[WatchProgress Loader] Setup failed:", err);
    }
  }, [stringId, movieType, videoRef]);

  // Handle updates during playback (throttled every 10 seconds or force saved)
  const handleProgressUpdate = useCallback((time: number, totalDuration: number, forceSave = false) => {
    if (time <= 0 || totalDuration <= 0) return;

    progressRef.current = { currentTime: time, duration: totalDuration };

    // Always synchronize client-side local cache instantly for smooth active UI updates
    syncToLocalStorage(time, totalDuration);

    const now = Date.now();
    const timeSinceLastSave = now - lastSavedTimeRef.current;

    // Supabase throttle rule: every 10s (10000ms), OR when forced (e.g. pause,ended)
    if (forceSave || timeSinceLastSave >= 10000) {
      lastSavedTimeRef.current = now;
      saveProgressToDatabase(time, totalDuration);
    }
  }, [syncToLocalStorage, saveProgressToDatabase]);

  // Listen to time updates and unmounts
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      handleProgressUpdate(video.currentTime, video.duration, false);
    };

    const onPause = () => {
      // Force database synchronization on pause
      handleProgressUpdate(video.currentTime, video.duration, true);
    };

    const onEnded = () => {
      // Completed threshold will be triggered inside progress handlers
      handleProgressUpdate(video.currentTime, video.duration, true);
    };

    // Load initial progress on mount
    loadProgress();

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);

      // Unmount logic: Force sync using refs to obtain exact latest coordinates
      const { currentTime, duration } = progressRef.current;
      if (currentTime > 10 && duration > 0) {
        const syncUnmount = async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const isCompleted = duration > 0 && currentTime / duration >= 0.95;
              const finalProgress = isCompleted ? 0 : currentTime;

              const { error } = await supabase
                .from('user_watch_progress')
                .upsert(
                  {
                    user_id: user.id,
                    movie_id: stringId,
                    movie_type: movieType,
                    progress_seconds: finalProgress,
                    total_duration: duration,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: 'user_id,movie_id,movie_type' }
                );
              if (error) throw error;
              console.log(`[WatchProgress Unmount] Synced ${stringId} at ${Math.floor(finalProgress)}s`);
            }
          } catch (e) {
            console.warn("[WatchProgress Unmount] Save failed:", e);
          }
        };
        syncUnmount();
      }
    };
  }, [movieId, movieType, videoRef, loadProgress, handleProgressUpdate, stringId]);

  return {
    loadProgress,
    saveProgress: (time: number, duration: number, force = true) => handleProgressUpdate(time, duration, force),
  };
};
