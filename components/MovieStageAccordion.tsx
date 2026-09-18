import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Film, Users, Layers, Mic2, Star, Sparkles, Compass, BookOpen, Clock, Calendar, CheckCircle2, Volume2, Globe, Clapperboard, Award } from 'lucide-react';
import { CardSplitAccordion, CardSplitAccordionItem } from './ui/card-split-accordian';
import { IMAGE_BASE_URL_PROFILE, IMAGE_BASE_URL_POSTER } from '../constants';
import KurdishCCBadge from './KurdishCCBadge';
import ActorInfoModal from './ActorInfoModal';

interface MovieStageAccordionProps {
  item: any;
  cast?: any[];
  similar?: any[];
  onSelectMovie?: (movie: any) => void;
  className?: string;
  isRtl?: boolean;
}

export const MovieStageAccordion: React.FC<MovieStageAccordionProps> = ({
  item,
  cast = [],
  similar = [],
  onSelectMovie,
  className = '',
  isRtl = true,
}) => {
  const [selectedActor, setSelectedActor] = useState<any>(null);

  if (!item) return null;

  const overview = item.overview || item.description || 'هیچ کورتەیەک بۆ ئەم بابەتە بەردەست نییە.';
  const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : '8.5';
  const year = (item.release_date || item.first_air_date || '').split('-')[0] || '2026';
  const runtime = item.runtime ? `${item.runtime} خولەک` : '١٢٠ خولەک';

  // Stage 1: Story & Overview (Apple TV+ Editorial Synopsis)
  const stage1: CardSplitAccordionItem = {
    id: 'stage-story',
    title: 'چیرۆک و پەیامی فیلمەکە',
    subtitle: 'کورتەی سەرەکی و هێڵی چیرۆکی درامی',
    icon: <BookOpen className="size-5 text-brand" />,
    badge: 'چیرۆکی فەرمی',
    content: (
      <div className="space-y-4 pt-1">
        <p className="text-sm md:text-base font-normal text-gray-200 leading-relaxed font-sans text-right tracking-normal opacity-95">
          {overview}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-gray-300 border-t border-white/[0.08] pt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 shadow-sm backdrop-blur-xl">
            <Clock size={14} className="text-brand" />
            <span>ماوەی فیلم: {runtime}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 shadow-sm backdrop-blur-xl">
            <Calendar size={14} className="text-brand" />
            <span>ساڵی بڵاوکردنەوە: {year}</span>
          </div>
          {item.original_language && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 shadow-sm backdrop-blur-xl uppercase">
              <Globe size={14} className="text-brand" />
              <span>زمانی سەرەکی: {item.original_language}</span>
            </div>
          )}
        </div>
      </div>
    ),
  };

  // Stage 2: Cast & Actors (visionOS Squircle Profile Cards with Tactile Feedback)
  const stage2: CardSplitAccordionItem = {
    id: 'stage-cast',
    title: 'ئەکتەران و کارەکتەرە سەرەکییەکان',
    subtitle: 'کلیک بکە بۆ بینینی زانیاریی ورد و کارەکانی ئەکتەرەکە',
    icon: <Users className="size-5 text-blue-400" />,
    badge: `${cast.length > 0 ? cast.length : 8} ئەکتەر`,
    content: (
      <div className="pt-2">
        {cast && cast.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cast.slice(0, 8).map((actor, idx) => {
              const profileImg = actor.profile_path
                ? `${IMAGE_BASE_URL_PROFILE}${actor.profile_path}`
                : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
              return (
                <motion.div
                  key={actor.id || idx}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedActor(actor);
                  }}
                  className="group/actor flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 transition-colors duration-200 cursor-pointer shadow-sm select-none"
                >
                  <img
                    src={profileImg}
                    alt={actor.name}
                    className="w-11 h-11 rounded-xl object-cover border border-white/10 group-hover/actor:border-brand/60 flex-shrink-0 transition-colors shadow-inner"
                    loading="lazy"
                  />
                  <div className="min-w-0 text-right flex-1">
                    <p className="text-xs font-black text-white truncate group-hover/actor:text-brand transition-colors tracking-tight">
                      {actor.name}
                    </p>
                    <p className="text-[10px] font-medium text-white/50 truncate mt-0.5">
                      {actor.character || 'Role'}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-xs font-bold text-gray-400 bg-white/5 rounded-2xl">
            زانیاری ئەکتەرەکان لە هەڵهێنجاندندایە...
          </div>
        )}
      </div>
    ),
  };

  // Stage 3: Genres & IMDb Specs (Apple Glass Badges & Rating Pill)
  const stage3: CardSplitAccordionItem = {
    id: 'stage-specs',
    title: 'ژانەرەکان و هەڵسەنگاندنی IMDb',
    subtitle: 'تایبەتمەندی و پۆلێنکردنە فەرمییەکان',
    icon: <Layers className="size-5 text-yellow-400" />,
    badge: `★ ${rating} IMDb`,
    content: (
      <div className="space-y-4 pt-1">
        <div className="flex flex-wrap gap-2.5">
          {item.genres && item.genres.length > 0 ? (
            item.genres.map((g: any) => (
              <span
                key={g.id || g}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-black text-white/90 shadow-sm backdrop-blur-xl transition-colors tracking-wide"
              >
                {g.name || g}
              </span>
            ))
          ) : (
            <>
              <span className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-black text-white">ئەکشن (Action)</span>
              <span className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-black text-white">دراما (Drama)</span>
              <span className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-black text-white">سەرکێشی (Adventure)</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-yellow-500/[0.08] border border-yellow-500/20 text-yellow-400 text-xs font-black shadow-sm backdrop-blur-xl">
          <Star size={18} className="fill-current text-yellow-400 flex-shrink-0" />
          <span className="tracking-wide">پلەی هەڵسەنگاندن: {rating} لە ۱۰ لەسەر بنەمای هەزاران دەنگدەری نێودەوڵەتی</span>
        </div>
      </div>
    ),
  };

  // Stage 4: Subtitles & Audio Tracks (Apple Verified Streaming Badges)
  const stage4: CardSplitAccordionItem = {
    id: 'stage-audio',
    title: 'ژێرنووس، دۆبلاژ و کوالیتی پەخش',
    subtitle: 'دەنگی کوردی و کوالیتی 4K Ultra HD',
    icon: <Mic2 className="size-5 text-purple-400" />,
    badge: '4K ULTRA HD',
    content: (
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-sm backdrop-blur-xl">
          <KurdishCCBadge size="md" />
          <span className="text-xs font-bold text-gray-200">ژێرنووسی فەرمیی کوردی بە تایبەتمەندی زیرەکی دەستکرد</span>
        </div>
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-sm backdrop-blur-xl">
          <span className="text-xs font-black text-emerald-400 flex items-center gap-2">
            <CheckCircle2 size={16} />
            دەنگی ڕەسەن Dolby 5.1 / Atmos
          </span>
          <span className="text-xs font-bold text-gray-300">کوالیتی 4K / 1080p Web-DL</span>
        </div>
      </div>
    ),
  };

  // Stage 5: Recommendations & Similar Movies (Tactile Media Cards)
  const stage5: CardSplitAccordionItem = {
    id: 'stage-similar',
    title: 'فیلم و زنجیرە هاوشێوەکان',
    subtitle: 'پێشنیارکراو بەپێی حەز و دەستنیشانکردنی تۆ',
    icon: <Compass className="size-5 text-emerald-400" />,
    badge: `${similar.length > 0 ? similar.length : 6} بەرهەم`,
    content: (
      <div className="pt-2">
        {similar && similar.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {similar.slice(0, 6).map((sim, idx) => {
              const poster = sim.poster_path
                ? `${IMAGE_BASE_URL_POSTER}${sim.poster_path}`
                : 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=300&q=80';
              return (
                <motion.div
                  key={sim.id || idx}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  onClick={() => onSelectMovie && onSelectMovie(sim)}
                  className="group/sim cursor-pointer relative rounded-2xl overflow-hidden border border-white/10 hover:border-brand/60 transition-all shadow-md active:scale-95 select-none"
                >
                  <img
                    src={poster}
                    alt={sim.title || sim.name}
                    className="w-full h-32 md:h-36 object-cover group-hover/sim:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-95 p-2 flex flex-col justify-end">
                    <p className="text-[10px] md:text-xs font-black text-white truncate tracking-tight">
                      {sim.title || sim.name}
                    </p>
                    <span className="text-[8px] text-white/60 font-bold">
                      {sim.release_date?.split('-')[0] || sim.first_air_date?.split('-')[0] || 'HD'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-xs font-bold text-gray-400 bg-white/5 rounded-2xl">
            هیچ فیلمێکی هاوشێوە بەردەست نییە.
          </div>
        )}
      </div>
    ),
  };

  const accordionItems = [stage1, stage2, stage3, stage4, stage5];

  return (
    <div className={className}>
      <CardSplitAccordion items={accordionItems} autoHoverOpen={false} />

      <ActorInfoModal
        actorId={selectedActor?.id || null}
        actorName={selectedActor?.name}
        characterName={selectedActor?.character}
        isOpen={!!selectedActor}
        onClose={() => setSelectedActor(null)}
        onSelectMovie={onSelectMovie}
      />
    </div>
  );
};

export default MovieStageAccordion;
