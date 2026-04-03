import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
// FIX: Import translations to correctly type the translation keys.
import translations from '../translations';

const ChromeIcon: React.FC = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 2V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 17V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FirefoxIcon: React.FC = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 12C10 10.6667 10.6 8 14 8C16.5 8 17 9.5 17 10.5C17 12.5 14 14 12 14C10 14 9.5 15 9.5 16C9.5 17.5 12 19 14 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SafariIcon: React.FC = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.125 10.125L15 9L13.875 13.875L9 15L10.125 10.125Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);


interface BrowserInstruction {
  name: keyof typeof translations['en'];
  Icon: React.FC;
  steps: (keyof typeof translations['en'])[];
}

const browserInstructions: BrowserInstruction[] = [
  { name: 'browserChrome', Icon: ChromeIcon, steps: ['enableNotificationsModalStep1', 'enableNotificationsModalStep2', 'enableNotificationsModalStep3'] },
  { name: 'browserFirefox', Icon: FirefoxIcon, steps: ['enableNotificationsModalStep1', 'enableNotificationsModalStep2', 'enableNotificationsModalStep3'] },
  { name: 'browserSafari', Icon: SafariIcon, steps: ['enableNotificationsModalStep1Safari', 'enableNotificationsModalStep2Safari', 'enableNotificationsModalStep3Safari'] },
];

interface EnableNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EnableNotificationsModal: React.FC<EnableNotificationsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            className="bg-gray-900 rounded-lg shadow-xl w-full max-w-lg border border-gray-700 flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
              <h2 className="text-xl font-bold text-white">{t('enableNotificationsModalTitle')}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto scrollbar-hide">
              <p className="text-gray-300">{t('enableNotificationsModalBody')}</p>
              <div className="space-y-4">
                {browserInstructions.map((browser, index) => (
                  <div key={index}>
                    <div className="flex items-center space-x-3 text-lg font-semibold text-white">
                      <browser.Icon />
                      <span>{t(browser.name)}</span>
                    </div>
                    <ol className="mt-2 list-decimal list-inside space-y-1 text-gray-400">
                      {browser.steps.map((step, stepIndex) => (
                        <li key={stepIndex}>{t(step)}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
             <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex-shrink-0">
                <button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors w-full sm:w-auto">
                    {t('close')}
                </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EnableNotificationsModal;