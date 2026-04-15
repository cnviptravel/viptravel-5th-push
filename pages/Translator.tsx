import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../contexts/SnackbarContext';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'mn', name: 'Mongolian', flag: '🇲🇳' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'uz', name: 'Uzbek', flag: '🇺🇿' },
  { code: 'kk', name: 'Kazakh', flag: '🇰🇿' },
  { code: 'tg', name: 'Tajik', flag: '🇹🇯' },
  { code: 'ky', name: 'Kyrgyz', flag: '🇰🇬' },
];

const langSpeechCode: Record<string, string> = {
  en: 'en-US', mn: 'mn-MN', zh: 'zh-CN', ru: 'ru-RU', ko: 'ko-KR', ja: 'ja-JP',
  de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT', ar: 'ar-SA', hi: 'hi-IN',
  tr: 'tr-TR', pt: 'pt-PT', nl: 'nl-NL', pl: 'pl-PL', th: 'th-TH', vi: 'vi-VN',
  uk: 'uk-UA',
};

const MicButton: React.FC<{ listening: boolean; disabled: boolean; onPress: () => void; label?: string }> = ({ listening, disabled, onPress, label }) => (
  <div className="flex flex-col items-center gap-2">
    <button
      onClick={onPress}
      disabled={disabled}
      className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-30 select-none ${
        listening ? 'bg-red-500 ring-4 ring-red-200 dark:ring-red-900 animate-pulse' : 'bg-primary'
      }`}
    >
      <span className="material-symbols-outlined text-white text-2xl">{listening ? 'stop' : 'mic'}</span>
    </button>
    <p className="text-xs font-medium text-slate-400">{listening ? 'Зогсоох' : label || 'Ярих'}</p>
  </div>
);

const ResultBubble: React.FC<{ text: string; original?: string; interim?: string; translating: boolean; otherListening: boolean; onSpeak: () => void }> = ({ text, original, interim, translating, otherListening, onSpeak }) => (
  <div className="w-full bg-white dark:bg-slate-800 rounded-3xl px-5 py-5 min-h-[100px] flex flex-col items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 mb-4 gap-2">
    {translating ? (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    ) : text || interim ? (
      <>
        {original && <p className="text-xs text-slate-400 dark:text-slate-500 text-center italic w-full">"{original}"</p>}
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex-1 text-center">
            <p className={`text-lg font-semibold dark:text-white leading-relaxed ${!text ? 'text-slate-400 italic' : ''}`}>
              {text || interim}
            </p>
          </div>
          {text && (
            <button onClick={onSpeak} className="shrink-0 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-base">volume_up</span>
            </button>
          )}
        </div>
      </>
    ) : (
      <p className="text-slate-300 dark:text-slate-600 text-sm font-medium text-center">
        {otherListening ? 'Сонсож байна...' : 'Энд орчуулга харагдана'}
      </p>
    )}
  </div>
);

const Translator: React.FC = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [topLang, setTopLang] = useState('zh');
  const [botLang, setBotLang] = useState('mn');
  const [topListening, setTopListening] = useState(false);
  const [botListening, setBotListening] = useState(false);
  const [topResult, setTopResult] = useState('');
  const [botResult, setBotResult] = useState('');
  const [topOriginal, setTopOriginal] = useState('');
  const [botOriginal, setBotOriginal] = useState('');
  const [topInterim, setTopInterim] = useState('');
  const [botInterim, setBotInterim] = useState('');
  const [topTranslating, setTopTranslating] = useState(false);
  const [botTranslating, setBotTranslating] = useState(false);
  const [showTopPicker, setShowTopPicker] = useState(false);
  const [showBotPicker, setShowBotPicker] = useState(false);
  const [langSearch, setLangSearch] = useState('');

  const isAndroid = () => /Android/i.test(navigator.userAgent);
  const recognitionRef = useRef<any>(null);
  const API_BASE = 'https://viptravel-backend.erdneebatulzii23.workers.dev';

  const isManuallyStopping = useRef(false);
  const fullTranscriptRef = useRef('');

  const speak = (text: string, lang: string) => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = langSpeechCode[lang] || lang;
    window.speechSynthesis.speak(utt);
  };

  const handleToggle = async (isTop: boolean) => {
    // 1. ХЭРЭВ ОДОО ЯРЬЖ БАЙВАЛ ХҮЧЭЭР ЗОГСООХ
    if (isTop ? topListening : botListening) {
      isManuallyStopping.current = true;
      
      if (isAndroid()) {
        try {
          // ЧУХАЛ: Бүх листенерүүдийг шууд устгах (Auto-restart тасална)
          await SpeechRecognition.removeAllListeners();
          await SpeechRecognition.stop();
        } catch (e) {
          console.error("Stop error:", e);
        }
        
        // Төлөвийг шууд шинэчлэх
        setTopListening(false);
        setBotListening(false);
        setTopInterim('');
        setBotInterim('');
        
        // Орчуулга руу илгээх
        const currentText = fullTranscriptRef.current;
        if (currentText.trim()) {
          processTranslation(currentText, isTop);
        }
      } else {
        recognitionRef.current?.stop();
      }
      return;
    }

    if (topListening || botListening || topTranslating || botTranslating) return;

    // 2. ЭХЛҮҮЛЭХ БЭЛТГЭЛ
    const srcLang = isTop ? topLang : botLang;
    const speechCode = langSpeechCode[srcLang] || srcLang;

    fullTranscriptRef.current = ''; 
    isManuallyStopping.current = false;

    if (isTop) {
      setTopListening(true);
      setBotResult(''); setBotInterim(''); setBotOriginal('');
    } else {
      setBotListening(true);
      setTopResult(''); setTopInterim(''); setTopOriginal('');
    }

    if (isAndroid()) {
      try {
        await SpeechRecognition.requestPermissions();

        // Листенерүүдийг шинээр бүртгэх
        await SpeechRecognition.addListener('partialResults', (data: any) => {
          if (data.matches && data.matches.length > 0) {
            fullTranscriptRef.current = data.matches[0];
            isTop ? setBotInterim(fullTranscriptRef.current) : setTopInterim(fullTranscriptRef.current);
          }
        });

        await SpeechRecognition.addListener('listeningState', async (data: any) => {
          // Хэрэв бид гараар зогсоогоогүй байхад систем өөрөө "stopped" болвол дахин эхлүүлэх
          if (data.status === 'stopped' && !isManuallyStopping.current) {
            try {
              await SpeechRecognition.start({ language: speechCode, partialResults: true, popup: false });
            } catch (e) {
              console.error("Auto-restart failed");
            }
          }
        });

        await SpeechRecognition.start({ language: speechCode, partialResults: true, popup: false });
      } catch (err) {
        setTopListening(false); setBotListening(false);
      }
    } else {
      // WEB IMPLEMENTATION
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const r = new SR();
      r.lang = speechCode;
      r.interimResults = true;
      r.continuous = true; 
      
      let webFinal = '';
      r.onresult = (e: any) => {
        let interimStr = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) webFinal += e.results[i][0].transcript;
          else interimStr += e.results[i][0].transcript;
        }
        fullTranscriptRef.current = webFinal + interimStr;
        isTop ? setBotInterim(fullTranscriptRef.current) : setTopInterim(fullTranscriptRef.current);
      };

      r.onend = () => {
        if (!isManuallyStopping.current) { r.start(); return; }
        setTopListening(false); setBotListening(false);
        setTopInterim(''); setBotInterim('');
        if (fullTranscriptRef.current.trim()) processTranslation(fullTranscriptRef.current, isTop);
      };
      r.start();
      recognitionRef.current = r;
    }
  };

  const processTranslation = async (text: string, isTop: boolean) => {
    const srcLang = isTop ? topLang : botLang;
    const tgtLang = isTop ? botLang : topLang;
    
    isTop ? setBotTranslating(true) : setTopTranslating(true);
    try {
      const res = await fetch(`${API_BASE}/translate-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang: srcLang, targetLang: tgtLang }),
      });
      const data = await res.json() as any;
      const translated = data.translated || text;
      
      if (isTop) {
        setBotOriginal(text); setBotResult(translated); speak(translated, botLang);
      } else {
        setTopOriginal(text); setTopResult(translated); speak(translated, topLang);
      }
    } catch (e) {
      showSnackbar('Орчуулгад алдаа гарлаа', 'error');
    }
    setBotTranslating(false); setTopTranslating(false);
  };

  useEffect(() => {
    return () => {
      SpeechRecognition.removeAllListeners();
      window.speechSynthesis.cancel();
    };
  }, []);

  const topInfo = languages.find(l => l.code === topLang)!;
  const botInfo = languages.find(l => l.code === botLang)!;

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-background-dark overflow-hidden select-none relative">
      <button onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-2 rounded-full z-10 shadow-sm">
        <span className="material-symbols-outlined">arrow_back</span>
      </button>

      {/* TOP SECTION (Rotated) */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6" style={{ transform: 'rotate(180deg)' }}>
        <button onClick={() => setShowTopPicker(true)} className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl px-4 py-2 shadow-sm mb-4">
          <span>{topInfo.flag}</span> <span className="text-sm font-bold dark:text-white">{topInfo.name}</span>
        </button>
        <ResultBubble text={topResult} original={topOriginal} interim={topInterim} translating={topTranslating} otherListening={botListening} onSpeak={() => speak(topResult, topLang)} />
        <MicButton listening={topListening} disabled={botListening || topTranslating || botTranslating} onPress={() => handleToggle(true)} />
      </div>

      <div className="flex items-center px-5 py-2">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        <div className="mx-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{topInfo.code} ⇄ {botInfo.code}</div>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* BOTTOM SECTION */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6">
        <button onClick={() => setShowBotPicker(true)} className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl px-4 py-2 shadow-sm mb-4">
          <span>{botInfo.flag}</span> <span className="text-sm font-bold dark:text-white">{botInfo.name}</span>
        </button>
        <ResultBubble text={botResult} original={botOriginal} interim={botInterim} translating={botTranslating} otherListening={topListening} onSpeak={() => speak(botResult, botLang)} />
        <MicButton listening={botListening} disabled={topListening || topTranslating || botTranslating} onPress={() => handleToggle(false)} />
      </div>

      {/* Language Picker Modal */}
      {(showTopPicker || showBotPicker) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={() => { setShowTopPicker(false); setShowBotPicker(false); }}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl p-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
            <input value={langSearch} onChange={e => setLangSearch(e.target.value)} placeholder="Хэл хайх..." className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 mb-3 outline-none dark:text-white border border-transparent focus:border-primary" />
            <div className="overflow-y-auto flex-1">
              {languages.filter(l => l.name.toLowerCase().includes(langSearch.toLowerCase())).map(l => (
                <button key={l.code} onClick={() => { if(showTopPicker) setTopLang(l.code); else setBotLang(l.code); setShowTopPicker(false); setShowBotPicker(false); setLangSearch(''); }} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span className="text-2xl">{l.flag}</span> <span className="text-base font-medium dark:text-white">{l.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Translator;