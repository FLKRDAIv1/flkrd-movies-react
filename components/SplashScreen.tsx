import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VolumeX } from 'lucide-react';

interface SplashScreenProps {
  onComplete?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // 1. Attempt to play UNMUTED first (full audio experience on macOS, Android, iOS, etc.)
      video.muted = false;
      video.play()
        .then(() => {
          console.log("[SPLASH VIDEO] Unmuted autoplay succeeded!");
          setIsMuted(false);
        })
        .catch(err => {
          console.warn("[SPLASH VIDEO] Unmuted autoplay blocked by browser policy. Falling back to muted autoplay...", err);
          
          // 2. Muted fallback to guarantee seamless startup on Web (fkurd.vercel.app)
          video.muted = true;
          setIsMuted(true);
          video.play().catch(e => {
            console.error("[SPLASH VIDEO] Muted autoplay also failed:", e);
          });
        });
    }
  }, []);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoDuration = e.currentTarget.duration;
    // Calculate fallback safety timer based on actual video duration + 1.2s buffer
    const fallbackTime = (videoDuration && !isNaN(videoDuration)) 
      ? videoDuration * 1000 + 1200 
      : 6000; // 6 seconds default safety fallback

    console.log(`[SPLASH VIDEO] Video loaded. Duration: ${videoDuration}s. Setting fallback safety timer to: ${fallbackTime / 1000}s`);

    const timer = setTimeout(() => {
      console.log("[SPLASH VIDEO] Fallback safety timeout reached. Transitioning to app...");
      onComplete?.();
    }, fallbackTime);

    // Keep reference to timer to clear it if video finishes naturally
    (e.currentTarget as any)._fallbackTimer = timer;
  };

  const handleComplete = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    // Clear safety timer
    const timer = (e.currentTarget as any)._fallbackTimer;
    if (timer) {
      clearTimeout(timer);
    }
    
    console.log("[SPLASH VIDEO] Video completed playback naturally. Transitioning to app...");
    onComplete?.();
  };

  // Optional: If user clicks or taps the screen, try to unmute immediately (for web/mobile web)
  const handleInteraction = () => {
    const video = videoRef.current;
    if (video && video.muted) {
      video.muted = false;
      video.currentTime = 0; // Rewind to start to hear the full splash audio experience!
      setIsMuted(false);
      console.log("[SPLASH VIDEO] User interacted. Unmuted and rewound splash audio successfully!");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden select-none cursor-pointer"
    >
      <video
        ref={videoRef}
        src="/splash.mp4"
        autoPlay
        playsInline
        controls={false}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleComplete}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#000000'
        }}
      />

      <AnimatePresence>
        {isMuted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-12 z-[10000] flex flex-col items-center gap-2 pointer-events-none"
          >
            <div className="flex items-center gap-3 px-6 py-3.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl animate-bounce">
              <VolumeX className="w-5 h-5 text-[#E50914] animate-pulse" />
              <span className="text-white text-xs font-black uppercase tracking-widest">
                Tap anywhere to unmute sound 🔊
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SplashScreen;
