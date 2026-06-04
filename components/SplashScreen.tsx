import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [progress, setProgress] = useState(0);
  const [displayedText1, setDisplayedText1] = useState('');
  const [displayedText2, setDisplayedText2] = useState('');

  // 1. Detect screen size (PC & iPad vs Mobile)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Typing animation effect
  useEffect(() => {
    const text1 = "Created by Zana Faroq";
    const text2 = "دروستکراوە لەلایەن زانا فارۆق";
    let idx1 = 0;
    let idx2 = 0;
    let timer1: number;
    let timer2: number;

    timer1 = window.setInterval(() => {
      if (idx1 < text1.length) {
        setDisplayedText1(text1.substring(0, idx1 + 1));
        idx1++;
      } else {
        clearInterval(timer1);
        timer2 = window.setInterval(() => {
          if (idx2 < text2.length) {
            setDisplayedText2(text2.substring(0, idx2 + 1));
            idx2++;
          } else {
            clearInterval(timer2);
          }
        }, 60);
      }
    }, 60);

    return () => {
      clearInterval(timer1);
      if (timer2) clearInterval(timer2);
    };
  }, []);

  // 3. Smooth progress bar loading (0% to 100% over 6 seconds)
  useEffect(() => {
    const duration = 6500; // 6.5 seconds total loading time
    const intervalTime = 50;
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + step;
      });
    }, intervalTime);

    const completeTimeout = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearInterval(timer);
      clearTimeout(completeTimeout);
    };
  }, [onComplete]);

  // Use the Vimeo video IDs (1143775404 for Desktop/iPad, 1143775443 for Mobile)
  const videoId = isMobile ? '1143775443' : '1143775404';

  const handleSkip = () => {
    onComplete?.();
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] bg-black overflow-hidden flex flex-col justify-end select-none cursor-pointer"
      onClick={handleSkip}
    >
      {/* Cinematic Background Video Container */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-10 flex items-center justify-center overflow-hidden bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&loop=1&muted=1&controls=0&background=1&quality=1080p`}
          className="w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] object-cover scale-110"
          frameBorder="0"
          allow="autoplay; fullscreen"
          title="Splash Video"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) scale(1.15)',
            pointerEvents: 'none',
            border: 'none',
          }}
        />
      </div>

      {/* Radial overlay to block clicks on vimeo & add dark cinema atmosphere */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black via-black/30 to-black/80 pointer-events-none" />
      <div className="absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.85)_100%)] pointer-events-none" />

      {/* Interactive Skip/Tap overlay */}
      <div className="absolute inset-0 z-30 bg-transparent cursor-pointer" />

      {/* Top Brand Accent */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none opacity-80">
        <span className="text-[10px] font-black tracking-[0.6em] text-red-600 uppercase">FLKRD</span>
      </div>

      {/* Bottom Content Area: Typing Text and Progress Bar */}
      <div className="relative z-40 p-8 sm:p-16 flex flex-col gap-6 max-w-xl self-start pointer-events-none">
        
        {/* Typing text container */}
        <div className="flex flex-col gap-2 min-h-[50px]">
          <div className="h-6 flex items-center">
            <span className="text-white font-mono text-sm sm:text-base font-black tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {displayedText1}
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-0.5 h-4 ml-1 bg-red-600 align-middle"
              />
            </span>
          </div>
          <div className="h-6 flex items-center" dir="rtl">
            <span className="text-zinc-300 font-mono text-xs sm:text-sm font-bold tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {displayedText2}
            </span>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="flex flex-col gap-2">
          <div className="w-64 sm:w-80 h-1 bg-zinc-950/80 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm shadow-2xl">
            <motion.div
              className="h-full bg-gradient-to-r from-red-600 to-amber-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
          <div className="flex justify-between w-64 sm:w-80 text-[8px] font-black tracking-widest text-zinc-500 uppercase">
            <span>{Math.round(progress)}%</span>
            <span>CINEMA SYSTEM</span>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default SplashScreen;
