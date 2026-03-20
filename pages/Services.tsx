import React, { useEffect, useState, lazy, Suspense } from 'react';
import { apiGetUsersByRole } from '../services/api';
import { User, UserRole } from '../types';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useMap } from '../contexts/MapContext';

// Lazy load the EnhancedMapView component
const EnhancedMapView = lazy(() => import('../components/EnhancedMapView'));

const SavedPinsList: React.FC = () => {
  const [pins, setPins] = useState<Array<{id:string;lat:number;lng:number;label:string}>>(() => {
    try { return JSON.parse(localStorage.getItem('map_saved_pins') || '[]'); } catch { return []; }
  });

  // localStorage өөрчлөгдөхөд sync хийх
  useEffect(() => {
    const sync = () => {
      try { setPins(JSON.parse(localStorage.getItem('map_saved_pins') || '[]')); } catch {}
    };
    window.addEventListener('storage', sync);
    // EnhancedMapView-аас custom event авах
    window.addEventListener('pins-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('pins-updated', sync);
    };
  }, []);

  if (pins.length === 0) return null;

  return (
    <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-3 py-2">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
        Хадгалсан тэмдэглэгээ ({pins.length})
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {pins.map(pin => (
          <button
            key={pin.id}
            onClick={() => {
              // Map руу event илгээх — EnhancedMapView сонсоно
              window.dispatchEvent(new CustomEvent('fly-to-pin', {
                detail: { lat: pin.lat, lng: pin.lng }
              }));
            }}
            className="flex items-center gap-1.5 shrink-0 bg-slate-100 dark:bg-slate-800
                       hover:bg-primary/10 hover:border-primary border border-transparent
                       rounded-xl px-3 py-1.5 transition-colors group"
          >
            <span className="material-symbols-outlined text-primary text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
              bookmark
            </span>
            <span className="text-xs font-bold dark:text-white whitespace-nowrap group-hover:text-primary">
              {pin.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const Services: React.FC = () => {
  const [services, setServices] = useState<User[]>([]);
  const [allServices, setAllServices] = useState<User[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [roleFilter, setRoleFilter] = useState<'all' | 'guide' | 'provider'>('all');
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { setMapInstance } = useMap();

  // Map instance management - clear map instance when leaving map view
  useEffect(() => {
    if (viewMode !== 'map') {
      setMapInstance(null);
    }
  }, [viewMode, setMapInstance]);

  // Map view үед body scroll lock
  useEffect(() => {
    if (viewMode === 'map') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewMode]);

  useEffect(() => {
    // Load both guides and providers
    Promise.all([
      apiGetUsersByRole(UserRole.Guide),
      apiGetUsersByRole(UserRole.Provider)
    ]).then(([guideUsers, providerUsers]) => {
      const all = [...guideUsers, ...providerUsers];
      setAllServices(all);
      setServices(all); // Default to all
    });
  }, []);

  // Apply role filter
  useEffect(() => {
    if (roleFilter === 'all') {
      setServices(allServices);
    } else if (roleFilter === 'guide') {
      setServices(allServices.filter(u => u.role === UserRole.Guide));
    } else if (roleFilter === 'provider') {
      setServices(allServices.filter(u => u.role === UserRole.Provider));
    }
  }, [roleFilter, allServices]);

  return (
    <div className="p-4 pb-24 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
            <h2 className="text-2xl font-bold dark:text-white">{t('services')}</h2>
            <p className="text-slate-500 text-sm">{t('find_services')}</p>
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
            {/* Role Filter Buttons */}
            <div className="flex gap-2 mb-4">
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

            {services.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">person_search</span>
                    <p>{t('no_registered')}</p>
                </div>
            ) : (
                services.map(service => (
                    <div 
                        key={service._id} 
                        onClick={() => navigate(`/profile/${service._id}`)} 
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex gap-4 cursor-pointer active:scale-[0.98] transition-transform"
                    >
                        <div className="relative shrink-0">
                            <img 
                                src={service.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
                                className="w-20 h-20 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800" 
                                alt={service.name} 
                            />
                            {service.status === 'pending' ? (
                                <div className="absolute -bottom-2 -right-2 bg-orange-100 text-orange-600 p-1 rounded-full border-2 border-white dark:border-slate-900">
                                    <span className="material-symbols-outlined text-sm block">hourglass_top</span>
                                </div>
                            ) : (
                                <div className={`absolute -bottom-2 -right-2 p-1 rounded-full border-2 border-white dark:border-slate-900 ${
                                    service.role === UserRole.Guide 
                                        ? 'bg-orange-100 text-orange-600' 
                                        : 'bg-green-100 text-green-600'
                                }`}>
                                    <span className="material-symbols-outlined text-sm block">
                                        {service.role === UserRole.Guide ? 'map' : 'verified'}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg dark:text-white truncate pr-2">{service.name}</h3>
                                    {service.status === 'pending' && <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-bold uppercase">Pending</span>}
                                    {service.status !== 'pending' && <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider ${
                                        service.role === UserRole.Guide
                                            ? 'bg-orange-50 text-orange-600'
                                            : 'bg-green-50 text-green-600'
                                    }`}>
                                        {service.role === UserRole.Guide ? t('guide') : t('provider')}
                                    </span>}
                                </div>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                    {service.role === UserRole.Guide 
                                        ? (service.experience ? `${service.experience} ${t('experience')}` : t('guide_desc'))
                                        : (service.serviceDescription || t('provider_desc'))
                                    }
                                </p>
                            </div>
                            
                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm filled-icon text-yellow-500">star</span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {service.averageRating ? service.averageRating : 'New'}
                                    </span>
                                    {service.reviews && service.reviews.length > 0 && (
                                        <span className="text-[10px] text-slate-400">({service.reviews.length})</span>
                                    )}
                                </div>
                                <div className="text-right">
                                    {service.role === UserRole.Provider && service.pricePerDay && (
                                        <span className="block text-sm font-bold text-primary">${service.pricePerDay}</span>
                                    )}
                                    <button className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors">
                                        {t('view_profile')}
                                    </button>
                                </div>
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

            {/* Map + Saved pins list wrapper */}
            <div className="flex flex-col h-full gap-0">
              {/* Map - flex-1 авна */}
              <div className="flex-1 min-h-0">
                <Suspense fallback={
                  <div className="w-full h-full rounded-3xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-primary mx-auto mb-4"></div>
                      <p className="text-slate-500 text-sm font-medium">Loading Map...</p>
                    </div>
                  </div>
                }>
                  <EnhancedMapView 
                    users={services} 
                    markerColor={roleFilter === 'guide' ? '#f97316' : roleFilter === 'provider' ? '#10b981' : '#3b82f6'}
                    showLocationSaveButton={true}
                    showRealTimeTracking={false}
                    followMode={false}
                  />
                </Suspense>
              </div>

              {/* Доод хэсэг — хадгалагдсан тэмдэглэгээнүүд */}
              <SavedPinsList />
            </div>
         </div>
      )}
    </div>
  );
};

export default Services;
