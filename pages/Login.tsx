import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiLogin, apiSendRecoveryEmail, apiResetPassword, apiFirebaseResendVerification, apiFirebaseCheckVerification } from '../services/api';
import { auth as firebaseAuth } from '../services/firebase';
import { AuthContext } from '../App';
import { useLanguage, supportedLanguages } from '../contexts/LanguageContext';
// 1. Config import
import { useAppConfig } from '../contexts/AppConfigContext';
import { useSnackbar } from '../contexts/SnackbarContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { setAuth } = useContext(AuthContext);
  const { t, setLanguage, language } = useLanguage();
  
  // 2. Config дуудах
  const { config } = useAppConfig();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  // Recovery State
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isVerifying, setIsVerifying] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');

  // Poll for verification if redirected to verifying state during login
  useEffect(() => {
    let interval: any;
    if (isVerifying) {
        interval = setInterval(async () => {
            const isVerified = await apiFirebaseCheckVerification();
            if (isVerified) {
                clearInterval(interval);
                // After verification, try login again automatically
                apiLogin(email, password).then(user => {
                    setAuth({ user, isAuthenticated: true, isLoading: false });
                    navigate('/');
                }).catch(err => {
                    console.error("Auto login failed", err);
                    setIsVerifying(false);
                });
            }
        }, 3000);
    }
    return () => clearInterval(interval);
  }, [isVerifying, email, password, navigate, setAuth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await apiLogin(email, password);
      setAuth({ user, isAuthenticated: true, isLoading: false });
      navigate('/');
    } catch (err: any) {
      if (err.message === "EMAIL_NOT_VERIFIED") {
          setLoginEmail(email);
          setIsVerifying(true);
      } else {
          showSnackbar("Invalid email or password", 'error');
      }
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

  const handleSendRecoveryCode = async () => {
      if (!recoveryEmail) return;
      setLoading(true);
      try {
          await apiSendRecoveryEmail(recoveryEmail);
          showSnackbar(t('code_sent'), 'success');
          setRecoveryStep(2);
      } catch (e: any) {
          showSnackbar(e.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  const handleResetPassword = async () => {
      if (!recoveryCode || !newPassword) return;
      setLoading(true);
      try {
          await apiResetPassword(recoveryEmail, recoveryCode, newPassword);
          showSnackbar("Password updated successfully", 'success');
          setShowRecovery(false);
          setRecoveryStep(1);
          setRecoveryEmail('');
          setRecoveryCode('');
          setNewPassword('');
      } catch (e: any) {
          showSnackbar(e.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  if (isVerifying) {
    return (
        <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
            <div className="mb-8">
                <span className="material-symbols-outlined text-primary text-7xl animate-pulse">mark_email_read</span>
            </div>
            <h2 className="text-2xl font-bold dark:text-white mb-4">Verify your email</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Your email <strong className="text-slate-900 dark:text-white">{loginEmail}</strong> is not verified yet.<br/>
                Please click the link in the email we sent you.
            </p>
            <div className="space-y-4 w-full">
                <div className="flex items-center justify-center gap-2 text-primary font-bold">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    Waiting for verification...
                </div>
                <button 
                    onClick={handleResend}
                    className="w-full py-4 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white hover:bg-slate-50 transition-colors"
                >
                    Resend email
                </button>
                <button 
                    onClick={() => setIsVerifying(false)}
                    className="text-slate-400 text-sm hover:underline"
                >
                    Back to login
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-6 flex flex-col justify-center items-center max-w-md mx-auto relative overflow-hidden">

      {/* Буцах товч */}
      <button 
        onClick={() => navigate(-1)} 
        className="absolute top-4 left-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-2 rounded-full text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors z-10"
      >
        <span className="material-symbols-outlined">arrow_back</span>
      </button>

      {/* --- ХЭЛ СОЛИХ ХЭСЭГ --- */}
       <div className="absolute top-6 right-6 z-50" ref={langMenuRef}>
           <button 
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 transition-all hover:scale-105 active:scale-95"
           >
               <img 
                 src={`https://flagcdn.com/w40/${
                    language === 'en' ? 'gb' : 
                    language === 'ja' ? 'jp' : 
                    language === 'ko' ? 'kr' : 
                    language
                 }.png`} 
                 alt={language}
                 className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
               />
               <span className="uppercase font-extrabold tracking-wider text-xs">{language}</span>
               <span className={`material-symbols-outlined text-lg transition-transform duration-300 ${showLangMenu ? 'rotate-180' : ''}`}>
                   expand_more
               </span>
           </button>
           
           {showLangMenu && (
               <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-fade-in origin-top-right">
                   <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
                       {supportedLanguages.map((langOption) => {
                           let countryCode = langOption.code as string;
                           if (countryCode === 'en') countryCode = 'gb';
                           if (countryCode === 'ja') countryCode = 'jp';
                           if (countryCode === 'ko') countryCode = 'kr';

                           return (
                               <button 
                                    key={langOption.code}
                                    onClick={() => { setLanguage(langOption.code); setShowLangMenu(false); }} 
                                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors
                                        ${language === langOption.code 
                                            ? 'bg-primary/10 text-primary font-bold' 
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}
                                    `}
                               >
                                   <div className="flex items-center gap-3">
                                       <img 
                                         src={`https://flagcdn.com/w40/${countryCode}.png`} 
                                         alt={langOption.name}
                                         className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
                                       />
                                       <span className="font-medium">{langOption.nativeName}</span>
                                   </div>
                                   {language === langOption.code && (
                                       <span className="material-symbols-outlined text-lg filled-icon text-primary">check</span>
                                   )}
                               </button>
                           );
                       })}
                   </div>
               </div>
           )}
       </div>

       {/* --- ЛОГО БОЛОН НЭРНИЙ ХЭСЭГ (ТУСДАА LOGO/IMAGE АШИГЛАНА) --- */}
       <div className="w-full text-center mb-10 flex flex-col items-center">
           {/* 1. Login Page Logo (Big) */}
           {config.loginLogoUrl ? (
               <img 
   src={config.logoUrl} 
   alt="App Icon" 
   className="w-24 h-24 object-contain transition-all 
              dark:invert dark:brightness-0 dark:sepia-0" 
/>
           ) : (
               <div className="bg-primary text-white p-5 rounded-[2rem] shadow-lg shadow-blue-500/30 mb-6 transform rotate-6 hover:rotate-0 transition-transform">
                   <span className="material-symbols-outlined text-5xl">explore</span>
               </div>
           )}
           
           {/* 2. Login Name Image (эсвэл Text) */}
           {config.loginNameImageUrl ? (
               // Login-д зориулсан тусгай нэрний зураг байвал харуулна
               <img 
                  src={config.loginNameImageUrl} 
                  alt={config.appName} 
                  className="h-14 max-w-[250px] object-contain mb-2"
               />
           ) : (
               // Байхгүй бол Config доторх текстийг харуулна
               <h1 className="text-3xl font-extrabold dark:text-white mb-2">{config.appName}</h1>
           )}

           <p className="text-slate-500 font-medium">{t('login_subtitle')}</p>
       </div>
       {/* -------------------------------------------------------- */}

       <form onSubmit={handleLogin} className="w-full space-y-4">
           <div className="space-y-1">
             <input 
                required 
                type="email" 
                className="w-full rounded-2xl border-none p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none ring-2 ring-transparent focus:ring-primary shadow-sm transition-all"
                placeholder={t('email')}
                value={email}
                onChange={e => setEmail(e.target.value)}
             />
           </div>
           
           <div className="relative">
             <input 
                required 
                type={showPassword ? "text" : "password"} 
                className="w-full rounded-2xl border-none p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none ring-2 ring-transparent focus:ring-primary shadow-sm transition-all"
                placeholder={t('password')}
                value={password}
                onChange={e => setPassword(e.target.value)}
             />
             <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
             >
                <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
             </button>
           </div>

           <div className="text-right">
               <button 
                 type="button" 
                 onClick={() => setShowRecovery(true)}
                 className="text-sm text-primary font-bold hover:underline"
               >
                 {t('forgot_password')}
               </button>
           </div>

           <button 
             type="submit" 
             disabled={loading}
             className="w-full bg-primary text-white font-bold h-14 rounded-2xl shadow-lg shadow-primary/30 mt-2 disabled:opacity-70 active:scale-[0.98] transition-all"
           >
             {loading ? t('logging_in') : t('login')}
           </button>
       </form>

       <div className="mt-8 text-center">
          <span className="text-slate-500 text-sm font-medium">{t('no_account')} </span>
          <button onClick={() => navigate('/role-select')} className="text-primary font-bold text-sm hover:underline">{t('sign_up')}</button>
      </div>

      {/* Recovery Modal */}
      {showRecovery && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-xl dark:text-white">{t('reset_password')}</h3>
                      <button onClick={() => {setShowRecovery(false); setRecoveryStep(1);}} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>

                   {recoveryStep === 1 ? (
                       <div className="space-y-4">
                           <p className="text-sm text-slate-500 leading-relaxed">{t('recovery_instruction')}</p>
                           <input 
                               type="email" 
                               placeholder={t('email')}
                               value={recoveryEmail}
                               onChange={(e) => setRecoveryEmail(e.target.value)}
                               className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none dark:text-white ring-2 ring-transparent focus:ring-primary transition-all"
                           />
                           <button 
                               onClick={handleSendRecoveryCode}
                               disabled={loading || !recoveryEmail}
                               className="w-full bg-primary text-white font-bold py-4 rounded-2xl disabled:opacity-50 shadow-lg shadow-primary/20 transition-all"
                           >
                               {loading ? t('sending') : t('send_recovery_link')}
                           </button>
                       </div>
                  ) : (
                      <div className="space-y-4">
                          <p className="text-sm text-slate-500 leading-relaxed">{t('recovery_code_instruction')}</p>
                          <input 
                              type="text" 
                              placeholder={t('enter_recovery_code')}
                              value={recoveryCode}
                              onChange={(e) => setRecoveryCode(e.target.value)}
                              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none dark:text-white ring-2 ring-transparent focus:ring-primary transition-all"
                          />
                          <input 
                              type="password" 
                              placeholder={t('new_password')}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none dark:text-white ring-2 ring-transparent focus:ring-primary transition-all"
                          />
                          <button 
                              onClick={handleResetPassword}
                              disabled={loading || !recoveryCode || !newPassword}
                              className="w-full bg-primary text-white font-bold py-4 rounded-2xl disabled:opacity-50 shadow-lg shadow-primary/20 transition-all"
                          >
                              {loading ? t('updating') : t('update_password')}
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default Login;