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
  const [aiResult, setAiResult] = useState<string>(() => {
    try { return localStorage.getItem('vt_ai_result') || ''; } catch { return ''; }
  });
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiParsedPlan, setAiParsedPlan] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('vt_ai_parsed_plan') || 'null'); } catch { return null; }
  });
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
    const handleNewPost = (e: any) => {
      const newPost = e.detail;
      if (newPost.userId === auth.user?._id) {
        setUserPosts(prevPosts => [newPost, ...prevPosts]);
      }
    };
    
    document.addEventListener('new-post', handleNewPost);
    return () => document.removeEventListener('new-post', handleNewPost);
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
      setAiResult('');
      try { localStorage.removeItem('vt_ai_parsed_plan'); localStorage.removeItem('vt_ai_result'); } catch {}
      setAiSendingToMap(false);

      const systemPrompt = `You are an expert Mongolian travel planner with deep knowledge of Mongolia's geography, nature, and tourism.
You MUST respond ONLY with a valid JSON object. No markdown, no explanation, no text before or after the JSON.
The JSON must have this exact structure:
{
  "title": "short trip title in Mongolian",
  "summary": "2-3 sentence overview in Mongolian",
  "stops": [
    {
      "name": "Газрын нэр монголоор",
      "description": "Яагаад зочлох хэрэгтэй, юу хийх вэ (2-3 өгүүлбэр)",
      "lat": 47.9221,
      "lng": 106.9155,
      "day": 1,
      "distanceFromPrevKm": 0,
      "travelTimeMin": 0
    }
  ]
}
CRITICAL RULES:
- lat/lng must be REAL, ACCURATE GPS coordinates for actual places in Mongolia
- stops: 4 to 8 stops total
- distanceFromPrevKm: road distance in km from previous stop (0 for first stop)
- travelTimeMin: estimated drive time in minutes (0 for first stop)
- All text in Mongolian language
- Return ONLY the JSON, nothing else`;

      const userMessage = `Create a ${aiDuration}-day trip plan to: "${aiDestination}", budget: ${aiBudget}.`;

      try {
          // Try Anthropic API directly
          const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'anthropic-version': '2023-06-01',
                  'anthropic-dangerous-direct-browser-access': 'true',
              },
              body: JSON.stringify({
                  model: 'claude-haiku-4-5-20251001',
                  max_tokens: 2048,
                  system: systemPrompt,
                  messages: [{ role: 'user', content: userMessage }],
              }),
          });

          if (!response.ok) {
              // Fallback to backend
              throw new Error(`Anthropic API error: ${response.status}`);
          }

          const data = await response.json() as any;
          const rawText = data?.content?.[0]?.text || '';

          // Extract JSON from response
          let parsed: any = null;
          // Try direct parse first
          try { parsed = JSON.parse(rawText.trim()); } catch {}
          // Try extracting JSON block
          if (!parsed) {
              const match = rawText.match(/\{[\s\S]*\}/);
              if (match) { try { parsed = JSON.parse(match[0]); } catch {} }
          }

          if (parsed?.stops && Array.isArray(parsed.stops) && parsed.stops.length > 0) {
              setAiParsedPlan(parsed);
              try { localStorage.setItem('vt_ai_parsed_plan', JSON.stringify(parsed)); } catch {}
              setAiResult(parsed.title);
              try { localStorage.setItem('vt_ai_result', parsed.title); } catch {}
          } else {
              showSnackbar('Төлөвлөгөөний формат буруу байна. Дахин оролдоно уу.', 'error');
          }
      } catch (err: any) {
          console.error('Trip plan generation error:', err);
          // Fallback: try backend
          try {
              const backendRes = await fetch('https://viptravel-backend.erdneebatulzii23.workers.dev/ai/plan', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ destination: aiDestination, duration: aiDuration, budget: aiBudget, language: 'Mongolian' }),
              });
              const backendData = await backendRes.json() as any;
              const raw = backendData.plan || '';
              let parsed: any = null;
              const match = (typeof raw === 'string' ? raw : JSON.stringify(raw)).match(/\{[\s\S]*\}/);
              if (match) { try { parsed = JSON.parse(match[0]); } catch {} }
              if (parsed?.stops?.length) {
                  setAiParsedPlan(parsed);
                  try { localStorage.setItem('vt_ai_parsed_plan', JSON.stringify(parsed)); } catch {}
                  setAiResult(parsed.title);
              } else {
                  showSnackbar('Алдаа гарлаа. Дахин оролдоно уу.', 'error');
              }
          } catch {
              showSnackbar('Сүлжээний алдаа гарлаа. Дахин оролдоно уу.', 'error');
          }
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
                          {(auth.user as any)?.hobbies && (auth.user as any).hobbies.length > 0 && auth.user?.privacy?.showHobbies !== false && (
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
              <div className="space-y-5 animate-slide-up">
                  {/* Header */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-3xl p-6 shadow-2xl">
                      <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
                      <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                                  <span className="material-symbols-outlined text-white text-xl">auto_awesome</span>
                              </div>
                              <div>
                                  <h3 className="font-black text-white text-lg leading-tight">{t('ai_planner')}</h3>
                                  <p className="text-white/70 text-xs font-medium">AI-аар аяллын төлөвлөгөө гарга</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Input Form */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-lg border border-slate-100 dark:border-slate-800">
                      <div className="space-y-3">
                          <div className="relative">
                              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base">location_on</span>
                              <input
                                  value={aiDestination}
                                  onChange={e => setAiDestination(e.target.value)}
                                  placeholder={t('where_to_travel')}
                                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl pl-11 pr-4 py-4 text-sm outline-none dark:text-white font-medium border border-transparent focus:border-blue-300 dark:focus:border-blue-600 transition-colors"
                              />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <div className="relative">
                                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">calendar_today</span>
                                  <input
                                      type="number"
                                      value={aiDuration}
                                      onChange={e => setAiDuration(e.target.value)}
                                      placeholder={t('days')}
                                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl pl-11 pr-4 py-4 text-sm outline-none dark:text-white font-medium border border-transparent focus:border-blue-300 transition-colors"
                                  />
                              </div>
                              <div className="relative">
                                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">wallet</span>
                                  <select
                                      value={aiBudget}
                                      onChange={e => setAiBudget(e.target.value)}
                                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl pl-11 pr-4 py-4 text-sm outline-none dark:text-white font-medium appearance-none border border-transparent focus:border-blue-300 transition-colors"
                                  >
                                      <option value="Economic">{t('budget_economic')}</option>
                                      <option value="Standard">{t('budget_standard')}</option>
                                      <option value="Luxury">{t('budget_luxury')}</option>
                                  </select>
                              </div>
                          </div>
                          <button
                              onClick={handleGeneratePlan}
                              disabled={isAiGenerating || !aiDestination || !aiDuration}
                              className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                          >
                              {isAiGenerating ? (
                                  <>
                                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                                      <span className="text-sm">Төлөвлөгөө гаргаж байна...</span>
                                  </>
                              ) : (
                                  <>
                                      <span className="material-symbols-outlined text-base">auto_awesome</span>
                                      <span className="text-sm">{t('generate_plan')}</span>
                                  </>
                              )}
                          </button>
                      </div>
                  </div>

                  {/* Results Section */}
                  {aiParsedPlan && (
                      <div className="space-y-4">
                          {/* Trip Title & Summary */}
                          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-lg border border-slate-100 dark:border-slate-800">
                              <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                                      <span className="material-symbols-outlined text-white text-lg">travel_explore</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <h4 className="font-black text-slate-900 dark:text-white text-base leading-tight">{aiParsedPlan.title}</h4>
                                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">{aiParsedPlan.summary}</p>
                                  </div>
                              </div>
                              {/* Quick stats */}
                              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                  <div className="text-center">
                                      <p className="font-black text-blue-600 text-lg">{aiDuration}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">Өдөр</p>
                                  </div>
                                  <div className="text-center border-x border-slate-100 dark:border-slate-800">
                                      <p className="font-black text-blue-600 text-lg">{aiParsedPlan.stops?.length || 0}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">Зогсоол</p>
                                  </div>
                                  <div className="text-center">
                                      <p className="font-black text-blue-600 text-lg">{aiBudget === 'Luxury' ? '💎' : aiBudget === 'Economic' ? '💰' : '⭐'}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">{aiBudget}</p>
                                  </div>
                              </div>
                          </div>

                          {/* Mini Static Map Preview */}
                          {aiParsedPlan.stops && aiParsedPlan.stops.length > 0 && (
                              <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-800">
                                  <div className="relative">
                                      {/* OpenStreetMap static map via overpass bbox */}
                                      {(() => {
                                          const stops = aiParsedPlan.stops;
                                          const lats = stops.map((s: any) => s.lat);
                                          const lngs = stops.map((s: any) => s.lng);
                                          const minLat = Math.min(...lats) - 0.5;
                                          const maxLat = Math.max(...lats) + 0.5;
                                          const minLng = Math.min(...lngs) - 0.5;
                                          const maxLng = Math.max(...lngs) + 0.5;
                                          const centerLat = (minLat + maxLat) / 2;
                                          const centerLng = (minLng + maxLng) / 2;
                                          // Use OpenStreetMap tile-based static map
                                          const zoom = 6;
                                          const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik&marker=${centerLat},${centerLng}`;
                                          return (
                                              <div className="relative">
                                                  <div className="absolute top-3 left-3 z-10 bg-white dark:bg-slate-900 rounded-xl px-3 py-1.5 shadow-md border border-slate-100 dark:border-slate-700">
                                                      <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                                                          <span className="material-symbols-outlined text-blue-500 text-xs">map</span>
                                                          Маршрут
                                                      </p>
                                                  </div>
                                                  <iframe
                                                      src={mapUrl}
                                                      width="100%"
                                                      height="200"
                                                      style={{border: 0, display: 'block'}}
                                                      title="Trip Map"
                                                      loading="lazy"
                                                  />
                                                  <div className="absolute bottom-3 right-3 z-10">
                                                      <button
                                                          onClick={() => handleSendPlanToMap(0)}
                                                          disabled={aiSendingToMap}
                                                          className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg flex items-center gap-1.5 active:scale-95 transition-transform"
                                                      >
                                                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                          Дэлгэрэнгүй зураг
                                                      </button>
                                                  </div>
                                              </div>
                                          );
                                      })()}
                                  </div>
                              </div>
                          )}

                          {/* Day-by-day Stops */}
                          <div className="space-y-3">
                              <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider px-1 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-blue-500 text-base">route</span>
                                  Аяллын маршрут
                              </h4>
                              {aiParsedPlan.stops?.map((stop: any, i: number) => {
                                  // Generate nature image for location using Unsplash
                                  const photoQuery = encodeURIComponent(`${stop.name} Mongolia nature landscape`);
                                  const photoUrl = `https://source.unsplash.com/400x200/?${photoQuery}&sig=${i}`;
                                  const isLast = i === aiParsedPlan.stops.length - 1;
                                  return (
                                      <div key={i} className="relative">
                                          {/* Connector line */}
                                          {!isLast && (
                                              <div className="absolute left-[22px] top-[64px] w-0.5 h-8 bg-gradient-to-b from-blue-300 to-transparent z-10"></div>
                                          )}
                                          <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-md border border-slate-100 dark:border-slate-800 active:scale-[0.99] transition-transform">
                                              {/* Nature photo */}
                                              <div className="relative h-36 overflow-hidden bg-slate-100 dark:bg-slate-800">
                                                  <img
                                                      src={photoUrl}
                                                      alt={stop.name}
                                                      className="w-full h-full object-cover"
                                                      onError={(e) => {
                                                          // Fallback gradient if image fails
                                                          (e.target as HTMLImageElement).style.display = 'none';
                                                      }}
                                                  />
                                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                                  {/* Day badge */}
                                                  <div className="absolute top-3 left-3">
                                                      <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md">
                                                          {stop.day}-р өдөр
                                                      </span>
                                                  </div>
                                                  {/* Stop number */}
                                                  <div className="absolute top-3 right-3">
                                                      <div className="w-7 h-7 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md">
                                                          <span className="text-blue-700 font-black text-xs">{i + 1}</span>
                                                      </div>
                                                  </div>
                                                  {/* Location name overlay */}
                                                  <div className="absolute bottom-3 left-3 right-3">
                                                      <p className="text-white font-black text-base leading-tight drop-shadow-md">{stop.name}</p>
                                                  </div>
                                              </div>
                                              {/* Stop details */}
                                              <div className="p-4">
                                                  <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">{stop.description}</p>
                                                  {/* Travel info from previous */}
                                                  {stop.distanceFromPrevKm > 0 && (
                                                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                          <div className="flex items-center gap-1 text-slate-400">
                                                              <span className="material-symbols-outlined text-xs">directions_car</span>
                                                              <span className="text-[11px] font-bold">{stop.distanceFromPrevKm} км</span>
                                                          </div>
                                                          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
                                                          <div className="flex items-center gap-1 text-slate-400">
                                                              <span className="material-symbols-outlined text-xs">schedule</span>
                                                              <span className="text-[11px] font-bold">~{stop.travelTimeMin >= 60 ? `${Math.floor(stop.travelTimeMin/60)}ц ${stop.travelTimeMin%60}м` : `${stop.travelTimeMin} мин`}</span>
                                                          </div>
                                                          <div className="ml-auto">
                                                              <div className="flex items-center gap-1">
                                                                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                                                  <div className="w-3 h-px bg-blue-200"></div>
                                                                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                                                              </div>
                                                          </div>
                                                      </div>
                                                  )}
                                                  {/* Coordinates */}
                                                  <div className="flex items-center gap-1 mt-2">
                                                      <span className="material-symbols-outlined text-slate-300 text-xs">my_location</span>
                                                      <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">{stop.lat?.toFixed(4)}, {stop.lng?.toFixed(4)}</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>

                          {/* Send to Full Map */}
                          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 rounded-3xl p-5 border-2 border-indigo-200 dark:border-indigo-800">
                              <div className="flex items-center gap-3 mb-3">
                                  <span className="material-symbols-outlined text-indigo-500 text-xl">map</span>
                                  <div>
                                      <p className="font-black text-sm text-indigo-800 dark:text-indigo-300">Газрын зураг дээр харах</p>
                                      <p className="text-xs text-indigo-500 dark:text-indigo-400">Аяллын слот сонго</p>
                                  </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                  {[0, 1, 2].map(i => (
                                      <button
                                          key={i}
                                          onClick={() => handleSendPlanToMap(i)}
                                          disabled={aiSendingToMap}
                                          className="py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-md shadow-indigo-500/20"
                                      >
                                          <span className="material-symbols-outlined text-base">map</span>
                                          <span className="text-[10px]">Слот {i + 1}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>

                          {/* Reset */}
                          <button
                              onClick={() => { setAiResult(''); setAiParsedPlan(null); try { localStorage.removeItem('vt_ai_result'); localStorage.removeItem('vt_ai_parsed_plan'); } catch {} }}
                              className="w-full py-3 text-slate-400 dark:text-slate-600 text-xs font-bold flex items-center justify-center gap-1.5 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                          >
                              <span className="material-symbols-outlined text-sm">refresh</span>
                              Шинэ төлөвлөгөө гаргах
                          </button>
                      </div>
                  )}

                  {/* Empty state with loading skeleton */}
                  {isAiGenerating && !aiParsedPlan && (
                      <div className="space-y-3">
                          {[1, 2, 3].map(i => (
                              <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-md border border-slate-100 dark:border-slate-800 animate-pulse">
                                  <div className="h-36 bg-slate-100 dark:bg-slate-800"></div>
                                  <div className="p-4 space-y-2">
                                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4"></div>
                                      <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded-full w-full"></div>
                                      <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded-full w-5/6"></div>
                                  </div>
                              </div>
                          ))}
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
