import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppConfig } from '../contexts/AppConfigContext';

const RoleSelection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { config } = useAppConfig();

  const handleSelect = (role: UserRole) => {
    navigate(`/register/${role}`);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col max-w-md mx-auto relative overflow-hidden">
      
       {/* Буцах товч */}
       <button 
         onClick={() => navigate(-1)} 
         className="absolute top-4 left-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-2 rounded-full text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors z-10"
       >
         <span className="material-symbols-outlined">arrow_back</span>
       </button>

       <div className="flex-1 flex flex-col justify-center px-6 pt-10">
         <h2 className="text-2xl font-bold text-center mb-2 dark:text-white">{t('choose_role')}</h2>
         <p className="text-center text-slate-500 mb-8 text-sm">{t('how_will_use')}</p>

         <div className="space-y-4">
             {/* Traveler */}
             <div onClick={() => handleSelect(UserRole.Traveler)} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-transparent hover:border-primary cursor-pointer transition-all group flex items-center gap-4 active:scale-95">
                 <div className="bg-blue-100 text-blue-600 p-3 rounded-xl"><span className="material-symbols-outlined">backpack</span></div>
                 <div>
                     <h3 className="font-bold text-lg dark:text-white">{t('traveler')}</h3>
                     <p className="text-xs text-slate-500">{t('traveler_desc')}</p>
                 </div>
                 <span className="material-symbols-outlined ml-auto text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
             </div>
             {/* Guide */}
             <div onClick={() => handleSelect(UserRole.Guide)} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-transparent hover:border-orange-500 cursor-pointer transition-all group flex items-center gap-4 active:scale-95">
                 <div className="bg-orange-100 text-orange-600 p-3 rounded-xl"><span className="material-symbols-outlined">map</span></div>
                 <div>
                     <h3 className="font-bold text-lg dark:text-white">{t('guide')}</h3>
                     <p className="text-xs text-slate-500">{t('guide_desc')}</p>
                 </div>
                 <span className="material-symbols-outlined ml-auto text-slate-300 group-hover:text-orange-500 transition-colors">chevron_right</span>
             </div>
             {/* Provider */}
             <div onClick={() => handleSelect(UserRole.Provider)} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-transparent hover:border-green-500 cursor-pointer transition-all group flex items-center gap-4 active:scale-95">
                 <div className="bg-green-100 text-green-600 p-3 rounded-xl"><span className="material-symbols-outlined">apartment</span></div>
                 <div>
                     <h3 className="font-bold text-lg dark:text-white">{t('provider')}</h3>
                     <p className="text-xs text-slate-500">{t('provider_desc')}</p>
                 </div>
                 <span className="material-symbols-outlined ml-auto text-slate-300 group-hover:text-green-500 transition-colors">chevron_right</span>
             </div>
         </div>
      </div>

      <div className="mt-8 text-center pb-10">
          <span className="text-slate-500 text-sm font-medium">{t('already_account')} </span>
          <button onClick={() => navigate('/login')} className="text-primary font-bold text-sm hover:underline">{t('login')}</button>
      </div>
    </div>
  );
};

export default RoleSelection;