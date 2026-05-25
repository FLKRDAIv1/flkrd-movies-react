
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import translations from '../translations';

type Language = 'en' | 'ku' | 'badini';
type Translations = typeof translations;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof Translations['en'], replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'ku';
  });
  
  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = (language === 'ku' || language === 'badini') ? 'rtl' : 'ltr';
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: keyof Translations['en'], replacements?: { [key: string]: string | number }): string => {
    let str = (translations[language] && translations[language][key]) || translations['en'][key] || String(key);
    
    if (replacements) {
        Object.entries(replacements).forEach(([placeholder, value]) => {
            // Using global regex to replace all occurrences correctly
            const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
            str = str.replace(regex, String(value));
        });
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
