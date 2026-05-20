import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen: React.FC = () => {
  const [phase, setPhase] = useState<'logo' | 'text' | 'done'>('logo');
  const [progress, setProgress] = useState(0);
  const [displayedTagline, setDisplayedTagline] = useState('');
  const tagline = 'STREAM KURDISH · INTERNATIONAL · CINEMA';

  useEffect(() => {
    // Phase 1: Logo appears (0–800ms)
    // Phase 2: Tagline types in (800–2200ms)
    const textTimer = setTimeout(() => setPhase('text'), 800);

    // Progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(progressInterval); return 100; }
        return prev + 100 / 30; // ~3s to fill
      });
    }, 100);

    return () => {
      clearTimeout(textTimer);
      clearInterval(progressInterval);
    };
  }, []);

  // Typewriter for tagline
  useEffect(() => {
    if (phase !== 'text') return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < tagline.length) {
        setDisplayedTagline(tagline.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#000000' }}
    >
      {/* Ambient glow behind logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.15, scale: 1.4 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #e50914 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Scanline overlay for cinematic effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Main logo container */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        
        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative' }}
        >
          {/* Outer ring pulse */}
          <motion.div
            animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -16,
              borderRadius: '30%',
              border: '1.5px solid rgba(229, 9, 20, 0.5)',
              pointerEvents: 'none',
            }}
          />

          {/* Icon card */}
          <motion.div
            style={{
              width: 110,
              height: 110,
              borderRadius: 26,
              background: 'linear-gradient(135deg, #e50914 0%, #7b0000 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 60px rgba(229, 9, 20, 0.45), 0 20px 60px rgba(0,0,0,0.8)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Shimmer sweep */}
            <motion.div
              initial={{ x: -150 }}
              animate={{ x: 200 }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 80,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                transform: 'skewX(-20deg)',
                pointerEvents: 'none',
              }}
            />
            {/* FLKRD "F" mark */}
            <span style={{
              fontSize: 56,
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: -3,
              lineHeight: 1,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textShadow: '0 2px 12px rgba(0,0,0,0.4)',
              userSelect: 'none',
            }}>
              F
            </span>
          </motion.div>
        </motion.div>

        {/* FLKRD MOVIES wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <span style={{
            fontSize: 32,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: 12,
            textTransform: 'uppercase',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            userSelect: 'none',
          }}>
            FLKRD
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: 6,
            textTransform: 'uppercase',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            userSelect: 'none',
          }}>
            MOVIES
          </span>
        </motion.div>

        {/* Tagline typewriter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'text' ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          style={{
            height: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: 4,
            fontFamily: 'monospace',
            userSelect: 'none',
          }}>
            {displayedTagline}
          </span>
          {phase === 'text' && displayedTagline.length < tagline.length && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              style={{
                display: 'inline-block',
                width: 1,
                height: 10,
                backgroundColor: '#e50914',
              }}
            />
          )}
        </motion.div>
      </div>

      {/* Bottom progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 48,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 200,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 2,
        overflow: 'hidden',
        zIndex: 10,
      }}>
        <motion.div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #e50914, #ff4d4d)',
            borderRadius: 2,
          }}
          transition={{ ease: 'linear' }}
        />
      </div>

      {/* Bottom signature */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        style={{
          position: 'absolute',
          bottom: 20,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: 3,
          fontFamily: 'monospace',
          userSelect: 'none',
        }}>
          CREATED BY ZANA FAROQ
        </span>
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.15)',
          letterSpacing: 2,
          fontFamily: 'monospace',
          userSelect: 'none',
          direction: 'rtl',
        }}>
          درووستکراوە لەلایەن زانا فارۆق
        </span>
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
