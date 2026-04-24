
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const SplashScreen: React.FC = () => {
  const text1 = "Created by Zana Faroq or more";
  const text2 = "درووستکراوە لەلایەن زانا فارۆق";

  const [displayedText1, setDisplayedText1] = useState("");
  const [displayedText2, setDisplayedText2] = useState("");

  useEffect(() => {
    let index1 = 0;
    let index2 = 0;
    let timer1: number;
    let timer2: number;

    // Typing effect for English Text
    timer1 = window.setInterval(() => {
      if (index1 < text1.length) {
        setDisplayedText1(text1.substring(0, index1 + 1));
        index1++;
      } else {
        clearInterval(timer1);

        // Start typing Kurdish Text after English finishes
        timer2 = window.setInterval(() => {
          if (index2 < text2.length) {
            setDisplayedText2(text2.substring(0, index2 + 1));
            index2++;
          } else {
            clearInterval(timer2);
          }
        }, 80);
      }
    }, 80);

    return () => {
      clearInterval(timer1);
      if (timer2) clearInterval(timer2);
    };
  }, []);

  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 bg-black z-[200] overflow-hidden"
    >
      {/* Desktop Video */}
      <div className="hidden md:block absolute inset-0 w-full h-full pointer-events-none">
        <iframe
          src="https://player.vimeo.com/video/1143775404?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&loop=1&muted=1&controls=0"
          className="w-full h-full"
          frameBorder="0"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          title="Desktop Splash Video"
        />
      </div>

      {/* Mobile Video */}
      <div className="block md:hidden absolute inset-0 w-full h-full pointer-events-none">
        <iframe
          src="https://player.vimeo.com/video/1143775443?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&loop=1&muted=1&controls=0"
          className="w-full h-full"
          frameBorder="0"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          title="Mobile Splash Video"
        />
      </div>

      {/* Interaction Blocker Overlay */}
      <div className="absolute inset-0 z-40 bg-transparent cursor-default"></div>

      {/* Bottom Gradient for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-40 pointer-events-none"></div>

      {/* Content Container - Bottom Left */}
      <div className="absolute bottom-8 left-6 sm:left-10 z-50 flex flex-col gap-3">

        {/* Typing Text Container */}
        <div className="flex flex-col gap-1.5">
          <div className="h-6 flex items-center">
            <span className="text-white font-mono text-sm md:text-base font-bold tracking-wider shadow-black drop-shadow-md">
              {displayedText1}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-0.5 h-4 ml-1 bg-red-600 align-middle"
              />
            </span>
          </div>
          <div className="h-6 flex items-center">
            <span className="text-gray-300 font-mono text-xs md:text-sm font-semibold tracking-wide shadow-black drop-shadow-md" dir="rtl">
              {displayedText2}
            </span>
          </div>
        </div>

        {/* Professional Loading Line */}
        <div className="w-56 sm:w-64 h-1 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/10 mt-1">
          <motion.div
            className="h-full bg-gradient-to-r from-red-600 to-red-400"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 8, ease: "linear" }}
          />
        </div>

      </div>
    </motion.div>
  );
};

export default SplashScreen;
