import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Subtitles } from 'lucide-react';
import { ccDetectionService } from '../services/ccDetectionService';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';

interface KurdishCCBadgeProps {
    tmdbId?: number;
    type?: 'movie' | 'tv';
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const KurdishCCBadge: React.FC<KurdishCCBadgeProps> = React.memo(({ tmdbId, type = 'movie', className = '' }) => {
    const [hasCC, setHasCC] = useState<boolean | null>(null);
    const { language } = useTranslation();
    const { translatedMovieIds = new Set() } = useUI();

    const isCustomTranslated = tmdbId ? translatedMovieIds.has(String(tmdbId)) : false;

    useEffect(() => {
        if (!tmdbId) {
            setHasCC(true);
            return;
        }
        if (isCustomTranslated) {
            setHasCC(true);
            return;
        }

        let isMounted = true;
        ccDetectionService.checkKurdishCC(tmdbId, type).then(result => {
            if (isMounted) setHasCC(result);
        });

        return () => { isMounted = false; };
    }, [tmdbId, type, isCustomTranslated]);

    if (!hasCC && !isCustomTranslated) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={className || "inline-flex pointer-events-none"}
            >
                <div className={`flex items-center gap-1 px-2 py-0.5 md:px-2.5 md:py-1 backdrop-blur-md rounded-lg border shadow-md ${
                    isCustomTranslated 
                        ? 'bg-gradient-to-r from-red-600/90 to-rose-600/90 border-red-500/50'
                        : 'bg-red-600/90 border-red-500/40 text-white'
                }`}>
                    <Subtitles size={10} className="text-white" />
                    <span className="text-[7.5px] md:text-[9px] font-black text-white uppercase tracking-wider leading-none">
                        {(language === 'ku' || language === 'badini') ? 'ژێرنووس' : 'Kurdish Sub'}
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
});

export default KurdishCCBadge;
