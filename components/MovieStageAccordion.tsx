import React, { useState } from 'react';
import { Film, Users, Layers, Mic2, Star, Sparkles, Compass, BookOpen, Clock, Calendar, CheckCircle2, ChevronLeft } from 'lucide-react';
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

  const isCustom = String(item.id).startsWith('custom_');

  // Stage 1: Story & Overview
  const stage1: CardSplitAccordionItem = {
    id: 'stage-story',
    title: 'چیرۆک و پەیامی فیلمەکە',
    subtitle: 'کورتەی سەرەکی و هێڵی چیرۆکی درامی',
    icon: <BookOpen className="size-5 text-brand" />,
    badge: 'چیرۆکی ڕاستەقینە',
    content: (
      <div className="space-y-4 pt-2">
        <p className="text-sm font-bold text-gray-200 leading-relaxed font-sans text-right">
          {overview}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-400 border-t border-white/5 pt-3">
          <span className="flex items-center gap-1.5 text-gray-300">
            <Clock size={14} className="text-brand" />
            ماوەی فیلم: {runtime}
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <Calendar size={14} className="text-brand" />
            ساڵی بڵاوکردنەوە: {year}
          </span>
        </div>
      </div>
    ),
  };

  // Stage 2: Cast & Actors with Click/Touch Interactive Modal Handler
  const stage2: CardSplitAccordionItem = {
    id: 'stage-cast',
    title: 'ئەکتەران و کارەکتەرە سەرەکییەکان',
    subtitle: 'داگرە یان دابگرە بۆ بینیی زانیاریی کامل و فیلمەکان',
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
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedActor(actor);
                  }}
                  className="group/actor flex items-center gap-2.5 p-2 rounded-2xl bg-white/[0.03] hover:bg-brand/15 border border-white/5 hover:border-brand/40 transition-all duration-200 cursor-pointer active:scale-95 transform-gpu"
                >
                  <img
                    src={profileImg}
                    alt={actor.name}
                    className="w-10 h-10 rounded-xl object-cover border border-white/10 group-hover/actor:border-brand flex-shrink-0 transition-colors"
                  />
                  <div className="min-w-0 text-right flex-1">
                    <p className="text-xs font-black text-white truncate group-hover/actor:text-brand transition-colors">
                      {actor.name}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 truncate">
                      {actor.character || 'Character'}
                    </p>
                  </div>
                </div>
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

  // Stage 3: Genres & IMDb Specs
  const stage3: CardSplitAccordionItem = {
    id: 'stage-specs',
    title: 'ژانەرەکان و هەڵسەنگاندنی IMDb',
    subtitle: 'تایبەتمەندی و پۆلێنکردنە فەرمییەکان',
    icon: <Layers className="size-5 text-yellow-400" />,
    badge: `★ ${rating} IMDb`,
    content: (
      <div className="space-y-4 pt-2">
        <div className="flex flex-wrap gap-2">
          {item.genres && item.genres.length > 0 ? (
            item.genres.map((g: any) => (
              <span key={g.id || g} className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-black text-white">
                {g.name || g}
              </span>
            ))
          ) : (
            <>
              <span className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-black text-white">ئەکشن (Action)</span>
              <span className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-black text-white">دراما (Drama)</span>
              <span className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-black text-white">سەرکێشی (Adventure)</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-black">
          <Star size={16} fill="currentColor" />
          <span>پلەی هەڵسەنگاندن: {rating} لە ۱۰ لەسەر بنەمای هەزاران دەنگدەر</span>
        </div>
      </div>
    ),
  };

  // Stage 4: Subtitles & Audio Tracks
  const stage4: CardSplitAccordionItem = {
    id: 'stage-audio',
    title: 'ژێرنووس، دۆبلاژ و کوالیتی پەخش',
    subtitle: 'دەنگی کوردی و کوالیتی 4K Ultra HD',
    icon: <Mic2 className="size-5 text-purple-400" />,
    badge: 'FULL HD 1080p',
    content: (
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
          <KurdishCCBadge size="md" />
          <span className="text-xs font-bold text-gray-300">ژێرنووسی کوردی تایبەت بە FLKRD</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
          <span className="text-xs font-black text-green-400 flex items-center gap-1.5">
            <CheckCircle2 size={16} />
            دەنگی ڕەسەن Dolby 5.1
          </span>
          <span className="text-xs font-bold text-gray-300">کوالیتی 4K / 1080p Web-DL</span>
        </div>
      </div>
    ),
  };

  // Stage 5: Recommendations & Similar Movies
  const stage5: CardSplitAccordionItem = {
    id: 'stage-similar',
    title: 'فیلم و زنجیرە هاوشێوەکان',
    subtitle: 'پێشنیارکراو بەپێی حەزی تۆ',
    icon: <Compass className="size-5 text-green-400" />,
    badge: `${similar.length > 0 ? similar.length : 6} بەرهەم`,
    content: (
      <div className="pt-2">
        {similar && similar.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {similar.slice(0, 6).map((sim, idx) => {
              const poster = sim.poster_path
                ? `${IMAGE_BASE_URL_POSTER}${sim.poster_path}`
                : 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=300&q=80';
              return (
                <div
                  key={idx}
                  onClick={() => onSelectMovie && onSelectMovie(sim)}
                  className="group/sim cursor-pointer relative rounded-2xl overflow-hidden border border-white/10 hover:border-brand/50 transition-all active:scale-95"
                >
                  <img src={poster} alt={sim.title || sim.name} className="w-full h-28 object-cover group-hover/sim:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 p-1.5 flex flex-col justify-end">
                    <p className="text-[10px] font-black text-white truncate">{sim.title || sim.name}</p>
                  </div>
                </div>
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
      <CardSplitAccordion items={accordionItems} autoHoverOpen={true} />

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
