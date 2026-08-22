import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Film, Star, User, Calendar, MapPin, Sparkles } from 'lucide-react';
import { fetchData, isForbidden } from '../services/tmdbService';
import { API_KEY, IMAGE_BASE_URL_PROFILE, IMAGE_BASE_URL_POSTER } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import Portal from './Portal';

interface ActorInfoModalProps {
  actorId: number | string | null;
  actorName?: string;
  characterName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie?: (movie: any) => void;
}

export const ActorInfoModal: React.FC<ActorInfoModalProps> = ({
  actorId,
  actorName,
  characterName,
  isOpen,
  onClose,
  onSelectMovie,
}) => {
  const { language } = useTranslation();
  const isRtl = language === 'ku' || language === 'badini';

  const [personData, setPersonData] = useState<any>(null);
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!actorId || !isOpen) return;

    const fetchActorDetails = async () => {
      setLoading(true);
      try {
        const langCode = isRtl ? 'ku-TR' : 'en-US';
        const endpoint = `/person/${actorId}?api_key=${API_KEY}&language=${langCode}&append_to_response=movie_credits,tv_credits`;
        const res = await fetchData(endpoint, language);

        if (res) {
          setPersonData(res);
          const combinedCredits = [
            ...(res.movie_credits?.cast || []),
            ...(res.tv_credits?.cast || []),
          ];

          const sorted = combinedCredits
            .filter((m) => m.poster_path && !isForbidden(m, language))
            .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
          
          const uniqueMovies = Array.from(new Map(sorted.map(m => [m.id, m])).values());
          setMovies(uniqueMovies.slice(0, 12));
        }
      } catch (err) {
        console.error('Failed to fetch actor info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActorDetails();
  }, [actorId, isOpen, isRtl, language]);

  if (!isOpen) return null;

  return (
    <Portal id="actor-info-modal-portal">
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[150000] flex items-center justify-center p-3 sm:p-6 overflow-hidden pointer-events-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute inset-0 bg-black/85 backdrop-blur-2xl cursor-pointer pointer-events-auto"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative z-10 w-full max-w-2xl max-h-[85vh] bg-neutral-950/95 border border-white/15 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.9)] flex flex-col overflow-y-auto overflow-x-hidden backdrop-blur-3xl pointer-events-auto ${
                isRtl ? 'text-right' : 'text-left'
              }`}
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-all active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Profile Header */}
              <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
                {personData?.profile_path ? (
                  <img
                    src={`${IMAGE_BASE_URL_PROFILE}${personData.profile_path}`}
                    alt={personData?.name || actorName}
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover border-2 border-brand/50 shadow-xl shrink-0"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center text-gray-500 shrink-0">
                    <User className="w-12 h-12" />
                  </div>
                )}

                <div className="flex-1 text-center sm:text-right min-w-0">
                  <h3 className="text-xl sm:text-2xl font-black text-white truncate">
                    {personData?.name || actorName || 'ئەکتەر'}
                  </h3>
                  {characterName && (
                    <p className="text-xs sm:text-sm font-semibold text-brand mt-1">
                      ڕۆڵ: {characterName}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-xs text-gray-400">
                    {personData?.birthday && (
                      <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        {personData.birthday}
                      </span>
                    )}
                    {personData?.place_of_birth && (
                      <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        {personData.place_of_birth}
                      </span>
                    )}
                    {personData?.known_for_department && (
                      <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        {personData.known_for_department}
                      </span>
                    )}
                  </div>

                  {personData?.biography && (
                    <p className="text-xs text-gray-300 line-clamp-3 mt-3 leading-relaxed">
                      {personData.biography}
                    </p>
                  )}
                </div>
              </div>

              {/* Filmography Section */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Film className="w-5 h-5 text-brand" />
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    بەناوبانگترین کارەکانی (Filmography)
                  </h4>
                </div>

                {loading ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={idx} className="aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : movies.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {movies.map((movie) => {
                      const poster = `${IMAGE_BASE_URL_POSTER}${movie.poster_path}`;
                      const movieTitle = movie.title || movie.name || '';
                      const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '8.0';

                      return (
                        <motion.div
                          key={movie.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectMovie) {
                              onSelectMovie(movie);
                            }
                            onClose();
                          }}
                          className="group cursor-pointer relative rounded-2xl overflow-hidden border border-white/10 bg-neutral-900 flex flex-col shadow-lg"
                        >
                          <div className="relative aspect-[2/3] w-full overflow-hidden">
                            <img
                              src={poster}
                              alt={movieTitle}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                              <span className="text-[10px] font-bold text-white">{rating}</span>
                            </div>
                          </div>
                          <div className="p-2">
                            <p className="text-[11px] font-bold text-white truncate text-center">
                              {movieTitle}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">
                    هیچ زانیارییەکی بەرهەم بەردەست نییە.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default ActorInfoModal;
