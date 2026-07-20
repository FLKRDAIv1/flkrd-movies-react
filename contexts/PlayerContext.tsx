import React, { createContext, useContext, useState } from "react";

export interface ActiveVideo {
  tmdbId: string;
  type: "movie" | "tv" | "dubbed";
  title: string;
  activeSource: string;
  subtitleUrl?: string;
  imdbId?: string;
  season?: number;
  episode?: number;
  currentTime?: number;
  sources?: any[];
  src?: string;
  backdropPath?: string;
  accentColor?: string;
}

interface PlayerContextType {
  activeVideo: ActiveVideo | null;
  setActiveVideo: (video: ActiveVideo | null) => void;
  isPipActive: boolean;
  setIsPipActive: (active: boolean) => void;
  pipTime: number;
  setPipTime: (time: number) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeVideo, setActiveVideo] = useState<ActiveVideo | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const [pipTime, setPipTime] = useState(0);
  const [isPaused, setIsPaused] = useState(true);

  return (
    <PlayerContext.Provider
      value={{
        activeVideo,
        setActiveVideo,
        isPipActive,
        setIsPipActive,
        pipTime,
        setPipTime,
        isPaused,
        setIsPaused,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};
