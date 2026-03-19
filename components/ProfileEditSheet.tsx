import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiUpdateProfile, apiUploadMedia } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useSnackbar } from '../contexts/SnackbarContext';

interface ProfileEditSheetProps {
  user: User;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
  isOpen: boolean;
}

const ProfileEditSheet: React.FC<ProfileEditSheetProps> = ({ user, onClose, onSave, isOpen }) => {
  const { t } = useLanguage();
  const { showSnackbar } = useSnackbar();
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'details' | 'social' | 'privacy'>('basic');
  
  // Default translations fallback
  const getTranslation = (key: string, fallback: string) => {
    const translation = t(key);
    return translation === key ? fallback : translation;
  };
  
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    bio: user.bio || '',
    nationality: user.nationality || '',
    experience: user.experience || '',
    visitedPlaces: user.visitedPlaces?.join(', ') || '',
    languages: user.languages?.join(', ') || '',
    serviceDescription: user.serviceDescription || '',
    website: user.website || '',
    operatingHours: user.operatingHours || '',
    address: user.location?.address || '',
    lat: user.location?.lat || 0,
    lng: user.location?.lng || 0,
    hobbies: (user as any)?.hobbies?.join(', ') || '',
  });

  const [privacySettings, setPrivacySettings] = useState({
    showEmail: user.privacy?.showEmail ?? true,
    showPhone: user.privacy?.showPhone ?? true,
    showOnlineStatus: user.privacy?.showOnlineStatus ?? true,
    showHobbies: (user as any)?.privacy?.showHobbies ?? true,
  });

  const [profilePic, setProfilePic] = useState(user.profilePic || '');
  const [coverPhoto, setCoverPhoto] = useState(user.coverPhoto || '');
  const [isUploadingProfilePic, setIsUploadingProfilePic] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setIsUploadingProfilePic(true);
      try {
        const url = await apiUploadMedia(e.target.files[0]);
        setProfilePic(url);
      } catch (err) {
        console.error(err);
        showSnackbar("Error uploading image.", 'error');
      } finally {
        setIsUploadingProfilePic(false);
      }
    }
  };

  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setIsUploadingCover(true);
      try {
        const url = await apiUploadMedia(e.target.files[0]);
        setCoverPhoto(url);
      } catch (err) {
        showSnackbar("Cover photo upload failed", 'error');
      } finally {
        setIsUploadingCover(false);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        profilePic: profilePic,
        bio: formData.bio,
        nationality: formData.nationality,
        experience: formData.experience,
        visitedPlaces: formData.visitedPlaces.split(',').map(s => s.trim()),
        languages: formData.languages.split(',').map(s => s.trim()),
        serviceDescription: formData.serviceDescription,
        website: formData.website,
        operatingHours: formData.operatingHours,
        coverPhoto: coverPhoto,
        location: {
          lat: formData.lat || user.location?.lat || 0,
          lng: formData.lng || user.location?.lng || 0,
          address: formData.address
        }
      };

      // Add hobbies if exists
      if (formData.hobbies) {
        updateData.hobbies = formData.hobbies.split(',').map(s => s.trim());
      }

      // Add privacy settings
      updateData.privacy = {
        showEmail: privacySettings.showEmail,
        showPhone: privacySettings.showPhone,
        showOnlineStatus: privacySettings.showOnlineStatus,
        showHobbies: privacySettings.showHobbies,
      };

      const updatedUser = await apiUpdateProfile(user._id, updateData);
      onSave(updatedUser);
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      showSnackbar('Профайл хадгалахад алдаа гарлаа.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center md:items-center md:justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] md:max-h-[85vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold dark:text-white">{t('edit_profile')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('edit_profile_desc')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6">
          <button
            onClick={() => setActiveSection('basic')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${activeSection === 'basic' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
          >
            <span className="material-symbols-outlined text-base align-middle mr-2">person</span>
            {t('basic_info')}
          </button>
          <button
            onClick={() => setActiveSection('details')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${activeSection === 'details' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
          >
            <span className="material-symbols-outlined text-base align-middle mr-2">work</span>
            {t('details')}
          </button>
          <button
            onClick={() => setActiveSection('social')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${activeSection === 'social' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
          >
            <span className="material-symbols-outlined text-base align-middle mr-2">link</span>
            {t('social')}
          </button>
          <button
            onClick={() => setActiveSection('privacy')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${activeSection === 'privacy' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
          >
            <span className="material-symbols-outlined text-base align-middle mr-2">lock</span>
            Нууцлал
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Cover Photo */}
          <div className="relative h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-blue-800/20">
            {coverPhoto ? (
              <img src={coverPhoto} className="w-full h-full object-cover" alt="Cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-300 text-4xl">landscape</span>
              </div>
            )}
            <label className="absolute bottom-3 right-3 bg-black/60 text-white p-2.5 rounded-full cursor-pointer hover:bg-black/80 transition-colors shadow-lg">
              {isUploadingCover ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <span className="material-symbols-outlined text-sm">photo_camera</span>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleCoverPhotoChange} />
            </label>
          </div>

          {/* Profile Picture */}
          <div className="flex items-center gap-4 -mt-12 ml-6">
            <div className="relative">
              <img 
                src={profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
                className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 bg-slate-200 shadow-xl" 
                alt="Profile" 
              />
              <label className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full cursor-pointer shadow-lg border-2 border-white hover:bg-primary/80 transition-colors">
                <span className="material-symbols-outlined text-xs">photo_camera</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleProfilePicChange} />
              </label>
            </div>
            <div>
              <h3 className="font-bold text-lg dark:text-white">{user.name}</h3>
              <p className="text-xs text-slate-500 font-bold uppercase">{t(user.role)}</p>
            </div>
          </div>

          {/* Basic Info Section */}
          {activeSection === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('full_name')}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-primary"
                    placeholder={t('enter_full_name')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('phone')}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-primary"
                    placeholder={t('enter_phone')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('email')}</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl p-3 text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 opacity-70"
                  placeholder={t('enter_email')}
                />
                <p className="text-[10px] text-slate-400 mt-1">{t('email_cannot_change')}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('bio')}</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-primary min-h-[80px]"
                  placeholder={t('tell_about_yourself')}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('location')}</label>
                <input
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder={t('enter_address')}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-primary"
                />
                <p className="text-[10px] text-slate-400 mt-1">Хаягаа оруулна уу (жишээ нь: Улаанбаатар, Сүхбаатар дүүрэг)</p>
              </div>
            </div>
          )}

          {/* Details Section */}
          {activeSection === 'details' && (
            <div className="space-y-4">
              {user.role === UserRole.Guide && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('experience')}</label>
                    <textarea
                      value={formData.experience}
                      onChange={(e) => setFormData({...formData, experience: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-primary min-h-[80px]"
                      placeholder={t('describe_experience')}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('visited_places')}</label>
                    <input
                      type="text"
                      value={formData.visitedPlaces}
                      onChange={(e) => setFormData({...formData, visitedPlaces: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-primary"
                      placeholder={t('comma_separated_places')}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">{t('visited_places_hint')}</p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('languages')}</label>
                <input
                  type="text"
                  value={formData.languages}
                  onChange={(e) => setFormData({...formData, languages: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-primary"
                  placeholder={t('comma_separated_languages')}
                />
                <p className="text-[10px] text-slate-400 mt-1">{t('languages_hint')}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Хобби</label>
                <input
                  type="text"
                  value={formData.hobbies}
                  onChange={(e) => setFormData({...formData, hobbies: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-primary"
                  placeholder="Жишээ нь: Уран зураг, Дуу, Аялал, Унших"
                />
                <p className="text-[10px] text-slate-400 mt-1">Таалагддаг зүйлсээ таслалаар тусгаарлан бичнэ үү</p>
              </div>
            </div>
          )}

          {/* Privacy Section */}
          {activeSection === 'privacy' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                <h3 className="font-bold text-sm dark:text-white mb-3">Нууцлалын тохиргоо</h3>
                <p className="text-xs text-slate-500 mb-4">Таны мэдээллийг хэн харахыг тохируулна уу</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="font-bold text-sm dark:text-white">Имэйл хаяг</p>
                      <p className="text-[10px] text-slate-500">Таны имэйл хаягийг хэн харах</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={privacySettings.showEmail}
                        onChange={(e) => setPrivacySettings({...privacySettings, showEmail: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="font-bold text-sm dark:text-white">Утасны дугаар</p>
                      <p className="text-[10px] text-slate-500">Таны утасны дугаарыг хэн харах</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={privacySettings.showPhone}
                        onChange={(e) => setPrivacySettings({...privacySettings, showPhone: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="font-bold text-sm dark:text-white">Онлайн статус</p>
                      <p className="text-[10px] text-slate-500">Таны онлайн статусыг хэн харах</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={privacySettings.showOnlineStatus}
                        onChange={(e) => setPrivacySettings({...privacySettings, showOnlineStatus: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="font-bold text-sm dark:text-white">Хобби</p>
                      <p className="text-[10px] text-slate-500">Таны хоббиг хэн харах</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={privacySettings.showHobbies}
                        onChange={(e) => setPrivacySettings({...privacySettings, showHobbies: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Social Section */}
          {activeSection === 'social' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('website')}</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-primary"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('operating_hours')}</label>
                <input
                  type="text"
                  value={formData.operatingHours}
                  onChange={(e) => setFormData({...formData, operatingHours: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-primary"
                  placeholder="9:00 AM - 6:00 PM"
                />
              </div>

              {(user.role === UserRole.Provider || user.role === UserRole.Guide) && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('service_description')}</label>
                  <textarea
                    value={formData.serviceDescription}
                    onChange={(e) => setFormData({...formData, serviceDescription: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-primary min-h-[80px]"
                    placeholder={t('describe_your_services')}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                {t('saving')}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">save</span>
                {t('save_changes')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditSheet;
