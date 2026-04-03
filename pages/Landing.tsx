import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, supportedLanguages, Language } from '../contexts/LanguageContext';
import { useAppConfig } from '../contexts/AppConfigContext';
import { LanguageTermsProvider } from '../contexts/LanguageTermsContext';
import TermsOfServiceModal from '../components/TermsOfServiceModal';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { t, setLanguage, language } = useLanguage();
  const { config } = useAppConfig();
  
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handleOpenTerms = () => {
    setShowTermsModal(true);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-6 flex flex-col justify-center items-center max-w-md mx-auto relative overflow-hidden">
      
      {/* Language Selector - matches login page style */}
      <div className="absolute top-6 right-6 z-50" ref={langMenuRef}>
        <button 
          onClick={() => setShowLangMenu(!showLangMenu)}
          className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 transition-all hover:scale-105 active:scale-95"
        >
          <img 
            src={`https://flagcdn.com/w40/${
              language === 'en' ? 'gb' : 
              language === 'ja' ? 'jp' : 
              language === 'ko' ? 'kr' : 
              language
            }.png`}
            alt={language}
            className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
          />
          <span className="uppercase font-extrabold tracking-wider text-xs">{language}</span>
          <span className={`material-symbols-outlined text-lg transition-transform duration-300 ${showLangMenu ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
        
        {showLangMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-fade-in origin-top-right">
            <div className="max-h-64 overflow-y-auto py-2">
              {supportedLanguages.map((langOption) => {
                let countryCode = langOption.code as string;
                if (countryCode === 'en') countryCode = 'gb';
                if (countryCode === 'ja') countryCode = 'jp';
                if (countryCode === 'ko') countryCode = 'kr';

                return (
                  <button 
                    key={langOption.code}
                    onClick={() => { setLanguage(langOption.code); setShowLangMenu(false); }} 
                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors
                      ${language === langOption.code 
                        ? 'bg-primary/10 text-primary font-bold' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={`https://flagcdn.com/w40/${countryCode}.png`}
                        alt={langOption.name}
                        className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
                      />
                      <span className="font-medium">{langOption.nativeName}</span>
                    </div>
                    {language === langOption.code && (
                      <span className="material-symbols-outlined text-lg filled-icon text-primary">check</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Compact and Organized */}
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.appName} className="w-24 h-24 object-contain mx-auto" />
            ) : (
              <div className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center transform rotate-6 mx-auto shadow-xl shadow-primary/30">
                <span className="material-symbols-outlined text-white text-5xl">explore</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            {config.appName || 'VIP Travel'}
          </h1>
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-xs">star</span>
            <span>{t('hero_badge')}</span>
          </div>
        </div>

        {/* Description Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6 shadow-lg border border-slate-100 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-300 text-sm text-center leading-relaxed mb-4">
            {t('hero_subtitle')}
          </p>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-primary mb-1">500+</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                {t('stat_guides')}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-primary mb-1">10K+</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                {t('stat_travelers')}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-primary mb-1">200+</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                {t('stat_destinations')}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-primary mb-1">10</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                {t('stat_languages')}
              </div>
            </div>
          </div>

          {/* Main CTA Button */}
          <button
            onClick={handleGetStarted}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">rocket_launch</span>
            <span>{t('get_started')}</span>
          </button>
        </div>

        {/* Services Preview */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6 shadow-lg border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined">apps</span>
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-lg">
                {t('services_title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('services_desc')}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            {[
              { 
                icon: 'person_search', 
                titleKey: 'service_find_guide',
                descKey: 'service_find_guide_desc'
              },
              { 
                icon: 'calendar_month', 
                titleKey: 'service_book_tour',
                descKey: 'service_book_tour_desc'
              },
              { 
                icon: 'location_on', 
                titleKey: 'service_interactive_map',
                descKey: 'service_interactive_map_desc'
              }
            ].map((service, i) => (
              <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-primary/30 transition-colors group cursor-pointer" onClick={handleGetStarted}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">{service.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-primary transition-colors">
                      {t(service.titleKey)}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {t(service.descKey)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => setShowAllServices(true)}
            className="w-full mt-6 flex items-center justify-center gap-2 text-primary font-bold text-sm py-3 border-2 border-primary/30 rounded-xl hover:bg-primary/5 transition-colors group"
          >
            <span>{t('view_all_services')}</span>
            <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-500 dark:text-slate-400 text-xs mt-8">
          <div className="mb-4">
            <span>© 2026 VIP Travel. {t('footer_copyright')}</span>
          </div>
          <button
            onClick={handleOpenTerms}
            className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
          >
            {t('footer_terms')}
          </button>
        </div>
      </div>

      {/* All Services Modal */}
      {showAllServices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined">apps</span>
                </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-lg">
                  {t('all_services_title')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('all_services_desc')}
                </p>
              </div>
              </div>
              <button
                onClick={() => setShowAllServices(false)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="space-y-4">
                {[
                  { 
                    icon: 'person_search', 
                    titleKey: 'service_find_guide',
                    descKey: 'service_find_guide_desc'
                  },
                  { 
                    icon: 'calendar_month', 
                    titleKey: 'service_book_tour',
                    descKey: 'service_book_tour_desc'
                  },
                  { 
                    icon: 'location_on', 
                    titleKey: 'service_interactive_map',
                    descKey: 'service_interactive_map_desc'
                  },
                  { 
                    icon: 'translate', 
                    titleKey: 'service_translator',
                    descKey: 'service_translator_desc'
                  },
                  { 
                    icon: 'chat', 
                    titleKey: 'service_chat_calls',
                    descKey: 'service_chat_calls_desc'
                  },
                  { 
                    icon: 'photo_library', 
                    titleKey: 'service_social_feed',
                    descKey: 'service_social_feed_desc'
                  },
                  { 
                    icon: 'domain', 
                    titleKey: 'service_provider_services',
                    descKey: 'service_provider_services_desc'
                  },
                  { 
                    icon: 'verified', 
                    titleKey: 'service_guide_verification',
                    descKey: 'service_guide_verification_desc'
                  },
                  { 
                    icon: 'live_tv', 
                    titleKey: 'service_live_streaming',
                    descKey: 'service_live_streaming_desc'
                  }
                ].map((service, i) => (
                  <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-primary/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined">{service.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                          {t(service.titleKey)}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {t(service.descKey)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleGetStarted}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined">rocket_launch</span>
                  <span>{t('get_started')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      <TermsOfServiceModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  );
};

// Wrap the Landing component with LanguageTermsProvider
const LandingWithTermsProvider: React.FC = () => {
  return (
    <LanguageTermsProvider>
      <Landing />
    </LanguageTermsProvider>
  );
};

export default LandingWithTermsProvider;
