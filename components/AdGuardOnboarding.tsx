import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Download, CheckCircle, ArrowRight, X, Sparkles, Zap, ShieldCheck } from 'lucide-react';

interface AdGuardOnboardingProps {
  onComplete: () => void;
  accentColor?: string;
}

const AdGuardOnboarding: React.FC<AdGuardOnboardingProps> = ({ onComplete, accentColor = '#e50914' }) => {
  const [step, setStep] = useState(0);
  
  const steps = [
    {
      title: "ئەزموونی بێ ڕیکلام",
      subtitle: "بۆ بینینی فیلمەکان بەبێ بێزارکردنی ڕیکلام و خاوکردنەوەی ئینتەرنێت، پێویستە AdGuard چالاک بکەیت.",
      icon: <Shield size={64} className="text-blue-500" />,
      button: "دەستپێکردن",
      color: "from-blue-600 to-indigo-600"
    },
    {
      title: "هەنگاوی یەکەم: داگرتن",
      subtitle: "ئەپی AdGuard دابەزێنە بۆ مۆبایلەکەت بۆ ئەوەی هەموو ڕیکلام و لینکە بێزارکەرەکان بلۆک بکات.",
      icon: <Download size={64} className="text-green-500" />,
      button: "داگرتنی ئەپ",
      link: "https://adguard.com/download.html?auto=1&_plc=en",
      color: "from-green-600 to-emerald-600"
    },
    {
      title: "هەنگاوی دووەم: نوێکردنەوە",
      subtitle: "هەمیشە ئەپەکەت نوێ بکەرەوە بۆ ئەوەی نوێترین فلتەرەکانی بلۆککردن چالاک بن و خێرایی ئینتەرنێتت جێگیر بێت.",
      icon: <Zap size={64} className="text-yellow-500" />,
      button: "نوێکردنەوەی ئەپ",
      link: "https://adguard.com/download.html?auto=1&_plc=en",
      color: "from-yellow-600 to-orange-600"
    },
    {
      title: "هەنگاوی سێیەم: چالاککردن",
      subtitle: "پارێزەری AdGuard چالاک بکە و چێژ لە بینینی فیلمەکان وەربگرە بە بێ ڕیکلام.",
      icon: <ShieldCheck size={64} className="text-emerald-500" />,
      button: "تێگەیشتم",
      color: "from-emerald-600 to-teal-600"
    }
  ];

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-3xl overflow-hidden"
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-1/4 -left-1/4 w-[80%] h-[80%] rounded-full blur-[120px]"
          style={{ background: `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)` }}
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-1/4 -right-1/4 w-[80%] h-[80%] rounded-full blur-[120px]"
          style={{ background: `radial-gradient(circle, #3b82f633 0%, transparent 70%)` }}
        />
      </div>

      <div className="relative w-full max-w-lg p-8 mx-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: 50, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -50, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Morphing Background Effect */}
            <motion.div 
              className={`absolute inset-0 bg-gradient-to-br ${steps[step].color} opacity-5 -z-10`}
              layoutId="morph-bg"
            />

            <motion.div 
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              className="mb-8 p-6 rounded-3xl bg-white/5 border border-white/10 shadow-inner"
            >
              {steps[step].icon}
            </motion.div>

            <motion.h2 
              className="text-3xl md:text-4xl font-black mb-4 text-white uppercase italic tracking-tighter"
              style={{ textShadow: '0 0 20px rgba(255,255,255,0.2)' }}
            >
              {steps[step].title}
            </motion.h2>

            <motion.p className="text-lg text-gray-300 leading-relaxed mb-10 font-bold max-w-sm">
              {steps[step].subtitle}
            </motion.p>

            <div className="flex flex-col w-full gap-4">
              {steps[step].link ? (
                <motion.a
                  href={steps[step].link}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05, boxShadow: "0 0 30px " + accentColor + "66" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStep(step + 1)}
                  className="w-full py-5 px-8 rounded-2xl font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 transition-all no-underline"
                  style={{ backgroundColor: accentColor, color: '#fff' }}
                >
                  {steps[step].button}
                  <ArrowRight size={20} />
                </motion.a>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 0 30px " + accentColor + "66" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={nextStep}
                  className="w-full py-5 px-8 rounded-2xl font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
                  style={{ backgroundColor: accentColor, color: '#fff' }}
                >
                  {steps[step].button}
                  <ArrowRight size={20} />
                </motion.button>
              )}
              
              <button 
                onClick={onComplete}
                className="text-gray-500 hover:text-white transition-colors text-xs font-black uppercase tracking-[0.3em] mt-4 flex items-center justify-center gap-2"
              >
                <X size={14} />
                داخستنی ڕێبەر
              </button>
            </div>

            {/* Step Indicators */}
            <div className="flex gap-2 mt-10">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-white' : 'w-2 bg-white/20'}`} 
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Sparkles for Premium Look */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              y: [0, -100],
              x: [0, (i % 2 === 0 ? 50 : -50)]
            }}
            transition={{ 
              duration: 2 + Math.random() * 3, 
              repeat: Infinity, 
              delay: Math.random() * 5 
            }}
            className="absolute"
            style={{ 
              left: `${Math.random() * 100}%`, 
              top: `${Math.random() * 100}%` 
            }}
          >
            <Sparkles size={Math.random() * 20} className="text-white/20" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default AdGuardOnboarding;
