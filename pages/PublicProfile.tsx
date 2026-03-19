import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// apiFollowUser болон apiUnfollowUser-ийг нэмж импортлов
import { apiGetUser, apiUploadMedia, apiFollowUser, apiUnfollowUser } from '../services/api';
import { User, UserRole, Service } from '../types';
import { AuthContext } from '../App';
import BookingModal from '../components/BookingModal';
import ReviewSection from '../components/ReviewSection';
import { useLanguage } from '../contexts/LanguageContext';
import { useSnackbar } from '../contexts/SnackbarContext';

const PublicProfile: React.FC = () => {
  const { userId } = useParams();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState(100);

  // --- ШИНЭЭР НЭМЭГДСЭН СТЭЙТҮҮД ---
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const isOwner = auth.user?._id === userId;

  const loadUser = async () => {
      if (userId) {
          try {
              setLoading(true);
              setError(null);
              const u = await apiGetUser(userId);
              if (u) {
                  setUser(u);
              } else {
                  setError('Хэрэглэгч олдсонгүй');
              }
          } catch (err: any) {
              console.error('Error loading user:', err);
              setError(err.message || 'Хэрэглэгч ачаалахад алдаа гарлаа');
          } finally {
              setLoading(false);
          }
      }
  };

  useEffect(() => {
      loadUser();
  }, [userId]);

  // --- ДАГАХ ЛОГИКИЙГ ХОЛБОХ ХЭСЭГ ---
  useEffect(() => {
    if (user && auth.user) {
        setIsFollowing(user.followers?.includes(auth.user._id) || false);
        setFollowersCount(user.followers?.length || 0);
        setFollowingCount(user.following?.length || 0);
    }
  }, [user, auth.user]);

  const handleFollowToggle = async () => {
    if (!auth.isAuthenticated) return navigate('/login');
    if (!user || !auth.user) return;
    
    // Optimistic Update (Шууд дэлгэц дээр өөрчлөх)
    const prevFollowing = isFollowing;
    setIsFollowing(!prevFollowing);
    setFollowersCount(prev => prevFollowing ? prev - 1 : prev + 1);

    try {
        if (prevFollowing) {
            await apiUnfollowUser(auth.user._id, user._id);
        } else {
            await apiFollowUser(auth.user._id, user._id);
        }
    } catch (err) {
        // Алдаа гарвал буцаах
        setIsFollowing(prevFollowing);
        setFollowersCount(user?.followers?.length || 0);
    }
  };
  // ---------------------------------

  const handleMessage = () => {
    if (!auth.isAuthenticated) { navigate('/login'); return; }
    if (auth.user?._id === user?._id) return;
    navigate(`/chat/${user?._id}`);
  };

  const handleBookingClick = (price: number) => {
      if (auth.user?.status === 'pending') { showSnackbar(t('account_pending_action'), 'info'); return; }
      if (user?.status === 'pending') { showSnackbar(t('provider_pending_action'), 'info'); return; }
      setSelectedPrice(price);
      setShowBooking(true);
  };

  if (loading) return (
    <div className="p-10 text-center flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-primary mb-4"></div>
      <p className="text-slate-500">{t('loading')}</p>
    </div>
  );
  
  if (error || !user) return (
    <div className="p-10 text-center flex flex-col items-center justify-center min-h-screen bg-[#f6f7f8] dark:bg-[#101922]">
      <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">person_off</span>
      <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Хэрэглэгч олдсонгүй</h2>
      <p className="text-sm text-slate-500 mb-6">{error || 'Энэ хэрэглэгч устгагдсан эсвэл байхгүй байна'}</p>
      <button 
        onClick={() => navigate(-1)} 
        className="bg-primary text-white font-bold py-2 px-6 rounded-full flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Буцах
      </button>
    </div>
  );

  return (
    <div className="pb-10 bg-[#f6f7f8] dark:bg-[#101922] min-h-screen">
      {/* Cover */}
      <div className="relative h-48 bg-gradient-to-br from-primary to-blue-700">
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-colors z-10">
            <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="absolute -bottom-16 left-0 right-0 flex justify-center">
            <img src={user.profilePic} className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-900 object-cover bg-slate-200 shadow-lg" alt="Profile" />
        </div>
      </div>

      <div className="mt-20 px-6 text-center">
         <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
             {user.name}
             {user.averageRating && user.averageRating > 0 && (
                 <span className="flex items-center text-sm bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                     <span className="material-symbols-outlined text-sm filled-icon mr-1">star</span>
                     {user.averageRating}
                 </span>
             )}
         </h1>
         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t(user.role)}</p>
         
         {/* --- ДАГАГЧДЫН МЭДЭЭЛЭЛ --- */}
         <div className="flex justify-center gap-8 my-5 text-center">
            <div>
                <p className="font-black text-lg dark:text-white leading-none">{followersCount}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold mt-1 tracking-tighter">Followers</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 self-center"></div>
            <div>
                <p className="font-black text-lg dark:text-white leading-none">{followingCount}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold mt-1 tracking-tighter">Following</p>
            </div>
         </div>

         <div className="flex flex-col items-center gap-3 mt-6 px-4">
            {auth.user?._id !== user._id && (
                <div className="flex gap-2 w-full max-w-[280px]">
                    {/* Follow Button */}
                    <button 
                        onClick={handleFollowToggle}
                        className={`flex-1 font-bold py-3 rounded-2xl transition-all active:scale-95 shadow-sm ${
                            isFollowing 
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' 
                            : 'bg-primary text-white shadow-primary/20'
                        }`}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>

                    {/* Message Button */}
                    <button 
                        onClick={handleMessage}
                        className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-bold px-5 rounded-2xl flex items-center justify-center active:scale-95 transition-transform shadow-sm"
                    >
                        <span className="material-symbols-outlined text-xl">send</span>
                    </button>
                </div>
            )}
         </div>
      </div>

      {/* Travels Gallery */}
      <div className="mt-8 px-6">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4">Travels</h3>
          {(!user.travelPhotos || user.travelPhotos.length === 0) ? (
               <div className="relative w-full aspect-[2.5/1] bg-white dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-300">
                  <span className="material-symbols-outlined text-4xl mb-1 opacity-50">filter_none</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest">No photos yet</p>
              </div>
          ) : (
              <div className="grid grid-cols-2 gap-3">
                  {user.travelPhotos.map((photo, i) => (
                      <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 bg-white">
                          <img src={photo} className="w-full h-full object-cover" alt="Travel" />
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Info Section */}
      <div className="mt-8 px-6 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg dark:text-white mb-3">{t('info')}</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {user.serviceDescription || user.bio || 'No description provided.'}
              </p>
          </div>

          <ReviewSection 
              providerId={user._id} 
              reviews={user.reviews || []} 
              currentUser={auth.user} 
              onReviewAdded={loadUser}
          />
      </div>

      {showBooking && auth.user && (
          <BookingModal 
              provider={{...user, pricePerDay: selectedPrice}} 
              currentUser={auth.user} 
              onClose={() => setShowBooking(false)} 
              onSuccess={() => setShowBooking(false)}
          />
      )}
    </div>
  );
};

export default PublicProfile;
