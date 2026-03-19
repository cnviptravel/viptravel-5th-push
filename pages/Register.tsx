import React, { useState, useContext, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { apiRegister, apiFirebaseRegister, apiFirebaseCheckVerification, apiFirebaseResendVerification, apiLogin, apiSendOTP, apiVerifyOTP, apiUpdateProfile } from '../services/api';
import { AuthContext } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppConfig } from '../contexts/AppConfigContext';
import { useSnackbar } from '../contexts/SnackbarContext';

const Register: React.FC = () => {
  const { role } = useParams<{ role: UserRole }>();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { setAuth } = useContext(AuthContext);
  const { t } = useLanguage();
  const { config } = useAppConfig();

  const [step, setStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'telegram'>('email');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [telegramSession, setTelegramSession] = useState<{ sessionCode: string, botUsername: string } | null>(null);
  const [countryCode, setCountryCode] = useState('+976');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  
  // Ref to prevent multiple finalizeRegistration calls
  const isFinalizing = useRef(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({ 
    firstName: '', 
    lastName: '', 
    birthDate: '',
    email: '', 
    phone: '', 
    referralSource: '',
    password: '', 
    nationality: 'Mongolia' 
  });

  // Full list of country codes
  const countryCodes = [
    { code: "+976", country: "Mongolia", flag: "🇲🇳" },
    { code: "+1", country: "USA/Canada", flag: "🇺🇸/🇨🇦" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
    { code: "+86", country: "China", flag: "🇨🇳" },
    { code: "+82", country: "South Korea", flag: "🇰🇷" },
    { code: "+81", country: "Japan", flag: "🇯🇵" },
    { code: "+7", country: "Russia", flag: "🇷🇺" },
    { code: "+49", country: "Germany", flag: "🇩🇪" },
    { code: "+33", country: "France", flag: "🇫🇷" },
    { code: "+90", country: "Turkey", flag: "🇹🇷" },
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
    { code: "+55", country: "Brazil", flag: "🇧🇷" },
    { code: "+39", country: "Italy", flag: "🇮🇹" },
    { code: "+34", country: "Spain", flag: "🇪🇸" },
    { code: "+66", country: "Thailand", flag: "🇹🇭" },
    { code: "+84", country: "Vietnam", flag: "🇻🇳" },
    { code: "+62", country: "Indonesia", flag: "🇮🇩" },
    { code: "+60", country: "Malaysia", flag: "🇲🇾" },
    { code: "+65", country: "Singapore", flag: "🇸🇬" },
    { code: "+971", country: "UAE", flag: "🇦🇪" },
    { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
    { code: "+20", country: "Egypt", flag: "🇪🇬" },
    { code: "+27", country: "South Africa", flag: "🇿🇦" },
    { code: "+30", country: "Greece", flag: "🇬🇷" },
    { code: "+31", country: "Netherlands", flag: "🇳🇱" },
    { code: "+32", country: "Belgium", flag: "🇧🇪" },
    { code: "+41", country: "Switzerland", flag: "🇨🇭" },
    { code: "+43", country: "Austria", flag: "🇦🇹" },
    { code: "+45", country: "Denmark", flag: "🇩🇰" },
    { code: "+46", country: "Sweden", flag: "🇸🇪" },
    { code: "+47", country: "Norway", flag: "🇳🇴" },
    { code: "+48", country: "Poland", flag: "🇵🇱" },
    { code: "+52", country: "Mexico", flag: "🇲🇽" },
    { code: "+54", country: "Argentina", flag: "🇦🇷" },
    { code: "+56", country: "Chile", flag: "🇨🇱" },
    { code: "+57", country: "Colombia", flag: "🇨🇴" },
    { code: "+63", country: "Philippines", flag: "🇵🇭" },
    { code: "+64", country: "New Zealand", flag: "🇳🇿" },
    { code: "+92", country: "Pakistan", flag: "🇵🇰" },
    { code: "+93", country: "Afghanistan", flag: "🇦🇫" },
    { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
    { code: "+95", country: "Myanmar", flag: "🇲🇲" },
    { code: "+98", country: "Iran", flag: "🇮🇷" },
    { code: "+351", country: "Portugal", flag: "🇵🇹" },
    { code: "+353", country: "Ireland", flag: "🇮🇪" },
    { code: "+354", country: "Iceland", flag: "🇮🇸" },
    { code: "+358", country: "Finland", flag: "🇫🇮" },
    { code: "+376", country: "Andorra", flag: "🇦🇩" },
    { code: "+380", country: "Ukraine", flag: "🇺🇦" },
    { code: "+381", country: "Serbia", flag: "🇷🇸" },
    { code: "+385", country: "Croatia", flag: "🇭🇷" },
    { code: "+420", country: "Czech Republic", flag: "🇨🇿" },
    { code: "+502", country: "Guatemala", flag: "🇬🇹" },
    { code: "+503", country: "El Salvador", flag: "🇸🇻" },
    { code: "+504", country: "Honduras", flag: "🇭🇳" },
    { code: "+505", country: "Nicaragua", flag: "🇳🇮" },
    { code: "+506", country: "Costa Rica", flag: "🇨🇷" },
    { code: "+507", country: "Panama", flag: "🇵🇦" },
    { code: "+591", country: "Bolivia", flag: "🇧🇴" },
    { code: "+593", country: "Ecuador", flag: "🇪🇨" },
    { code: "+595", country: "Paraguay", flag: "🇵🇾" },
    { code: "+598", country: "Uruguay", flag: "🇺🇾" },
    { code: "+852", country: "Hong Kong", flag: "🇭🇰" },
    { code: "+886", country: "Taiwan", flag: "🇹🇼" }
  ].sort((a, b) => a.country.localeCompare(b.country));

  // Click outside to close country dropdown
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
              setShowCountryDropdown(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalSteps = 3;

  // No polling needed for OTP flow (except maybe checking if Telegram user started bot? No, explicit OTP entry)
  // We keep this empty or remove polling logic since we switched to manual OTP entry.

  const nextStep = () => {
    if (step === 1 && (!formData.firstName || !formData.lastName || !formData.birthDate)) {
        showSnackbar("Please fill in all fields", 'warning');
        return;
    }
    if (step === 2 && (!formData.email || !formData.phone)) {
        showSnackbar("Please fill in all fields", 'warning');
        return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.password || !formData.referralSource) {
        showSnackbar("Please fill in all fields", 'warning');
        return;
    }

    // Firebase password requirements: min 8 chars, uppercase, lowercase, number, special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
        showSnackbar("Нууц үг доорх шаардлагыг хангасан байх ёстой:\n• Хамгийн багадаа 8 тэмдэгт\n• Том үсэг (A-Z)\n• Жижиг үсэг (a-z)\n• Тоо (0-9)\n• Тусгай тэмдэгт (!@#$%^&*)", 'info');
        return;
    }

    setLoading(true);

    // If OTP already sent, verify it
    if (otpSent) {
        try {
            const identifier = verificationMethod === 'telegram' 
                ? `${countryCode}${formData.phone}` 
                : formData.email;
            
            const verified = await apiVerifyOTP(verificationMethod, identifier, otpCode);
            if (verified) {
                finalizeRegistration();
            } else {
                showSnackbar("Invalid OTP code. Please try again.", 'error');
                setLoading(false);
            }
        } catch (err: any) {
            showSnackbar("Verification failed: " + err.message, 'error');
            setLoading(false);
        }
        return;
    }
    
    // Send OTP
    try {
        const identifier = verificationMethod === 'telegram' 
            ? `${countryCode}${formData.phone}` 
            : formData.email;
            
        const res = await apiSendOTP(verificationMethod, identifier);
        
        if (verificationMethod === 'telegram') {
            setTelegramSession({ sessionCode: res.sessionCode, botUsername: res.botUsername });
        }
        
        setOtpSent(true);
        setIsVerifying(true);
        setLoading(false);
        
        if (verificationMethod === 'email') {
            showSnackbar(`OTP code sent to ${identifier}. Please check your email (and spam folder).`, 'success');
        }
    } catch (err: any) {
        showSnackbar(err.message || "Failed to send OTP", 'error');
        setLoading(false);
    }
  };

  const finalizeRegistration = async () => {
      if (isFinalizing.current) return;
      isFinalizing.current = true;

      setLoading(true);
      try {
          // 1. Create Firebase account
          try {
              const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import("firebase/auth");
              const { auth } = await import("../services/firebase");
              try {
                  console.log("Creating Firebase user with email:", formData.email);
                  const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                  console.log("Firebase user created:", userCredential.user.uid);
                  
                  // Send email verification
                  const { sendEmailVerification } = await import("firebase/auth");
                  await sendEmailVerification(userCredential.user);
                  console.log("Email verification sent");
              } catch (e: any) {
                  console.log("Firebase auth error:", e.code, e.message);
                  if (e.code === 'auth/email-already-in-use') {
                      // User already exists in Firebase, try to sign in
                      console.log("Firebase user already exists, signing in...");
                      await signInWithEmailAndPassword(auth, formData.email, formData.password);
                  } else {
                      // If Firebase fails, we can still proceed with backend registration
                      // but log the error
              console.error("Firebase auth FAILED - code:", e.code, "message:", e.message, "email:", formData.email);
              showSnackbar("Firebase error: " + e.code + " - " + e.message, 'error');
                  }
              }
          } catch (e) {
              console.error("Firebase auth setup failed:", e);
              // Continue with backend registration even if Firebase fails
          }

          const payload = { 
            full_name: `${formData.lastName} ${formData.firstName}`,
            first_name: formData.firstName,
            last_name: formData.lastName,
            birth_date: formData.birthDate,
            referral_source: formData.referralSource,
            email: formData.email, 
            phone: `${countryCode}${formData.phone}`, 
            password: formData.password, 
            role: role || UserRole.Traveler,
            isEmailVerified: verificationMethod === 'email' ? true : false,
            isPhoneVerified: verificationMethod === 'telegram' ? true : false
          };
          
          console.log("Registering user in backend with payload:", { ...payload, password: '***' });
          
          // 2. Save metadata to custom backend DB
          let user = await apiRegister(payload); 
          console.log("Backend registration successful, user:", user._id);
          
          // Update verification status based on method
          try {
              if (verificationMethod === 'telegram') {
                  user = await apiUpdateProfile(user._id, { isPhoneVerified: true });
              }
              // Email verification is handled by Firebase email verification
          } catch (e) { 
              console.error("Failed to update verification status", e); 
          }

          setAuth({ user: user, isAuthenticated: true, isLoading: false });
          showSnackbar(t('registration_success') || "Registration successful!", 'success');
          navigate('/');
      } catch (err: any) {
          console.error("Registration error:", err);
          
          // If user already exists in DB (e.g. race condition or previous attempt), try logging in
          if (err.message && err.message.includes("Email exists") || err.message.includes("already exists")) {
              try {
                  console.log("User already exists, attempting login...");
                  const user = await apiLogin(formData.email, formData.password);
                  setAuth({ user: user, isAuthenticated: true, isLoading: false });
                  showSnackbar("Email verified and logged in successfully!", 'success');
                  navigate('/');
                  return;
              } catch (loginErr) {
                  console.error("Fallback login failed:", loginErr);
              }
          }

          showSnackbar(err.message || 'Registration failed. Please try again.', 'error');
          setIsVerifying(false);
          isFinalizing.current = false;
      } finally {
          setLoading(false);
      }
  };

  const handleResend = async () => {
      try {
          await apiFirebaseResendVerification();
          showSnackbar("Verification email resent!", 'success');
      } catch (e) {
          showSnackbar("Failed to resend email.", 'error');
      }
  };

  const referralOptions = [
    { value: 'social', label: t('ref_social') },
    { value: 'friend', label: t('ref_friend') },
    { value: 'ad', label: t('ref_ad') },
    { value: 'other', label: t('ref_other') },
  ];

  if (isVerifying) {
    return (
        <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
            <div className="mb-8">
                <span className="material-symbols-outlined text-primary text-7xl">
                    {verificationMethod === 'telegram' ? 'send_to_mobile' : 'mark_email_read'}
                </span>
            </div>
            <h2 className="text-2xl font-bold dark:text-white mb-4">
                {t('enter_otp') || "Enter Verification Code"}
            </h2>
            
            {verificationMethod === 'telegram' && telegramSession && (
                <div className="mb-6 space-y-4">
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        1. Click the button below to start the Telegram bot.<br/>
                        2. Share your contact with the bot.<br/>
                        3. The bot will send you a 6-digit code.<br/>
                        4. Enter the code below.
                    </p>
                    <a 
                        href={`https://t.me/${telegramSession.botUsername}?start=${telegramSession.sessionCode}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#229ED9] text-white rounded-lg font-bold hover:bg-[#1b8bc2] transition-colors"
                    >
                        <span className="material-symbols-outlined">telegram</span>
                        Get Code from Telegram
                    </a>
                </div>
            )}

            {verificationMethod === 'email' && (
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    We've sent a 6-digit code to <strong>{formData.email}</strong>. Please check your inbox (and spam folder).
                </p>
            )}

            <div className="w-full space-y-4">
                <input
                    type="text"
                    maxLength={6}
                    className="w-full text-center text-3xl font-bold tracking-widest border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-transparent dark:text-white outline-none focus:border-primary uppercase"
                    placeholder="000000"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                />
                
                <button 
                    onClick={handleSubmit} 
                    disabled={otpCode.length !== 6 || loading}
                    className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                >
                    {loading ? 'Verifying...' : 'Verify Code'}
                </button>

                <button 
                    onClick={() => {
                        setIsVerifying(false);
                        setOtpSent(false);
                        setOtpCode('');
                    }}
                    className="text-slate-400 text-sm hover:underline"
                >
                    Back to registration
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col max-w-md mx-auto relative overflow-hidden font-sans">
       
       {/* --- HEADER --- */}
       <div className="w-full p-6 flex flex-col items-center">
           <div className="mb-4">
            {config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-xl" />
            ) : (
                <span className="material-symbols-outlined text-primary text-4xl">explore</span>
            )}
           </div>
           <h1 className="text-2xl font-medium dark:text-white text-center">{t('create_account')}</h1>
           <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">to continue to {config.appName || 'VipTravel'}</p>
           <p className="inline-block mt-3 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-500">{t(role || 'traveler')}</p>
       </div>

       <div className="flex-1 px-8 pt-2">
           {/* Progress Bar */}
           <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mb-8 overflow-hidden">
               <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${(step / totalSteps) * 100}%` }}
               />
           </div>

           <form onSubmit={e => e.preventDefault()} className="space-y-6">
               
               {/* STEP 1: PERSONAL INFO */}
               {step === 1 && (
                   <div className="space-y-5 animate-fade-in">
                       <div className="relative group">
                           <input 
                            required 
                            type="text" 
                            className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 pt-6 pb-2 bg-transparent dark:text-white outline-none focus:border-primary transition-colors peer" 
                            placeholder=" "
                            value={formData.lastName} 
                            onChange={e => setFormData({...formData, lastName: e.target.value})} 
                           />
                           <label className="absolute left-4 top-4 text-slate-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs">{t('last_name')}</label>
                       </div>

                       <div className="relative group">
                           <input 
                            required 
                            type="text" 
                            className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 pt-6 pb-2 bg-transparent dark:text-white outline-none focus:border-primary transition-colors peer" 
                            placeholder=" "
                            value={formData.firstName} 
                            onChange={e => setFormData({...formData, firstName: e.target.value})} 
                           />
                           <label className="absolute left-4 top-4 text-slate-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs">{t('first_name')}</label>
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">{t('birth_date')}</label>
                           <input 
                            required 
                            type="date" 
                            className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-transparent dark:text-white outline-none focus:border-primary transition-colors" 
                            value={formData.birthDate} 
                            onChange={e => setFormData({...formData, birthDate: e.target.value})} 
                           />
                       </div>
                   </div>
               )}

               {/* STEP 2: CONTACT INFO */}
               {step === 2 && (
                   <div className="space-y-5 animate-fade-in">
                       <div className="relative group">
                           <input 
                            required 
                            type="email" 
                            className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 pt-6 pb-2 bg-transparent dark:text-white outline-none focus:border-primary transition-colors peer" 
                            placeholder=" "
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                           />
                           <label className="absolute left-4 top-4 text-slate-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs">{t('email')}</label>
                       </div>

                       <div className="flex gap-2">
                           {/* Custom Country Dropdown */}
                           <div className="relative w-[140px]" ref={countryDropdownRef}>
                               <button
                                type="button"
                                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                                className="w-full h-full min-h-[56px] border-2 border-slate-200 dark:border-slate-700 rounded-lg px-3 flex items-center justify-between bg-transparent dark:text-white outline-none focus:border-primary transition-colors"
                               >
                                   <div className="flex items-center gap-2 overflow-hidden">
                                       <span className="text-lg">{countryCodes.find(c => c.code === countryCode)?.flag}</span>
                                       <span className="text-sm font-medium truncate">{countryCode}</span>
                                   </div>
                                   <span className="text-xs text-slate-500">▼</span>
                               </button>
                               
                               {showCountryDropdown && (
                                   <div className="absolute top-full left-0 w-[280px] max-h-[300px] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 mt-2">
                                       {countryCodes.map(c => (
                                           <button
                                            key={c.code + c.country}
                                            type="button"
                                            onClick={() => {
                                                setCountryCode(c.code);
                                                setShowCountryDropdown(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors ${countryCode === c.code ? 'bg-primary/5 text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                           >
                                               <span className="text-xl">{c.flag}</span>
                                               <div className="flex flex-col">
                                                   <span className="text-sm font-bold">{c.country}</span>
                                                   <span className="text-xs opacity-70">{c.code}</span>
                                               </div>
                                           </button>
                                       ))}
                                   </div>
                               )}
                           </div>

                           <div className="relative group flex-1">
                               <input 
                                required 
                                type="tel" 
                                className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 pt-6 pb-2 bg-transparent dark:text-white outline-none focus:border-primary transition-colors peer" 
                                placeholder=" "
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})} 
                               />
                               <label className="absolute left-4 top-4 text-slate-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs">{t('phone')}</label>
                           </div>
                       </div>
                   </div>
               )}

               {/* STEP 3: REFERRAL & PASSWORD */}
               {step === 3 && (
                   <div className="space-y-5 animate-fade-in">
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{t('verification_method') || "Verification Method"}</label>
                           <div className="grid grid-cols-2 gap-2">
                               <button
                                type="button"
                                onClick={() => setVerificationMethod('email')}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${verificationMethod === 'email' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 dark:text-slate-400'}`}
                               >
                                   <span className="material-symbols-outlined">mail</span>
                                   <span className="font-bold text-sm">Email</span>
                               </button>
                               <button
                                type="button"
                                onClick={() => setVerificationMethod('telegram')}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${verificationMethod === 'telegram' ? 'border-[#229ED9] bg-[#229ED9]/5 text-[#229ED9]' : 'border-slate-100 dark:border-slate-800 dark:text-slate-400'}`}
                               >
                                   <span className="material-symbols-outlined">send_to_mobile</span>
                                   <span className="font-bold text-sm">Telegram</span>
                               </button>
                           </div>
                       </div>

                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{t('referral_source')}</label>
                           <div className="grid grid-cols-1 gap-2">
                               {referralOptions.map(opt => (
                                   <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setFormData({...formData, referralSource: opt.value})}
                                    className={`text-left p-4 rounded-xl border-2 transition-all ${formData.referralSource === opt.value ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-slate-100 dark:border-slate-800 dark:text-slate-400'}`}
                                   >
                                       {opt.label}
                                   </button>
                               ))}
                           </div>
                       </div>

                       <div className="relative group">
                           <input 
                            required 
                            type={showPassword ? "text" : "password"} 
                            className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 pt-6 pb-2 bg-transparent dark:text-white outline-none focus:border-primary transition-colors peer" 
                            placeholder=" "
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})} 
                           />
                           <label className="absolute left-4 top-4 text-slate-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs">{t('password')}</label>
                           <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                           </button>
                       </div>
                       <div className="text-xs text-slate-400 mt-1 ml-1 space-y-0.5">
                           <p className={formData.password.length >= 8 ? 'text-green-500' : ''}>• Хамгийн багадаа 8 тэмдэгт</p>
                           <p className={/[A-Z]/.test(formData.password) ? 'text-green-500' : ''}>• Том үсэг (A-Z)</p>
                           <p className={/[a-z]/.test(formData.password) ? 'text-green-500' : ''}>• Жижиг үсэг (a-z)</p>
                           <p className={/\d/.test(formData.password) ? 'text-green-500' : ''}>• Тоо (0-9)</p>
                           <p className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-green-500' : ''}>• Тусгай тэмдэгт (!@#$%^&*)</p>
                       </div>
                   </div>
               )}

               {/* Navigation Buttons */}
               <div className="flex items-center justify-between mt-10">
                   {step > 1 ? (
                       <button 
                        type="button" 
                        onClick={prevStep} 
                        className="text-primary font-bold px-4 py-2 rounded-lg hover:bg-primary/5 transition-colors"
                       >
                           {t('back')}
                       </button>
                   ) : (
                       <button 
                        type="button" 
                        onClick={() => navigate('/role-select')} 
                        className="text-slate-400 font-bold px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                       >
                           {t('cancel')}
                       </button>
                   )}

                   {step < totalSteps ? (
                       <button 
                        type="button" 
                        onClick={nextStep} 
                        className="bg-primary text-white font-bold px-8 py-3 rounded-lg shadow-lg shadow-primary/20 active:scale-95 transition-all"
                       >
                           {t('next')}
                       </button>
                   ) : (
                       <button 
                        type="button" 
                        onClick={handleSubmit} 
                        disabled={loading}
                        className="bg-primary text-white font-bold px-8 py-3 rounded-lg shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                       >
                           {loading ? t('creating_account') : t('sign_up')}
                       </button>
                   )}
               </div>
           </form>
           
           <div className="mt-12 text-center">
               <p className="text-sm text-slate-500">
                   Already have an account? {' '}
                   <button onClick={() => navigate('/login')} className="text-primary font-bold hover:underline">Sign in</button>
               </p>
           </div>
       </div>
    </div>
  );
};

export default Register;
