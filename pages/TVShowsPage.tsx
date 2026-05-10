
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Row from '../components/Row';
import { requests } from '../constants';
import { fetchData } from '../services/tmdbService';
import { Content } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

const TVShowsPage: React.FC = () => {
    const [headerContent, setHeaderContent] = React.useState<Content | null>(null);
    const { t, language } = useTranslation();
    const langCode = language === 'ku' ? 'ku' : 'en-US';
    const navigate = useNavigate();

    React.useEffect(() => {
        const getHeaderContent = async () => {
            const data = await fetchData(requests.fetchPopularTV(langCode), language);
            if (data && data.length > 0) {
                setHeaderContent(data[0]);
            } else {
                setHeaderContent(null);
            }
        };
        getHeaderContent();
        window.addEventListener('banned-list-updated', getHeaderContent);
        return () => window.removeEventListener('banned-list-updated', getHeaderContent);
    }, [langCode, language]);

    return (
        <div className="relative">
            <div className="relative h-96 md:h-[50vh] w-full text-white mb-8">
                {headerContent && (
                     <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w1280${headerContent.backdrop_path})` }}
                    >
                         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                    </div>
                )}
                
                <div className={`absolute top-24 ${language === 'ku' ? 'right-8 md:right-20' : 'left-8 md:left-20'} md:top-32 z-20`}>
                    <button 
                      onClick={() => navigate(-1)} 
                      className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-red-600 text-white px-5 py-3 rounded-2xl transition-all shadow-2xl group active:scale-95"
                    >
                      {language === 'ku' ? <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /> : <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />}
                      <span className="text-[10px] font-black uppercase tracking-widest">{t('back')}</span>
                    </button>
                </div>

                <div className={`relative z-10 flex flex-col justify-end h-full p-4 md:p-8 md:px-20 pb-12 ${language === 'ku' ? 'text-right items-end' : 'text-left items-start'}`}>
                    <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-4">{t('tvShows')}</h1>
                    <p className={`max-w-2xl text-gray-300 font-medium text-sm md:text-base line-clamp-2 italic ${language === 'ku' ? 'text-right' : 'text-left'}`}>
                        {t('tvShowsDescription')}
                    </p>
                </div>
            </div>
            <div className="py-8 space-y-12">
                <Row title={t('topRatedTV')} fetchUrl={requests.fetchTopRatedTV(langCode)} type="tv" />
                <Row title={t('popularTV')} fetchUrl={requests.fetchPopularTV(langCode)} type="tv" />
                <Row title={t('flkrdOriginals')} fetchUrl={requests.fetchNetflixOriginals(langCode)} type="tv" />
            </div>
        </div>
    );
};

export default TVShowsPage;
