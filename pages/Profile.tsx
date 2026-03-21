import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
// Хоёр кодын import-уудыг нэгтгэв
import { 
    apiUpdateProfile, 
    compressMedia, 
    apiGetBookings, 
    apiGetSavedPosts, 
    apiLikePost, 
    apiGetPosts,
    apiUploadMedia,
    apiAddTravelPhoto,
    apiDeleteTravelPhoto,
    apiUpdateUserStatus,
    apiGetUser,
    apiGenerateTripPlan
} from '../services/api';
import { UserRole, Booking, Post, VerificationData, ProviderCategory, ExamResult } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import PostCard from '../components/PostCard';
import ImageViewer from '../components/PhotoViewer';
import ProfileEditSheet from '../components/ProfileEditSheet';
import { generateQuestionsForLanguage, Question } from '../services/questionBank';
import { useSnackbar } from '../contexts/SnackbarContext';

const topLanguages = ['English', 'Mongolian', 'Chinese', 'Russian', 'Japanese', 'Korean', 'German', 'French', 'Spanish', 'Italian'];

const Profile: React.FC = () => {
  const { auth, setAuth, logout } = useContext(AuthContext);
  const { showSnackbar } = useSnackbar();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'bookings' | 'saved' | 'verification' | 'travels' | 'services' | 'ai_planner'>('info');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  
  // Таны хуучин кодоос: Зураг уншиж байх үеийн төлөв
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Verification & Exam states
  const [verificationData, setVerificationData] = useState<VerificationData>({
      documentType: 'ID Card',
      documentImage: '',
      certificateImage: '',
      additionalInfo: ''
  });
  const [activeExamLang, setActiveExamLang] = useState<string | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentAnswers, setCurrentAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(600);

  const [aiDestination, setAiDestination] = useState('');
  const [aiDuration, setAiDuration] = useState('');
  const [aiBudget, setAiBudget] = useState('Standard');
  const [aiResult, setAiResult] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiParsedPlan, setAiParsedPlan] = useState<any>(null);
  const [aiSendingToMap, setAiSendingToMap] = useState(false);

  // Profile edit sheet state
  const [showEditSheet, setShowEditSheet] = useState(false);

  const [formData, setFormData] = useState({
    name: auth.user?.name || (auth.user as any)?.full_name || '', 
    phone: auth.user?.phone || '',
    profilePic: auth.user?.profilePic || '',
    address: auth.user?.location?.address || '',
    lat: auth.user?.location?.lat || 0,
    lng: auth.user?.location?.lng || 0,
    experience: auth.user?.experience || '',
    visitedPlaces: auth.user?.visitedPlaces?.join(', ') || '',
    languages: auth.user?.languages?.join(', ') || '',
    serviceDescription: auth.user?.serviceDescription || '',
    coverPhoto: auth.user?.coverPhoto || '',
  });
  useEffect(() => {
      if (auth.user) {
          if (activeTab === 'bookings') apiGetBookings(auth.user._id).then(setBookings);
          if (activeTab === 'saved') apiGetSavedPosts(auth.user.savedPostIds || []).then(setSavedPosts);
          if (['travels', 'services', 'info'].includes(activeTab)) loadUserPosts();
          if (auth.user.verificationData) setVerificationData(auth.user.verificationData);
          // Refresh user data to get fresh followers/following
          apiGetUser(auth.user._id).then(freshUser => {
              if (freshUser) setAuth(prev => ({ ...prev, user: { ...prev.user!, followers: freshUser.followers, following: freshUser.following, coverPhoto: freshUser.coverPhoto } }));
          });
      }
  }, [auth.user?._id, activeTab]);

  useEffect(() => {
    let timer: any;
    if (examStarted && timeLeft > 0) {
        timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (examStarted && timeLeft <= 0) {
        submitExam();
    }
    return () => clearInterval(timer);
  }, [examStarted, timeLeft]);

  // Шинэ пост шуурхай profile-д нэмэх
  useEffect(() => {
    const prev = (window as any).__onNewPost;
    (window as any).__onNewPost = (newPost: Post) => {
      prev?.(newPost); // Feed callback-г дуудах (Feed хуудас нэгэн зэрэг mount байвал)
      if (newPost.userId === auth.user?._id) {
        setUserPosts(prevPosts => [newPost, ...prevPosts]);
      }
    };
    return () => {
      // Feed-ийн callback-г сэргээх
      (window as any).__onNewPost = prev;
    };
  }, [auth.user?._id]);

  const loadUserPosts = async () => {
      if (!auth.user) return;
      const allPosts = await apiGetPosts();
      setUserPosts(allPosts.filter(p => p.userId === auth.user!._id));
  };

  const handleTakeExam = (lang: string) => {
      const qs = generateQuestionsForLanguage(lang);
      setExamQuestions(qs);
      setCurrentAnswers(new Array(qs.length).fill(-1));
      setActiveExamLang(lang);
      setTimeLeft(600);
      setExamStarted(true);
  };

  const submitExam = async () => {
      if (!auth.user || !activeExamLang) return;
      let score = 0;
      examQuestions.forEach((q, i) => { if (currentAnswers[i] === q.correctAnswer) score++; });
      const newResult: ExamResult = {
          language: activeExamLang,
          score, maxScore: 10,
          date: new Date().toISOString(),
          status: score >= 6 ? 'passed' : 'failed'
      };
      const updatedResults = [...(auth.user.examResults || []).filter(r => r.language !== activeExamLang), newResult];
      const updatedUser = await apiUpdateProfile(auth.user._id, { examResults: updatedResults });
      setAuth({ ...auth, user: updatedUser });
      setExamStarted(false);
      setActiveExamLang(null);
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'documentImage' | 'certificateImage') => {
      if (e.target.files?.[0]) {
          const base64 = await compressMedia(e.target.files[0]);
          setVerificationData(prev => ({ ...prev, [field]: base64 }));
      }
  };

  const handleVerificationSubmit = async () => {
      if (!auth.user) return;
      const updatedUser = await apiUpdateProfile(auth.user._id, { 
          verificationData: { ...verificationData, submittedAt: new Date().toISOString() } 
      });
      // Also set status to pending so admin can review
      await apiUpdateUserStatus(auth.user._id, 'pending' as any);
      setAuth({ ...auth, user: { ...updatedUser, status: 'pending' } });
  };

  // Profile pic change - immediately saves to backend (like cover photo)
  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && auth.user) {
      try {
        const url = await apiUploadMedia(e.target.files[0]);
        setFormData(prev => ({ ...prev, profilePic: url }));
        const updatedUser = await apiUpdateProfile(auth.user._id, { profilePic: url });
        setAuth({ ...auth, user: updatedUser });
      } catch (err) {
        console.error(err);
        showSnackbar("Error uploading image.", 'error');
      }
    }
  };

  // --- ӨӨРЧЛӨЛТ 2: Таны хуучин кодоос Travel Photo нэмэх функцийг авчирлаа ---
  const handleAddTravelPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0] && auth.user) {
          setIsUploadingPhoto(true);
          try {
              const url = await apiUploadMedia(e.target.files[0]);
              const updated = await apiAddTravelPhoto(auth.user._id, url);
              setAuth({ ...auth, user: updated });
          } catch (e) { 
              showSnackbar("Upload failed", 'error'); 
          } finally { 
              setIsUploadingPhoto(false); 
          }
      }
  };

  // --- ӨӨРЧЛӨЛТ 3: Таны хуучин кодоос Travel Photo устгах функцийг авчирлаа ---
  const handleDeleteTravelPhoto = async (photoUrl: string) => {
    if (auth.user && confirm('Delete this photo?')) { 
        const updatedUser = await apiDeleteTravelPhoto(auth.user._id, photoUrl); 
        setAuth({...auth, user: updatedUser}); 
    }
  };

  const handleGeneratePlan = async () => {
      if (!aiDestination || !aiDuration) return;
      setIsAiGenerating(true);
      setAiParsedPlan(null);
      setAiSendingToMap(false);
      try {
          // JSON формат хүсэх prompt
          const jsonPrompt = `You are a professional travel planner for Mongolia.
Create a detailed trip plan for: "${aiDestination}", duration: ${aiDuration} days, budget: ${aiBudget}.
Respond ONLY with valid JSON, no markdown, no explanation:
{
  "title": "short trip title",
  "summary": "2-3 sentence overview",
  "stops": [
    {
      "name": "Place name in Mongolian",
      "description": "Why visit, what to do (2-3 sentences)",
      "lat": 47.9221,
      "lng": 106.9155,
      "day": 1,
      "distanceFromPrevKm": 0,
      "travelTimeMin": 0
    }
  ]
}
IMPORTANT: lat/lng must be real accurate GPS coordinates. stops count: 4-8.
distanceFromPrevKm = road distance in km from previous stop (0 for first stop).
travelTimeMin = estimated travel time in minutes from previous stop (0 for first stop).`;

          const response = await fetch('https://viptravel-backend.erdneebatulzii23.workers.dev/ai/plan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  destination: aiDestination,
                  duration: aiDuration,
                  budget: aiBudget,
                  language: t('language_name') || 'English',
                  format: 'json',
                  prompt: jsonPrompt,
              }),
          });
          const data = await response.json() as any;
          const raw = data.plan || data;

          // JSON parse
          let parsed: any = null;
          if (typeof raw === 'string') {
              const match = raw.match(/\{[\s\S]*\}/);
              if (match) { try { parsed = JSON.parse(match[0]); } catch { parsed = null; } }
          } else if (typeof raw === 'object' && raw?.stops) {
              parsed = raw;
          }

          if (parsed?.stops && Array.isArray(parsed.stops)) {
              setAiParsedPlan(parsed);
              // Текст хэлбэрээр ч харуулах (хуучин aiResult хэвээр)
              const textPlan = parsed.stops.map((s: any, i: number) =>
                  `${i + 1}. ${s.name} (${s.day}-р өдөр)` +
                  (s.distanceFromPrevKm > 0 ? ` — өмнөхөөс ${s.distanceFromPrevKm} км, ~${s.travelTimeMin} мин` : '') +
                  `\n   ${s.description}`
              ).join('\n\n');
              setAiResult(`${parsed.title}\n\n${parsed.summary}\n\n---\n\n${textPlan}`);
          } else {
              setAiResult(typeof raw === 'string' ? raw : 'Төлөвлөгөө үүсгэхэд алдаа гарлаа.');
          }
      } catch (error) {
          setAiResult('Алдаа гарлаа. Дахин оролдоно уу.');
      } finally {
          setIsAiGenerating(false);
      }
  };

  const handleSendPlanToMap = (tabIndex: number) => {
      if (!aiParsedPlan) return;
      setAiSendingToMap(true);
      window.dispatchEvent(new CustomEvent('trip-plan-add', {
          detail: { plan: aiParsedPlan, tabIndex }
      }));
      navigate('/services');
  };

  // --- Cover Photo upload ---
  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && auth.user) {
      try {
        const url = await apiUploadMedia(e.target.files[0]);
        setFormData(prev => ({ ...prev, coverPhoto: url }));
        const updatedUser = await apiUpdateProfile(auth.user._id, { coverPhoto: url } as any);
        setAuth({ ...auth, user: updatedUser });
      } catch (err) {
        showSnackbar("Cover photo upload failed", 'error');
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!auth.user) return;
    // Always use the latest profilePic from auth state (may have been updated via camera button)
    const currentProfilePic = auth.user.profilePic || formData.profilePic;
    const updatedUser = await apiUpdateProfile(auth.user._id, {
        name: formData.name, phone: formData.phone, profilePic: currentProfilePic,
        experience: formData.experience, visitedPlaces: formData.visitedPlaces.split(',').map(s => s.trim()),
        languages: formData.languages.split(',').map(s => s.trim()),
        serviceDescription: formData.serviceDescription,
        location: {
          lat: formData.lat || auth.user.location?.lat || 0,
          lng: formData.lng || auth.user.location?.lng || 0,
          address: formData.address
        }
    });
    setAuth({ ...auth, user: updatedUser });
    setFormData(prev => ({ ...prev, profilePic: updatedUser.profilePic || prev.profilePic }));
    setIsEditing(false);
  };

  const handleProfileSave = (updatedUser: any) => {
    setAuth({ ...auth, user: updatedUser });
    // Update formData to reflect changes
    setFormData(prev => ({
      ...prev,
      name: updatedUser.name || prev.name,
      phone: updatedUser.phone || prev.phone,
      profilePic: updatedUser.profilePic || prev.profilePic,
      address: updatedUser.location?.address || prev.address,
      lat: updatedUser.location?.lat || prev.lat,
      lng: updatedUser.location?.lng || prev.lng,
      experience: updatedUser.experience || prev.experience,
      visitedPlaces: updatedUser.visitedPlaces?.join(', ') || prev.visitedPlaces,
      languages: updatedUser.languages?.join(', ') || prev.languages,
      serviceDescription: updatedUser.serviceDescription || prev.serviceDescription,
      coverPhoto: updatedUser.coverPhoto || prev.coverPhoto,
    }));
  };

  const isBusinessUser = auth.user?.role === UserRole.Provider || auth.user?.role === UserRole.Guide;
  const totalEarnings = bookings.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.totalPrice, 0);

  // Aggregate stats by service
  const serviceStats = bookings.reduce((acc, b) => {
    if (b.status === 'cancelled') return acc;
    const title = b.serviceTitle || 'Other Services';
    if (!acc[title]) acc[title] = { count: 0, income: 0 };
    acc[title].count += 1;
    acc[title].income += b.totalPrice;
    return acc;
  }, {} as Record<string, { count: number, income: number }>);

  return (
    <div className="pb-20 animate-fade-in bg-background-light dark:bg-background-dark min-h-screen">
      {examStarted && activeExamLang && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b pb-2 shrink-0">
                      <h3 className="font-bold text-lg dark:text-white">{activeExamLang} Exam</h3>
                      <span className="font-mono font-bold text-primary text-xl">{Math.floor(timeLeft/60)}:{timeLeft%60 < 10 ? '0' : ''}{timeLeft%60}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                      {examQuestions.map((q, qIdx) => (
                          <div key={q.id}>
                              <p className="font-bold dark:text-white mb-3">{qIdx+1}. {q.question}</p>
                              <div className="space-y-2">
                                  {q.options.map((opt, oIdx) => (
                                      <label key={oIdx} className={`block p-3 rounded-xl border transition-all cursor-pointer ${currentAnswers[qIdx] === oIdx ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800'}`}>
                                          <input type="radio" className="hidden" name={`q-${qIdx}`} checked={currentAnswers[qIdx] === oIdx} onChange={() => { const na = [...currentAnswers]; na[qIdx] = oIdx; setCurrentAnswers(na); }} />
                                          <span className={`text-sm ${currentAnswers[qIdx] === oIdx ? 'font-bold text-primary' : 'dark:text-slate-300'}`}>{opt}</span>
                                      </label>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
                  <button onClick={submitExam} className="mt-4 w-full bg-primary text-white font-bold py-3 rounded-xl">{t('submit_exam')}</button>
              </div>
          </div>
      )}

      <div className="relative">
          <div className="h-44 bg-gradient-to-br from-primary to-blue-800 overflow-hidden">
              {(formData.coverPhoto || auth.user?.coverPhoto) && (
                  <img src={formData.coverPhoto || auth.user?.coverPhoto} className="absolute inset-0 w-full h-full object-cover" alt="Cover" />
              )}
              <label className="absolute top-3 right-3 bg-black/40 text-white p-2 rounded-full cursor-pointer hover:bg-black/60 transition-colors z-10">
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleCoverPhotoChange} />
              </label>
          </div>
          <div className="absolute -bottom-16 left-0 right-0 flex justify-center z-20">
             <div className="relative">
                <img src={formData.profilePic || auth.user?.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-900 bg-slate-200 shadow-xl" style={{ objectFit: 'cover', aspectRatio: '1/1' }} alt="Profile" />
                <label className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full cursor-pointer shadow-lg border-2 border-white hover:bg-primary/80 transition-colors z-30">
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleProfilePicChange} />
                </label>
             </div>
          </div>
      </div>

      <div className="mt-20 px-6 text-center">
         <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
            {auth.user?.name || (auth.user as any)?.full_name} 
            {auth.user?.status === 'approved' && <span className="material-symbols-outlined text-primary text-lg filled-icon">verified</span>}
         </h1>
         <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">{t(auth.user?.role || 'traveler')}</p>
         
         {/* Followers / Following Count */}
         <div className="flex items-center justify-center gap-6 mt-3">
             <div className="text-center">
                 <p className="font-extrabold text-lg dark:text-white">{auth.user?.followers?.length || 0}</p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase">{t('followers')}</p>
             </div>
             <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
             <div className="text-center">
                 <p className="font-extrabold text-lg dark:text-white">{auth.user?.following?.length || 0}</p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase">{t('following')}</p>
             </div>
         </div>
      </div>

      <div className="flex border-b border-slate-100 dark:border-slate-800 mt-6 mx-4 overflow-x-auto no-scrollbar gap-5 px-2">
          <button onClick={() => setActiveTab('info')} className={`pb-3 text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'info' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}>{t('info')}</button>
          {auth.user?.role === UserRole.Traveler && (
              <>
                <button onClick={() => setActiveTab('travels')} className={`pb-3 text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'travels' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}>{t('my_travels')}</button>
                <button onClick={() => setActiveTab('ai_planner')} className={`pb-3 text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === 'ai_planner' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}><span className="material-symbols-outlined text-sm">auto_awesome</span> {t('ai_planner')}</button>
                <button onClick={() => setActiveTab('bookings')} className={`pb-3 text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'bookings' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}>{t('my_bookings')}</button>
              </>
          )}
          {isBusinessUser && (
              <>
                <button onClick={() => setActiveTab('services')} className={`pb-3 text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'services' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}>{t('my_services')}</button>
                <button onClick={() => setActiveTab('bookings')} className={`pb-3 text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'bookings' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}>{t('dashboard')}</button>
                <button onClick={() => setActiveTab('verification')} className={`pb-3 text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'verification' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}>{t('verification')}</button>
              </>
          )}
          <button onClick={() => setActiveTab('saved')} className={`pb-3 text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'saved' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}>{t('saved')}</button>
      </div>

      <div className="mt-6 px-6">
          {activeTab === 'info' && (
              <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-5">
                      <div className="flex justify-between items-center">
                          <h3 className="font-extrabold text-lg dark:text-white uppercase tracking-wider">{t('info')}</h3>
                          <button onClick={() => setShowEditSheet(true)} className="text-primary font-bold text-sm bg-blue-50 dark:bg-primary/10 px-4 py-1.5 rounded-xl flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">edit</span>
                              {t('edit_profile')}
                          </button>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                          <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase">{t('location')}</span>
                              <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold dark:text-white">{auth.user?.location?.address || 'Ulaanbaatar'}</span>
                                  {auth.user?.location?.lat && auth.user?.location?.lng && (
                                    <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                      <span className="material-symbols-outlined text-xs">location_on</span>
                                      GPS ✓
                                    </span>
                                  )}
                              </div>
                          </div>
                          <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase">Email</span>
                              <span className="text-sm font-bold dark:text-white">{auth.user?.email}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase">{t('phone')}</span>
                              <span className="text-sm font-bold dark:text-white">{auth.user?.phone || 'Not provided'}</span>
                          </div>
                          {auth.user?.bio && (
                              <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">{t('bio')}</span>
                                  <span className="text-sm dark:text-white">{auth.user.bio}</span>
                              </div>
                          )}
                          {auth.user?.languages && auth.user.languages.length > 0 && (
                              <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">{t('languages')}</span>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                      {auth.user.languages.map((lang, idx) => (
                                          <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{lang}</span>
                                      ))}
                                  </div>
                              </div>
                          )}
                          {(auth.user as any)?.hobbies && (auth.user as any).hobbies.length > 0 && auth.user.privacy?.showHobbies !== false && (
                              <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Хобби</span>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                      {(auth.user as any).hobbies.map((hobby: string, idx: number) => (
                                          <span key={idx} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-bold">{hobby}</span>
                                      ))}
                                  </div>
                              </div>
                          )}
                          <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase">Нууцлалын тохиргоо</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                  {auth.user?.privacy?.showEmail !== false && (
                                      <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                          <span className="material-symbols-outlined text-[8px]">mail</span>
                                          Имэйл
                                      </span>
                                  )}
                                  {auth.user?.privacy?.showPhone !== false && (
                                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                          <span className="material-symbols-outlined text-[8px]">phone</span>
                                          Утас
                                      </span>
                                  )}
                                  {auth.user?.privacy?.showOnlineStatus !== false && (
                                      <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                          <span className="material-symbols-outlined text-[8px]">online_prediction</span>
                                          Статус
                                      </span>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
                  <button onClick={logout} className="w-full py-4 bg-red-50 dark:bg-red-900/10 text-red-500 font-extrabold rounded-3xl flex items-center justify-center gap-2"><span className="material-symbols-outlined">logout</span> {t('logout')}</button>
              </div>
          )}

          {activeTab === 'verification' && isBusinessUser && (
              <div className="space-y-6">
                  {/* Status Banner */}
                  {auth.user?.status === 'approved' && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
                          <span className="material-symbols-outlined text-green-500 text-2xl filled-icon">verified</span>
                          <div>
                              <p className="font-bold text-green-700 dark:text-green-400">Баталгаажсан</p>
                              <p className="text-xs text-green-600 dark:text-green-500">Таны бүртгэл амжилттай баталгаажлаа. Бүх эрх нээгдсэн.</p>
                          </div>
                      </div>
                  )}
                  {auth.user?.status === 'pending' && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex items-center gap-3">
                          <span className="material-symbols-outlined text-orange-500 text-2xl">hourglass_top</span>
                          <div>
                              <p className="font-bold text-orange-700 dark:text-orange-400">Хянагдаж байна</p>
                              <p className="text-xs text-orange-600 dark:text-orange-500">Таны мэдээлэл админд илгээгдсэн. Зөвшөөрөл хүлээж байна.</p>
                          </div>
                      </div>
                  )}
                  {auth.user?.status === 'rejected' && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3">
                          <span className="material-symbols-outlined text-red-500 text-2xl">cancel</span>
                          <div>
                              <p className="font-bold text-red-700 dark:text-red-400">Татгалзсан</p>
                              <p className="text-xs text-red-600 dark:text-red-500">Таны бүртгэл татгалзагдсан. Мэдээллээ шинэчлээд дахин илгээнэ үү.</p>
                          </div>
                      </div>
                  )}

                  {auth.user?.role === UserRole.Guide && (
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                          <h3 className="font-extrabold text-lg dark:text-white mb-2">{t('language_exams')}</h3>
                          <p className="text-xs text-slate-500 mb-4">{t('exam_desc')}</p>
                          <div className="space-y-3">
                              {topLanguages.map(lang => {
                                  const res = auth.user?.examResults?.find(r => r.language === lang);
                                  return (
                                      <div key={lang} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                          <div>
                                              <p className="font-bold text-sm dark:text-white">{lang}</p>
                                              {res && <p className={`text-[10px] font-bold ${res.status === 'passed' ? 'text-green-500' : 'text-red-500'}`}>{res.score}/10 - {t(res.status)}</p>}
                                          </div>
                                          {(!res || res.status === 'failed') && <button onClick={() => handleTakeExam(lang)} className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-lg">{t('take_exam')}</button>}
                                          {res?.status === 'passed' && <span className="material-symbols-outlined text-green-500">verified</span>}
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  )}
                  {auth.user?.status !== 'approved' && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
                      <h3 className="font-extrabold text-lg dark:text-white">{t('verify_title')}</h3>
                      <p className="text-xs text-slate-500">{t('verify_desc')}</p>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">{t('id_card')}</label>
                          {verificationData.documentImage ? <img src={verificationData.documentImage} className="w-full h-32 object-cover rounded-xl" /> : <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer"><span className="material-symbols-outlined text-slate-300">add_a_photo</span><input type="file" className="hidden" onChange={(e) => handleDocUpload(e, 'documentImage')} /></label>}
                      </div>
                      <button onClick={handleVerificationSubmit} disabled={auth.user?.status === 'pending'} className="w-full bg-primary text-white font-bold py-3 rounded-xl mt-4 disabled:opacity-50">{auth.user?.status === 'pending' ? 'Хянагдаж байна...' : auth.user?.status === 'rejected' ? 'Дахин илгээх' : t('submit_verify')}</button>
                  </div>
                  )}
                  {auth.user?.status === 'approved' && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-4">
                      <div className="w-20 h-20 mx-auto bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-green-500 text-4xl filled-icon">verified</span>
                      </div>
                      <h3 className="font-extrabold text-xl dark:text-white">Бүрэн баталгаажсан</h3>
                      <p className="text-sm text-slate-500">Таны бүртгэл амжилттай баталгаажсан. Та бүх үйлчилгээг бүрэн ашиглах боломжтой.</p>
                      <div className="grid grid-cols-3 gap-3 pt-2">
                          <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-2xl">
                              <span className="material-symbols-outlined text-green-500 text-xl">post_add</span>
                              <p className="text-[10px] font-bold text-green-600 mt-1">Пост нийтлэх</p>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-2xl">
                              <span className="material-symbols-outlined text-blue-500 text-xl">book_online</span>
                              <p className="text-[10px] font-bold text-blue-600 mt-1">Захиалга авах</p>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-2xl">
                              <span className="material-symbols-outlined text-purple-500 text-xl">workspace_premium</span>
                              <p className="text-[10px] font-bold text-purple-600 mt-1">Тусгай тэмдэг</p>
                          </div>
                      </div>
                  </div>
                  )}
              </div>
          )}

          {activeTab === 'bookings' && (
              <div className="space-y-6">
                  {isBusinessUser && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-5 rounded-3xl text-white shadow-lg">
                                <p className="text-[10px] font-black uppercase opacity-80 mb-1">{t('total_earnings')}</p>
                                <h4 className="text-2xl font-black">${totalEarnings}</h4>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-3xl text-white shadow-lg">
                                <p className="text-[10px] font-black uppercase opacity-80 mb-1">{t('total_bookings')}</p>
                                <h4 className="text-2xl font-black">{bookings.length}</h4>
                            </div>
                        </div>

                        {/* Service Stats Section */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                            <h3 className="font-extrabold text-sm dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-base">analytics</span>
                                {t('service_stats')}
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(serviceStats).map(([title, stats]) => (
                                    <div key={title} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-sm dark:text-white truncate">{title}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">{stats.count} {t('clients_count')}</p>
                                        </div>
                                        <div className="text-right pl-4">
                                            <p className="text-primary font-black text-base">${stats.income}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{t('income')}</p>
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(serviceStats).length === 0 && (
                                    <p className="text-center text-xs text-slate-400 py-2">No data yet.</p>
                                )}
                            </div>
                        </div>
                      </>
                  )}

                  <div className="space-y-4">
                      <h3 className="font-extrabold text-lg dark:text-white uppercase tracking-wider">{isBusinessUser ? t('bookings_list') : t('my_bookings')}</h3>
                      {bookings.length === 0 ? <div className="text-center py-10 text-slate-500"><p className="font-bold">{t('no_active_bookings')}</p></div> : bookings.map(b => (
                          <div key={b.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center">
                              <div>
                                  <p className="font-extrabold dark:text-white text-base">{isBusinessUser ? `Customer ID: ${b.customerId.substr(0, 5)}` : b.providerName}</p>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                      {b.serviceTitle && <span className="text-primary">{b.serviceTitle} • </span>}
                                      {new Date(b.date).toLocaleDateString()} • ${b.totalPrice}
                                  </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${b.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>{t(`status_${b.status}`)}</span>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {activeTab === 'ai_planner' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 animate-slide-up">
                  <h3 className="font-extrabold text-xl dark:text-white mb-4">{t('ai_planner')}</h3>
                  <div className="space-y-4">
                      <input value={aiDestination} onChange={e => setAiDestination(e.target.value)} placeholder={t('where_to_travel')} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-sm outline-none dark:text-white" />
                      <div className="grid grid-cols-2 gap-3">
                          <input type="number" value={aiDuration} onChange={e => setAiDuration(e.target.value)} placeholder={t('days')} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-sm outline-none dark:text-white" />
                          <select value={aiBudget} onChange={e => setAiBudget(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-sm outline-none dark:text-white"><option value="Economic">{t('budget_economic')}</option><option value="Standard">{t('budget_standard')}</option><option value="Luxury">{t('budget_luxury')}</option></select>
                      </div>
                      <button onClick={handleGeneratePlan} disabled={isAiGenerating} className="w-full bg-primary text-white font-extrabold py-4 rounded-2xl shadow-xl">{isAiGenerating ? "..." : t('generate_plan')}</button>
                  </div>
                  {aiResult && (
                      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                          <h4 className="font-extrabold text-sm dark:text-white mb-4">{t('itinerary')}:</h4>
                          <div className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-3xl text-sm whitespace-pre-wrap dark:text-slate-200">{aiResult}</div>

                          {/* Газрын зураг руу нэмэх — зөвхөн JSON parse амжилттай бол */}
                          {aiParsedPlan && (
                              <div className="mt-5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl p-4 border-2 border-amber-300 dark:border-amber-700">
                                  <p className="font-bold text-sm text-amber-800 dark:text-amber-300 mb-3">
                                      📍 Газрын зураг дээр харах уу?
                                  </p>
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
                                      Аль аяллын төлөвлөгөөний слот руу нэмэх вэ?
                                  </p>
                                  <div className="flex gap-2">
                                      {[0, 1, 2].map(i => (
                                          <button
                                              key={i}
                                              onClick={() => handleSendPlanToMap(i)}
                                              disabled={aiSendingToMap}
                                              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-transform"
                                          >
                                              <span className="material-symbols-outlined text-base">map</span>
                                              {i + 1}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          )}

          {/* --- ӨӨРЧЛӨЛТ 4: My Travels хэсэгт таны хуучин кодын Зургийн Цомгийг нэмлээ --- */}
          {(activeTab === 'travels' || activeTab === 'services') && (
              <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-lg dark:text-white uppercase tracking-wider">{activeTab === 'travels' ? t('my_travels') : t('my_services')}</h3>
                    <button 
                      onClick={() => navigate('/create')}
                      className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      {t('add_post')}
                    </button>
                  </div>
                  
                  {/* Энэ хэсгийг таны хуучин кодоос нэмэв: Зураг шууд нэмэх болон харах хэсэг */}
                  {activeTab === 'travels' && (
                      <div className="mb-6">
                           <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-slate-500 uppercase">{t('travel_gallery')}</span>
                                <label className="bg-primary text-white p-2 rounded-full cursor-pointer shadow-md active:scale-90 transition-transform">
                                    <span className="material-symbols-outlined text-sm">add_a_photo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAddTravelPhoto} />
                                </label>
                           </div>
                           
                           {/* Зургийн цомог */}
                           {auth.user?.travelPhotos && auth.user.travelPhotos.length > 0 && (
                               <div className="grid grid-cols-3 gap-2 mb-4">
                                   {auth.user.travelPhotos.map((photo, i) => (
                                       <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                                           <img src={photo} className="w-full h-full object-cover" alt="Travel" onClick={() => setLightboxSrc(photo)} />
                                           <button onClick={() => handleDeleteTravelPhoto(photo)} className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                               <span className="material-symbols-outlined text-[10px]">close</span>
                                           </button>
                                       </div>
                                   ))}
                                   {isUploadingPhoto && (
                                       <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300">
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                                       </div>
                                   )}
                               </div>
                           )}
                      </div>
                  )}

                  {/* Шинэ кодын Posts харуулдаг хэсэг */}
                  {userPosts.filter(p => activeTab === 'travels' ? ['travel','regular'].includes(p.type) : p.type === 'service').length === 0 ? (
                       (!auth.user?.travelPhotos || auth.user.travelPhotos.length === 0) && (
                         <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-100">
                             <p className="text-slate-400 font-bold">{t('no_posts')}</p>
                         </div>
                       )
                  ) : (
                       userPosts.filter(p => activeTab === 'travels' ? ['travel','regular'].includes(p.type) : p.type === 'service').map(post => (
                           <PostCard key={post._id} post={post} currentUserId={auth.user!._id} onLike={() => {}} />
                       ))
                  )}
              </div>
          )}

          {activeTab === 'saved' && (
              <div className="space-y-5">
                  {savedPosts.length === 0 ? <div className="text-center py-20 text-slate-500"><p className="font-bold">{t('no_results')}</p></div> : savedPosts.map(post => <PostCard key={post._id} post={post} currentUserId={auth.user!._id} onLike={() => {}} />)}
              </div>
          )}
      </div>
      {lightboxSrc && <ImageViewer src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      
      {/* Profile Edit Sheet */}
      {auth.user && (
        <ProfileEditSheet
          user={auth.user}
          isOpen={showEditSheet}
          onClose={() => setShowEditSheet(false)}
          onSave={handleProfileSave}
        />
      )}
    </div>
  );
};

export default Profile;
