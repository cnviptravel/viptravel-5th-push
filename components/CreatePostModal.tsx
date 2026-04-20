import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiCreatePost, compressMedia } from '../services/api';
import { AuthContext } from '../App';
import { UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useSnackbar } from '../contexts/SnackbarContext';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose }) => {
  const { auth } = useContext(AuthContext);
  const { t } = useLanguage();
  const { showSnackbar, dismissSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();

  const [cpText, setCpText] = useState('');
  const [cpImage, setCpImage] = useState<string | null>(null);
  const [cpVideo, setCpVideo] = useState<string | null>(null);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpIsService, setCpIsService] = useState(false);
  const [cpServiceTitle, setCpServiceTitle] = useState('');
  const [cpPrice, setCpPrice] = useState('');
  const [cpCapacity, setCpCapacity] = useState('');

  if (!isOpen) return null;

  const handleCpMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          const file = e.target.files[0];
          if (file.size > 50 * 1024 * 1024) { showSnackbar("Max 50MB", 'warning'); return; }
          setCpLoading(true);
          try {
              const url = await compressMedia(file);
              if (file.type.startsWith('video/')) { setCpVideo(url); setCpImage(null); }
              else { setCpImage(url); setCpVideo(null); }
          } catch { showSnackbar("Error", 'error'); }
          finally { setCpLoading(false); }
      }
  };

  const handleCpSubmit = async () => {
      if (!cpText && !cpImage && !cpVideo) return;
      setCpLoading(true);

      // 1. Modal хаах — хэрэглэгч хүлээхгүй
      onClose();

      // 2. Loading snackbar харуулах
      const loadingId = showSnackbar('Пост оруулж байна...', 'loading');

      let postType: 'regular' | 'service' | 'travel' = 'regular';
      if (auth.user?.role === UserRole.Traveler) postType = 'travel';
      else if ((auth.user?.role === UserRole.Provider || auth.user?.role === UserRole.Guide) && cpIsService) postType = 'service';

      try {
          const newPost = await apiCreatePost({
              userId: auth.user!._id,
              userName: auth.user!.name || (auth.user as any).full_name || 'User',
              userPic: auth.user!.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
              userRole: auth.user!.role,
              text: cpText, image: cpImage || undefined, video: cpVideo || undefined,
              type: postType,
              serviceTitle: cpIsService ? cpServiceTitle : undefined,
              price: cpIsService ? Number(cpPrice) : undefined,
              capacity: cpIsService ? Number(cpCapacity) : undefined,
              likes: [], comments: []
          });

          // 3. Loading snackbar хаах
          dismissSnackbar(loadingId);
          showSnackbar('Пост амжилттай нийтлэгдлээ!', 'success');

          // 4. Dispatch Custom Event instead of window object hack
          const postWithId = { ...newPost, _id: newPost._id || (newPost as any).id };
          document.dispatchEvent(new CustomEvent('new-post', { detail: postWithId }));

          // 5. Input цэвэрлэх
          setCpText(''); setCpImage(null); setCpVideo(null);
          setCpIsService(false); setCpServiceTitle(''); setCpPrice(''); setCpCapacity('');

          // 6. Feed хуудас дээр биш бол Feed руу явах
          if (location.pathname !== '/') navigate('/');

      } catch {
          dismissSnackbar(loadingId);
          showSnackbar('Пост оруулахад алдаа гарлаа', 'error');
      } finally {
          setCpLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center animate-fade-in" onClick={() => !cpLoading && onClose()}>
        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                <button onClick={() => !cpLoading && onClose()} className="text-slate-500 font-bold text-sm">{t('cancel')}</button>
                <h3 className="font-bold dark:text-white">{auth.user?.role === UserRole.Traveler ? t('my_travels') : t('create_post')}</h3>
                <button onClick={handleCpSubmit} disabled={cpLoading || (!cpText && !cpImage && !cpVideo)} className="bg-primary text-white px-4 py-1.5 rounded-full font-bold text-sm disabled:opacity-50">
                    {cpLoading ? '...' : t('post')}
                </button>
            </div>
            <div className="p-4">
                <div className="flex gap-3 mb-4">
                    <img src={auth.user?.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                    <textarea value={cpText} onChange={e => setCpText(e.target.value)} placeholder={auth.user?.role === UserRole.Traveler ? t('share_travel_note') : t('share_experience')} className="w-full bg-transparent border-none outline-none resize-none text-slate-800 dark:text-slate-200 h-24 text-sm" />
                </div>
                {cpImage && (
                    <div className="relative mb-3 rounded-xl overflow-hidden">
                        <img src={cpImage} className="w-full object-cover max-h-48 rounded-xl" alt="" />
                        <button onClick={() => setCpImage(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"><span className="material-symbols-outlined text-sm">close</span></button>
                    </div>
                )}
                {cpVideo && (
                    <div className="relative mb-3 rounded-xl overflow-hidden">
                        <video src={cpVideo} controls className="w-full max-h-48 object-cover bg-black rounded-xl" />
                        <button onClick={() => setCpVideo(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 z-10"><span className="material-symbols-outlined text-sm">close</span></button>
                    </div>
                )}
                {(auth.user?.role === UserRole.Provider || auth.user?.role === UserRole.Guide) && (
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl mb-3 border border-slate-100 dark:border-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={cpIsService} onChange={e => setCpIsService(e.target.checked)} className="w-4 h-4 text-primary rounded" />
                            <span className="font-bold text-sm dark:text-white">{t('is_service')}</span>
                        </label>
                        {cpIsService && (
                            <div className="space-y-2 mt-3">
                                <input placeholder={t('service_name')} value={cpServiceTitle} onChange={e => setCpServiceTitle(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" />
                                <div className="flex gap-2">
                                    <input type="number" placeholder={t('price')} value={cpPrice} onChange={e => setCpPrice(e.target.value)} className="w-1/2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" />
                                    <input type="number" placeholder={t('capacity')} value={cpCapacity} onChange={e => setCpCapacity(e.target.value)} className="w-1/2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white" />
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <label className="flex items-center gap-2 text-primary cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors w-max">
                        <span className="material-symbols-outlined">add_photo_alternate</span>
                        <span className="text-sm font-bold">{t('photo_video')}</span>
                        <input type="file" accept="image/*,video/*" className="hidden" onChange={handleCpMediaUpload} />
                    </label>
                </div>
            </div>
        </div>
    </div>
  );
};

export default CreatePostModal;
