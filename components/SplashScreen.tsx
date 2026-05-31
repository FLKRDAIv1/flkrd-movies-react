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
      // Always start muted to guarantee 100% instant, stutter-free GPU-accelerated autoplay across all devices (macOS, iOS, Android)
      video.muted = true;
      setIsMuted(true);
      video.play()
        .then(() => {
          console.log("[SPLASH VIDEO] Instant GPU-accelerated autoplay started successfully.");
        })
        .catch(err => {
          console.error("[SPLASH VIDEO] Autoplay request failed/blocked:", err);
          console.log("[SPLASH VIDEO] Autoplay failed/blocked. Bypassing splash screen instantly to open app...");
          onComplete?.();
        });
    }
  }, [onComplete]);

  useEffect(() => {
    // Unconditional mount-level safety fallback timer of 8.5 seconds (video is 8 seconds)
    // This guarantees that even if the video element stalls, fails, is blocked, or metadata events don't fire,
    // the splash screen WILL transition to the main app!
    const mountTimer = setTimeout(() => {
      console.log("[SPLASH VIDEO] Unconditional mount-level safety timeout reached. Transitioning to app...");
      onComplete?.();
    }, 8500);

    return () => clearTimeout(mountTimer);
  }, [onComplete]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoDuration = e.currentTarget.duration;
    // Calculate fallback safety timer based on actual video duration + 50ms buffer to prevent hangs
    const fallbackTime = (videoDuration && !isNaN(videoDuration)) 
      ? videoDuration * 1000 + 50 
      : 4000; // 4 seconds default safety fallback

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

  // Instantly skip/complete splash screen and open the app when the user clicks or taps anywhere
  const handleInteraction = () => {
    console.log("[SPLASH VIDEO] User interacted. Instantly opening/transitioning to main app...");
    onComplete?.();
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
        muted
        playsInline
        webkitPlaysInline={true}
        preload="auto"
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
