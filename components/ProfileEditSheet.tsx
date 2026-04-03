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

  // formData-ийн төрлийг тодорхой зааж өгснөөр алдаанаас сэргийлнэ
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
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setIsUploadingProfilePic(true);
      try {
        const url = await apiUploadMedia(e.target.files[0]);
        setProfilePic(url);
      } catch {
        showSnackbar('Зураг оруулахад алдаа гарлаа.', 'error');
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
      } catch {
        showSnackbar('Ковер зураг оруулахад алдаа гарлаа.', 'error');
      } finally {
        setIsUploadingCover(false);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // .map(s: string => ...) гэж төрлийг нь зааж өгснөөр "Implicit Any" алдаа арилна
      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        profilePic,
        bio: formData.bio,
        nationality: formData.nationality,
        experience: formData.experience,
        visitedPlaces: formData.visitedPlaces.split(',').map((s: string) => s.trim()).filter(Boolean),
        languages: formData.languages.split(',').map((s: string) => s.trim()).filter(Boolean),
        serviceDescription: formData.serviceDescription,
        website: formData.website,
        operatingHours: formData.operatingHours,
        coverPhoto,
        location: {
          lat: formData.lat || user.location?.lat || 0,
          lng: formData.lng || user.location?.lng || 0,
          address: formData.address,
        },
        hobbies: formData.hobbies.split(',').map((s: string) => s.trim()).filter(Boolean),
        privacy: privacySettings,
      };

      const updatedUser = await apiUpdateProfile(user._id, updateData);
      onSave(updatedUser);
      showSnackbar('Профайл амжилттай хадгалагдлаа!', 'success');
      onClose();
    } catch {
      showSnackbar('Профайл хадгалахад алдаа гарлаа.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { key: 'basic', label: 'Үндсэн', icon: 'person' },
    { key: 'details', label: 'Дэлгэрэнгүй', icon: 'work' },
    { key: 'social', label: 'Холбоос', icon: 'link' },
    { key: 'privacy', label: 'Нууцлал', icon: 'lock' },
  ] as const;

  const inputClass = "w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm outline-none dark:text-white border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-400";
  const labelClass = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";

  const PrivacyToggle = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 transition-colors">
      <div>
        <p className="font-semibold text-sm dark:text-white">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center md:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] md:max-h-[88vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold dark:text-white">Профайл засах</h2>
            <p className="text-xs text-slate-400 mt-0.5">Мэдээллээ шинэчилнэ үү</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="flex border-b border-slate-100 dark:border-slate-800 px-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-semibold transition-all ${
                activeSection === tab.key
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <div className="relative h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-blue-500/10 border border-slate-100 dark:border-slate-800">
              {coverPhoto
                ? <img src={coverPhoto} className="w-full h-full object-cover" alt="Cover" />
                : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-slate-300" style={{ fontSize: 28 }}>landscape</span>
                    <span className="text-[10px] text-slate-300">Ковер зураг нэмэх</span>
                  </div>
                )
              }
              <label className="absolute bottom-2.5 right-2.5 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full cursor-pointer transition-colors">
                {isUploadingCover
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>photo_camera</span>
                }
                <input type="file" className="hidden" accept="image/*" onChange={handleCoverPhotoChange} />
              </label>
            </div>

            <div className="flex items-end gap-4 -mt-14 ml-4">
              <div className="relative flex-shrink-0">
                <img
                  src={profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}
                  className="w-20 h-20 rounded-2xl border-4 border-white dark:border-slate-900 bg-slate-200 shadow-lg object-cover"
                  alt="Profile"
                />
                <label className="absolute -bottom-1 -right-1 bg-primary text-white p-1.5 rounded-lg cursor-pointer border-2 border-white dark:border-slate-900 hover:bg-primary/90 transition-colors shadow">
                  {isUploadingProfilePic
                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <span className="material-symbols-outlined" style={{ fontSize: 13 }}>photo_camera</span>
                  }
                  <input type="file" className="hidden" accept="image/*" onChange={handleProfilePicChange} />
                </label>
              </div>
              <div className="pb-1">
                <p className="font-bold text-base dark:text-white leading-tight">{user.name}</p>
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-md mt-0.5">
                  {user.role}
                </span>
              </div>
            </div>

            {activeSection === 'basic' && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Овог нэр</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className={inputClass}
                      placeholder="Таны бүтэн нэр"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Утасны дугаар</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className={inputClass}
                      placeholder="+976 XXXX XXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Имэйл хаяг</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className={`${inputClass} opacity-50 cursor-not-allowed`}
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                    Имэйл хаягийг өөрчлөх боломжгүй
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Тухай</label>
                  <textarea
                    value={formData.bio}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                    className={`${inputClass} min-h-[90px] resize-none`}
                    placeholder="Өөрийгөө товч танилцуулаарай..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className={labelClass}>Байршил / Хаяг</label>
                  <input
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Жишээ нь: Улаанбаатар, Сүхбаатар дүүрэг"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {activeSection === 'details' && (
              <div className="space-y-4 pt-2">
                {user.role === UserRole.Guide && (
                  <>
                    <div>
                      <label className={labelClass}>Туршлага</label>
                      <textarea
                        value={formData.experience}
                        onChange={e => setFormData({ ...formData, experience: e.target.value })}
                        className={`${inputClass} min-h-[90px] resize-none`}
                        placeholder="Аялалын гарын авлагын туршлагаа бичнэ үү..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Очсон газрууд</label>
                      <input
                        type="text"
                        value={formData.visitedPlaces}
                        onChange={e => setFormData({ ...formData, visitedPlaces: e.target.value })}
                        className={inputClass}
                        placeholder="Говь, Хөвсгөл, Алтай..."
                      />
                      <p className="text-[11px] text-slate-400 mt-1.5">Таслалаар тусгаарлан бичнэ үү</p>
                    </div>
                  </>
                )}

                <div>
                  <label className={labelClass}>Ярьдаг хэлүүд</label>
                  <input
                    type="text"
                    value={formData.languages}
                    onChange={e => setFormData({ ...formData, languages: e.target.value })}
                    className={inputClass}
                    placeholder="Монгол, Англи, Хятад..."
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">Таслалаар тусгаарлан бичнэ үү</p>
                </div>

                <div>
                  <label className={labelClass}>Хобби</label>
                  <input
                    type="text"
                    value={formData.hobbies}
                    onChange={e => setFormData({ ...formData, hobbies: e.target.value })}
                    className={inputClass}
                    placeholder="Уран зураг, Дуу, Аялал..."
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">Таслалаар тусгаарлан бичнэ үү</p>
                </div>
              </div>
            )}

            {activeSection === 'social' && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className={labelClass}>Вэбсайт</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2">
                      <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 16 }}>language</span>
                    </span>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={e => setFormData({ ...formData, website: e.target.value })}
                      className={`${inputClass} pl-10`}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Ажлын цаг</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2">
                      <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 16 }}>schedule</span>
                    </span>
                    <input
                      type="text"
                      value={formData.operatingHours}
                      onChange={e => setFormData({ ...formData, operatingHours: e.target.value })}
                      className={`${inputClass} pl-10`}
                      placeholder="09:00 - 18:00"
                    />
                  </div>
                </div>

                {(user.role === UserRole.Provider || user.role === UserRole.Guide) && (
                  <div>
                    <label className={labelClass}>Үйлчилгээний тайлбар</label>
                    <textarea
                      value={formData.serviceDescription}
                      onChange={e => setFormData({ ...formData, serviceDescription: e.target.value })}
                      className={`${inputClass} min-h-[90px] resize-none`}
                      placeholder="Та ямар үйлчилгээ үзүүлдэг вэ..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className="space-y-3 pt-2">
                <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-4 mb-4">
                  <p className="text-sm font-semibold text-primary">Нууцлалын тохиргоо</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Таны мэдээллийг хэн харахыг удирдана уу</p>
                </div>
                <PrivacyToggle
                  label="Имэйл хаяг"
                  desc="Бусад хэрэглэгч таны имэйлийг харах эсэх"
                  checked={privacySettings.showEmail}
                  onChange={v => setPrivacySettings({ ...privacySettings, showEmail: v })}
                />
                <PrivacyToggle
                  label="Утасны дугаар"
                  desc="Бусад хэрэглэгч таны дугаарыг харах эсэх"
                  checked={privacySettings.showPhone}
                  onChange={v => setPrivacySettings({ ...privacySettings, showPhone: v })}
                />
                <PrivacyToggle
                  label="Онлайн статус"
                  desc="Таны онлайн байгаа эсэхийг харуулах"
                  checked={privacySettings.showOnlineStatus}
                  onChange={v => setPrivacySettings({ ...privacySettings, showOnlineStatus: v })}
                />
                <PrivacyToggle
                  label="Хобби"
                  desc="Таны хоббиг бусдад харуулах эсэх"
                  checked={privacySettings.showHobbies}
                  onChange={v => setPrivacySettings({ ...privacySettings, showHobbies: v })}
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex gap-3 bg-white dark:bg-slate-900">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
          >
            Болих
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-2 px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm min-w-[140px]"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Хадгалж байна...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
                Хадгалах
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditSheet;