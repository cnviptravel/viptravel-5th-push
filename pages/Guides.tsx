
import React, { useEffect, useState, lazy, Suspense } from 'react';
import { apiGetUsersByRole } from '../services/api';
import { User, UserRole } from '../types';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useMap } from '../contexts/MapContext';

// Lazy load the EnhancedMapView component
const EnhancedMapView = lazy(() => import('../components/EnhancedMapView'));

const Guides: React.FC = () => {
  const [guides, setGuides] = useState<User[]>([]);
  const [allGuides, setAllGuides] = useState<User[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [roleFilter, setRoleFilter] = useState<'all' | 'guide' | 'provider'>('guide');
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { setMapInstance } = useMap();

  // Map instance management - clear map instance when leaving map view
  useEffect(() => {
    if (viewMode !== 'map') {
      setMapInstance(null);
    }
  }, [viewMode, setMapInstance]);

  useEffect(() => {
    // Load both guides and providers for map filtering
    Promise.all([
      apiGetUsersByRole(UserRole.Guide),
      apiGetUsersByRole(UserRole.Provider)
    ]).then(([guideUsers, providerUsers]) => {
      const all = [...guideUsers, ...providerUsers];
      setAllGuides(all);
      setGuides(guideUsers); // Default to guides
    });
  }, []);

  // Apply role filter
  useEffect(() => {
    if (roleFilter === 'all') {
      setGuides(allGuides);
    } else if (roleFilter === 'guide') {
      setGuides(allGuides.filter(u => u.role === UserRole.Guide));
    } else if (roleFilter === 'provider') {
      setGuides(allGuides.filter(u => u.role === UserRole.Provider));
    }
  }, [roleFilter, allGuides]);

  return (
    <div className="p-4 pb-24 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
            <h2 className="text-2xl font-bold dark:text-white">{t('guides')}</h2>
            <p className="text-slate-500 text-sm">{t('find_locals')}</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-400'}`}
                title={t('list_view')}
            >
                <span className="material-symbols-outlined text-lg block">list</span>
            </button>
            <button 
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-md transition-all ${viewMode === 'map' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-400'}`}
                title={t('map_view')}
            >
                <span className="material-symbols-outlined text-lg block">map</span>
            </button>
        </div>
      </div>

      {viewMode === 'list' ? (
          <div className="flex flex-col gap-4">
            {guides.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">person_search</span>
                    <p>{t('no_registered')}</p>
                </div>
            ) : (
                guides.map(guide => (
                    <div 
                        key={guide._id} 
                        onClick={() => navigate(`/profile/${guide._id}`)} 
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex gap-4 cursor-pointer active:scale-[0.98] transition-transform"
                    >
                        <div className="relative shrink-0">
                            <img 
                                src={guide.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
                                className="w-20 h-20 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800" 
                                alt={guide.name} 
                            />
                            {guide.status === 'pending' ? (
                                <div className="absolute -bottom-2 -right-2 bg-orange-100 text-orange-600 p-1 rounded-full border-2 border-white dark:border-slate-900">
                                    <span className="material-symbols-outlined text-sm block">hourglass_top</span>
                                </div>
                            ) : (
                                <div className="absolute -bottom-2 -right-2 bg-orange-100 text-orange-600 p-1 rounded-full border-2 border-white dark:border-slate-900">
                                    <span className="material-symbols-outlined text-sm block">map</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg dark:text-white truncate pr-2">{guide.name}</h3>
                                    {guide.status === 'pending' && <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-bold uppercase">Pending</span>}
                                    {guide.status !== 'pending' && <span className="bg-orange-50 text-orange-600 text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider">{t('guide')}</span>}
                                </div>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">work_history</span>
                                    {guide.experience ? `${guide.experience} ${t('experience')}` : t('guide_desc')}
                                </p>
                            </div>
                            
                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm filled-icon text-yellow-500">star</span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {guide.averageRating ? guide.averageRating : 'New'}
                                    </span>
                                </div>
                                <button className="text-[10px] font-bold bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors">
                                    {t('view_profile')}
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
          </div>
      ) : (
         <div className="flex flex-col gap-4 flex-1 h-full">
            {/* Role Filter Buttons */}
            <div className="flex gap-2 shrink-0">
                <button
                    onClick={() => setRoleFilter('guide')}
                    className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
                        roleFilter === 'guide'
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                >
                    <span className="material-symbols-outlined text-sm align-middle mr-1">map</span>
                    {t('guides')}
                </button>
                <button
                    onClick={() => setRoleFilter('provider')}
                    className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
                        roleFilter === 'provider'
                            ? 'bg-green-500 text-white shadow-lg'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                >
                    <span className="material-symbols-outlined text-sm align-middle mr-1">verified</span>
                    {t('providers')}
                </button>
                <button
                    onClick={() => setRoleFilter('all')}
                    className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
                        roleFilter === 'all'
                            ? 'bg-primary text-white shadow-lg'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                >
                    <span className="material-symbols-outlined text-sm align-middle mr-1">public</span>
                    All
                </button>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative">
                <Suspense fallback={
                    <div className="w-full h-full rounded-3xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-orange-500 mx-auto mb-4"></div>
                            <p className="text-slate-500 text-sm font-medium">Loading Map...</p>
                        </div>
                    </div>
                }>
                    <EnhancedMapView 
                        users={guides} 
                        markerColor={roleFilter === 'guide' ? '#f97316' : roleFilter === 'provider' ? '#10b981' : '#3b82f6'}
                        showLocationSaveButton={true}
                        showRealTimeTracking={false}
                        followMode={false}
                    />
                </Suspense>
            </div>
         </div>
      )}
    </div>
  );
};

export default Guides;
