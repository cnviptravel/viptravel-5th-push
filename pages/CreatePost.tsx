import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiCreatePost, compressMedia } from '../services/api';
import { UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useSnackbar } from '../contexts/SnackbarContext';

const CreatePost: React.FC = () => {
  const { auth } = useContext(AuthContext);
  const { showSnackbar } = useSnackbar();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // --- ШИНЭ: Үйлчилгээний мэдээлэл ---
  const [isService, setIsService] = useState(false);
  const [serviceTitle, setServiceTitle] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  // ------------------------------------

  useEffect(() => {
    if (auth.user?.status === 'pending' || auth.user?.status === 'rejected') {
        showSnackbar(auth.user?.status === 'pending' ? 'Таны бүртгэл хянагдаж байна. Пост оруулах боломжгүй.' : 'Таны бүртгэл татгалзсан. Профайл хэсгээс дахин илгээнэ үү.', 'info');
        navigate('/profile');
    }
  }, [auth.user, navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        showSnackbar("File too large. Max 50MB.", 'warning');
        return;
      }
      setIsLoading(true);
      try {
        const url = await compressMedia(file);
        if (file.type.startsWith('video/')) {
          setVideo(url);
          setImage(null);
        } else {
          setImage(url);
          setVideo(null);
        }
      } catch (err) {
        console.error(err);
        showSnackbar("Error processing media.", 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!text && !image && !video) return;
    setIsLoading(true);

    let postType: 'regular' | 'service' | 'travel' = 'regular';
    
    if (auth.user?.role === UserRole.Traveler) {
        postType = 'travel';
    } 
    else if ((auth.user?.role === UserRole.Provider || auth.user?.role === UserRole.Guide) && isService) {
        postType = 'service';
    }

    const postData = {
      userId: auth.user!._id,
      userName: auth.user!.name || (auth.user as any).full_name || "Guest",
      userPic: auth.user!.profilePic || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
      userRole: auth.user!.role,
      text,
      image: image || undefined,
      video: video || undefined,
      type: postType,
      serviceTitle: isService ? serviceTitle : undefined,
      price: isService ? Number(price) : undefined,
      capacity: isService ? Number(capacity) : undefined,
      likes: [],
      comments: []
    };

    // Optimistic пост үүсгэх
    const tempId = `optimistic_${Date.now()}`;
    const optimisticPost = {
      ...postData,
      _id: tempId,
      _isOptimistic: true,
      createdAt: new Date().toISOString(),
    };

    // Feed-д байвал optimistic пост шууд нэмэх
    const addOptimistic = (window as any).__addOptimisticPost;
    if (addOptimistic) {
      addOptimistic(optimisticPost);
    }

    // Форм цэвэрлэж Feed рүү шилжих
    setText('');
    setImage(null);
    setVideo(null);
    setIsService(false);
    setServiceTitle('');
    setPrice('');
    setCapacity('');
    setIsLoading(false);
    navigate('/');

    // Дэвсгэрт API дуудлага
    try {
      const realPost = await apiCreatePost(postData);
      const replace = (window as any).__replaceOptimisticPost;
      if (replace && realPost?._id) {
        // optimisticPost-ын бүх талбарыг хадгалж, зөвхөн _id болон createdAt-г шинэчлэх
        // Ингэснээр API undefined буцаасан ч userName, text, image г.м. алдагдахгүй
        const safeRealFields = Object.fromEntries(
          Object.entries(realPost).filter(([_, v]) => v !== undefined && v !== null)
        );
        replace(tempId, { 
          ...optimisticPost,
          ...safeRealFields,
          _id: realPost._id || (realPost as any).id,
          createdAt: realPost.createdAt || optimisticPost.createdAt,
          _isOptimistic: false,
        });
      }
    } catch (err) {
      showSnackbar("Пост илгээхэд алдаа гарлаа", 'error');
      const remove = (window as any).__removeOptimisticPost;
      if (remove) remove(tempId);
    }
};

  return (
    <div className="p-6 h-full flex flex-col max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="text-slate-500 font-bold">{t('cancel')}</button>
        <h2 className="font-bold text-lg dark:text-white">
            {auth.user?.role === UserRole.Traveler ? t('my_travels') : t('create_post')}
        </h2>
        <button 
          onClick={handleSubmit} 
          disabled={isLoading || (!text && !image && !video)}
          className="bg-primary text-white px-4 py-1.5 rounded-full font-bold text-sm disabled:opacity-50"
        >
          {isLoading ? t('posting') : t('post')}
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <img src={auth.user?.profilePic} className="w-10 h-10 rounded-full object-cover" alt="User" />
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={auth.user?.role === UserRole.Traveler ? "Аялалын тэмдэглэл, туршлагаа хуваалцаарай..." : t('share_experience')}
          className="w-full bg-transparent border-none outline-none resize-none text-slate-800 dark:text-slate-200 h-24"
        />
      </div>

      {image && (
        <div className="relative mb-4 rounded-xl overflow-hidden">
          <img src={image} className="w-full object-cover max-h-60" alt="Preview" />
          <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {video && (
        <div className="relative mb-4 rounded-xl overflow-hidden">
          <video src={video} controls className="w-full max-h-60 object-cover bg-black" />
          <button onClick={() => setVideo(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 z-10">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* --- SERVICE INPUTS (Зөвхөн Provider/Guide харна) --- */}
      {(auth.user?.role === UserRole.Provider || auth.user?.role === UserRole.Guide) && (
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-4 border border-slate-100 dark:border-slate-700">
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isService} 
                    onChange={e => setIsService(e.target.checked)} 
                    className="w-4 h-4 text-primary rounded focus:ring-primary" 
                  />
                  <span className="font-bold text-sm dark:text-white">Энэ бол Үйлчилгээ (Service)</span>
              </label>
              
              {isService && (
                  <div className="space-y-3 animate-fade-in">
                      <input 
                        placeholder="Үйлчилгээний нэр (Жнь: 3 өдрийн аялал)" 
                        value={serviceTitle} 
                        onChange={e => setServiceTitle(e.target.value)}
                        className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white"
                      />
                      <div className="flex gap-3">
                          <input 
                            type="number" 
                            placeholder="Үнэ (₮)" 
                            value={price} 
                            onChange={e => setPrice(e.target.value)}
                            className="w-1/2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white"
                          />
                          <input 
                            type="number" 
                            placeholder="Хүний тоо" 
                            value={capacity} 
                            onChange={e => setCapacity(e.target.value)}
                            className="w-1/2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-white"
                          />
                      </div>
                  </div>
              )}
          </div>
      )}
      {/* ----------------------------------------------------- */}

      <div className="mt-auto border-t border-slate-100 dark:border-slate-800 pt-4">
        <div className="flex gap-4">
            <label className="flex items-center gap-2 text-primary cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
                <span className="material-symbols-outlined">add_photo_alternate</span>
                <span className="text-sm font-bold">{t('photo_video')}</span>
                <input type="file" accept="image/*,video/*" className="hidden" onChange={handleImageUpload} />
            </label>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
