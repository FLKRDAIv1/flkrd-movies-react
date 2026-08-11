// components/VideoPlayerWithSubtitles.tsx
// React Component rendering Third-Party Iframe with Netflix-Style Subtitle Overlay & Offset Sync Controls

import React, { useState, useEffect } from 'react';
import { Clock, Plus, Minus, RotateCcw, Subtitles } from 'lucide-react';
import { useSubtitles } from '../hooks/useSubtitles';

interface VideoPlayerWithSubtitlesProps {
  iframeSrc: string;
  subtitleUrl?: string;
  title?: string;
}

export const VideoPlayerWithSubtitles: React.FC<VideoPlayerWithSubtitlesProps> = ({
  iframeSrc,
  subtitleUrl,
  title = 'FLKRD Video Stream',
}) => {
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState<number>(0);
  const [showSyncBar, setShowSyncBar] = useState<boolean>(false);

  const {
    cues,
    timeOffsetMs,
    adjustOffset,
    resetOffset,
    getActiveCue,
    loading: subLoading,
    error: subError,
  } = useSubtitles({ subtitleUrl, mediaId: title });

  // Reset progress when iframe source changes
  useEffect(() => {
    setCurrentTimeSeconds(0);
  }, [iframeSrc]);

  // PostMessage Progress Listener with guarded fallback ticker for Third-Party Iframe
  useEffect(() => {
    let hasReceivedPostMessage = false;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && (typeof data.seconds === 'number' || typeof data.currentTime === 'number' || typeof data.time === 'number')) {
          hasReceivedPostMessage = true;
          const time = data.seconds ?? data.currentTime ?? data.time;
          if (typeof time === 'number') {
            setCurrentTimeSeconds(time);
          }
        }
      } catch {
        // Ignore non-JSON postMessage payloads
      }
    };

    window.addEventListener('message', handleMessage);

    // Only run fallback ticker if no postMessage API is available
    const interval = setInterval(() => {
      if (!hasReceivedPostMessage) {
        setCurrentTimeSeconds((prev) => prev + 0.1);
      }
    }, 100);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, [iframeSrc]);

  const activeCue = getActiveCue(currentTimeSeconds);
  const formattedOffset = (timeOffsetMs / 1000).toFixed(1);

  return (
    <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 group select-none">
      {/* 1. Third-Party Embedded Video Iframe */}
      <iframe
        src={iframeSrc}
        title={title}
        className="w-full h-full border-0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />

      {/* 2. Netflix-Style Subtitle Text Overlay */}
      {/* pointer-events-none ensures user clicks/taps pass directly through to iframe video controls */}
      <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 md:p-8">
        {/* Subtitle Active Status Indicator */}
        <div className="flex justify-between items-center w-full">
          {subtitleUrl && (
            <div className="pointer-events-auto flex items-center gap-2 bg-black/80 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-semibold text-white/90 shadow-lg">
              <Subtitles size={14} className="text-red-500 animate-pulse" />
              <span>
                {subLoading
                  ? 'Loading Kurdish CC...'
                  : subError
                  ? 'Subtitle Error'
                  : 'Kurdish Subtitles Active'}
              </span>
            </div>
          )}
        </div>

        {/* Netflix-Style Subtitle Text Box Container */}
        <div className="w-full flex justify-center text-center pb-8 md:pb-12 px-4">
          {activeCue && (
            <div className="max-w-4xl transition-all duration-150 animate-in fade-in zoom-in-95">
              <span
                className="inline-block bg-black/85 text-yellow-300 md:text-white px-5 py-2.5 md:px-8 md:py-3.5 rounded-2xl text-lg sm:text-2xl md:text-3xl font-extrabold tracking-wide drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] border border-white/15 backdrop-blur-md leading-relaxed"
                style={{
                  textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.8)',
                }}
              >
                {activeCue.text}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Subtitle Time Offset Sync Control Bar */}
      {/* Container enables pointer-events-auto so buttons can be clicked */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => setShowSyncBar(!showSyncBar)}
          className="flex items-center gap-1.5 bg-neutral-900/90 hover:bg-neutral-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold border border-white/10 shadow-xl transition-all active:scale-95"
          title="Adjust Subtitle Sync Timing"
        >
          <Clock size={14} className="text-red-500" />
          <span>Sync ({timeOffsetMs > 0 ? `+${formattedOffset}s` : `${formattedOffset}s`})</span>
        </button>

        {showSyncBar && (
          <div className="flex items-center gap-1 bg-neutral-950/95 border border-white/15 backdrop-blur-2xl p-1.5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2">
            <button
              onClick={() => adjustOffset(-500)}
              className="flex items-center gap-1 bg-white/5 hover:bg-white/15 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
              title="Delay subtitles by 0.5s"
            >
              <Minus size={12} />
              0.5s
            </button>

            <span className="text-xs font-mono font-black text-red-500 px-2 min-w-[55px] text-center">
              {timeOffsetMs > 0 ? `+${formattedOffset}s` : `${formattedOffset}s`}
            </span>

            <button
              onClick={() => adjustOffset(500)}
              className="flex items-center gap-1 bg-white/5 hover:bg-white/15 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
              title="Advance subtitles by 0.5s"
            >
              <Plus size={12} />
              0.5s
            </button>

            <button
              onClick={resetOffset}
              className="p-1.5 bg-white/5 hover:bg-red-600/30 text-white/70 hover:text-white rounded-xl transition-all"
              title="Reset subtitle offset to 0s"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayerWithSubtitles;
