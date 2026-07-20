import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../contexts/PlayerContext";
import UniversalVideoPlayer from "./UniversalVideoPlayer";
import PremiumVidLinkPlayer from "./PremiumVidLinkPlayer";
import { Minus, Plus, Maximize2, X, Play, Pause } from "lucide-react";
import { cn } from "../lib/utils";
import { useTranslation } from "../contexts/LanguageContext";

const EQ_BARS = [0, 1, 2, 3];
const EQ_KEYFRAMES =
  "@keyframes vengeance-eq{0%,100%{transform:scaleY(0.28)}50%{transform:scaleY(1)}}";

export const FloatingPipPlayer: React.FC = () => {
  const { activeVideo, isPipActive, setIsPipActive, pipTime, setPipTime, isPaused, setIsPaused } = usePlayer();
  const [collapsed, setCollapsed] = useState(false);
  const [duration, setDuration] = useState(7200); // Default fallback 2 hours
  const navigate = useNavigate();
  const { language } = useTranslation();

  // Clean up if activeVideo is missing
  if (!isPipActive || !activeVideo) return null;

  const handleMaximize = () => {
    setIsPipActive(false);
    const detailPath = activeVideo.type === "dubbed"
      ? `/dubbed-details/${activeVideo.tmdbId}`
      : `/details/${activeVideo.type}/${activeVideo.tmdbId}`;
    
    navigate(detailPath, { state: { initialProgress: pipTime } });
  };

  const handleClose = () => {
    setIsPipActive(false);
  };

  const togglePlay = () => {
    setIsPaused(!isPaused);
  };

  const progress = duration > 0 ? (pipTime / duration) * 100 : 0;
  const accent = activeVideo.accentColor ?? "#e50914";

  // Listen to duration updates from sub-players
  const handleProgressUpdate = (data: { currentTime: number; duration?: number }) => {
    setPipTime(data.currentTime);
    if (data.duration && data.duration > 0) {
      setDuration(data.duration);
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-24 z-[999] select-none text-white transition-[width] duration-700 ease-out",
        (language === "ku" || language === "badini") ? "left-8" : "right-8",
        collapsed ? "w-[188px]" : "w-[min(420px,90vw)]"
      )}
      dir="ltr"
    >
      <style>{EQ_KEYFRAMES}</style>

      {/* Collapse / expand toggle button */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand player" : "Collapse player"}
        className="absolute -right-2 -top-4 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/60 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
      >
        {collapsed ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
      </button>

      {/* Floating Artwork / Video Preview Box */}
      <div 
        className={cn(
          "absolute -top-5 left-2 z-20 rounded-xl overflow-hidden shadow-2xl transition-all duration-700",
          collapsed 
            ? "h-14 w-14 ring-1 ring-white/10" 
            : "h-20 w-[120px] ring-2 ring-white/20 bg-black"
        )}
      >
        {/* Real Video Player element (kept mounted but hidden when collapsed to keep audio streaming) */}
        <div 
          className={cn(
            "w-full h-full relative transition-all duration-500",
            collapsed ? "w-[1px] h-[1px] opacity-0 pointer-events-none" : "opacity-100"
          )}
        >
          {activeVideo.activeSource === "FLKRD SERVER 2" ? (
            <PremiumVidLinkPlayer
              tmdbId={activeVideo.tmdbId}
              type={activeVideo.type as any}
              title={activeVideo.title}
              initialProgress={pipTime}
              accentColor={activeVideo.accentColor}
              subtitleUrl={activeVideo.subtitleUrl}
              imdbId={activeVideo.imdbId}
              onProgress={handleProgressUpdate}
              activeSource={activeVideo.activeSource}
              sources={activeVideo.sources}
              isPip={true}
            />
          ) : (
            <UniversalVideoPlayer
              src={activeVideo.src || ""}
              accentColor={activeVideo.accentColor}
              tmdbId={activeVideo.tmdbId}
              imdbId={activeVideo.imdbId}
              contentType={activeVideo.type === "tv" ? "tv" : "movie"}
              title={activeVideo.title}
              subtitleUrl={activeVideo.subtitleUrl}
              onProgress={handleProgressUpdate}
              activeSource={activeVideo.activeSource}
              sources={activeVideo.sources}
              isPip={true}
            />
          )}
        </div>

        {/* Poster fallback overlay when collapsed */}
        {collapsed && activeVideo.backdropPath && (
          <img
            src={`https://image.tmdb.org/t/p/w185${activeVideo.backdropPath}`}
            alt=""
            className="w-full h-full object-cover cursor-pointer"
            onClick={handleMaximize}
          />
        )}
      </div>

      {/* Main Glassmorphic Player Bar (Azuki VengenceUI style) */}
      <div 
        className={cn(
          "relative flex h-[70px] items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl transition-all duration-700",
          collapsed ? "pl-20 pr-3" : "pl-[142px] pr-4"
        )}
      >
        {/* Equalizer */}
        <div className="flex h-6 shrink-0 items-end gap-[3.5px] mb-1" aria-hidden="true">
          {EQ_BARS.map((bar) => (
            <span
              key={bar}
              className="block w-[2.5px] rounded-full"
              style={{
                height: "100%",
                background: accent,
                transformOrigin: "bottom",
                animation: `vengeance-eq ${0.9 + bar * 0.18}s ease-in-out infinite`,
                animationPlayState: !isPaused ? "running" : "paused",
                transform: !isPaused ? undefined : "scaleY(0.28)",
              }}
            />
          ))}
        </div>

        {/* Track info + controls, hidden while collapsed */}
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 transition-opacity duration-300",
            collapsed ? "pointer-events-none opacity-0" : "opacity-100"
          )}
          style={{ transitionDelay: collapsed ? "0s" : "0.35s" }}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold uppercase tracking-wide">
              {activeVideo.title}
            </div>
            <div className="truncate text-[8px] uppercase tracking-[0.2em] text-white/50">
              {activeVideo.activeSource}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={!isPaused ? "Pause" : "Play"}
              className="rounded-full p-1.5 opacity-90 transition hover:bg-white/10 hover:opacity-100 cursor-pointer"
            >
              {!isPaused ? (
                <Pause className="h-4.5 w-4.5 fill-current" />
              ) : (
                <Play className="h-4.5 w-4.5 fill-current" />
              )}
            </button>
            
            {/* Maximize to full detail player */}
            <button
              type="button"
              onClick={handleMaximize}
              aria-label="Maximize player"
              className="rounded-full p-1.5 opacity-80 transition hover:bg-white/10 hover:opacity-100 cursor-pointer"
            >
              <Maximize2 className="h-4 w-4" />
            </button>

            {/* Close PiP */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close player"
              className="rounded-full p-1.5 opacity-80 transition hover:bg-white/10 hover:opacity-100 cursor-pointer text-red-500/80 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Compact metadata when collapsed */}
        {collapsed && (
          <div 
            className="flex-1 min-w-0 flex flex-col justify-center cursor-pointer"
            onClick={handleMaximize}
          >
            <span className="truncate text-[10px] font-black uppercase tracking-wider">
              {activeVideo.title}
            </span>
            <span className="text-[6px] font-black uppercase tracking-widest text-red-500 animate-pulse">
              PIP ACTIVE
            </span>
          </div>
        )}

        {/* Seekable progress bar along bottom edge */}
        {!collapsed && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/5">
            <div
              className="h-full transition-[width] duration-100 ease-linear"
              style={{ width: `${progress}%`, background: accent }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingPipPlayer;
