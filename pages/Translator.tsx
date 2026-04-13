import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useSnackbar } from '../contexts/SnackbarContext';

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
  en: 'en-US', mn: 'mn-MN', zh: 'zh-CN', ru: 'ru-RU',
  ko: 'ko-KR', ja: 'ja-JP', de: 'de-DE', fr: 'fr-FR',
  es: 'es-ES', it: 'it-IT', ar: 'ar-SA', hi: 'hi-IN',
  tr: 'tr-TR', pt: 'pt-PT', nl: 'nl-NL', pl: 'pl-PL',
  th: 'th-TH', vi: 'vi-VN', uk: 'uk-UA',
};

// ── MicButton ────────────────────────────────────────────
const MicButton: React.FC<{
  listening: boolean;
  disabled: boolean;
  onPress: () => void;
  label?: string;
}> = ({ listening, disabled, onPress, label }) => (
  <div className="flex flex-col items-center gap-2">
    <button
      onClick={onPress}
      disabled={disabled}
      className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-30 select-none ${
        listening ? 'bg-red-500 ring-4 ring-red-200 dark:ring-red-900' : 'bg-primary'
      }`}
    >
      <span className="material-symbols-outlined text-white text-2xl">
        {listening ? 'stop' : 'mic'}
      </span>
    </button>
    <p className="text-xs font-medium text-slate-400">
      {listening ? 'Дарж зогсооно уу' : label || 'Дарж ярина уу'}
    </p>
  </div>
);

// ── ResultBubble ─────────────────────────────────────────
const ResultBubble: React.FC<{
  text: string;
  original?: string;
  interim?: string;
  translating: boolean;
  otherListening: boolean;
  onSpeak: () => void;
}> = ({ text, original, interim, translating, otherListening, onSpeak }) => (
  <div className="w-full bg-white dark:bg-slate-800 rounded-3xl px-5 py-5 min-h-[100px] flex flex-col items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 mb-4 gap-2">
    {translating ? (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    ) : text || interim ? (
      <>
        {original ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center italic w-full">"{original}"</p>
        ) : null}
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex-1">
            {interim && !text ? (
              <p className="text-lg font-semibold dark:text-white leading-relaxed text-center text-slate-500 dark:text-slate-400 italic">
                {interim}
              </p>
            ) : (
              <p className="text-lg font-semibold dark:text-white leading-relaxed text-center">{text}</p>
            )}
            {interim && text && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center italic mt-1">
                Завсрын үр дүн: {interim}
              </p>
            )}
          </div>
          {text && (
            <button
              onClick={onSpeak}
              className="shrink-0 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-primary text-base">volume_up</span>
            </button>
          )}
        </div>
      </>
    ) : (
      <p className="text-slate-300 dark:text-slate-600 text-sm font-medium text-center">
        {otherListening ? 'Боловсруулж байна...' : 'Нөгөө хүн ярихад энд харагдана'}
      </p>
    )}
  </div>
);

// ── LangBtn ───────────────────────────────────────────────
const LangBtn: React.FC<{ code: string; name: string; flag: string; onPress: () => void }> = ({ code, name, flag, onPress }) => (
  <button
    onClick={onPress}
    className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl px-4 py-2.5 shadow-sm border border-slate-100 dark:border-slate-700 mb-4"
  >
    <span className="text-lg">{flag}</span>
    <span className="text-sm font-bold dark:text-white">{name}</span>
    <span className="material-symbols-outlined text-slate-400 text-base">expand_more</span>
  </button>
);

// ── Main Translator ───────────────────────────────────────
const Translator: React.FC = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { language } = useLanguage();

  const [topLang, setTopLang] = useState('zh');
  const [botLang, setBotLang] = useState('mn');

  const [topListening, setTopListening] = useState(false);
  const [botListening, setBotListening] = useState(false);

  // TOP = top person's result (bot yarisan → top person unshina)
  // BOT = bot person's result (top yarisan → bot person unshina)
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

  // Refs
  const recognitionRef = useRef<any>(null);
  const topActiveRef = useRef(false);
  const botActiveRef = useRef(false);
  const isProcessingRef = useRef(false);

  const getLangInfo = (code: string) => languages.find(l => l.code === code) || { code, name: code, flag: '🌐' };

  const speak = (text: string, lang: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = langSpeechCode[lang] || lang;
    window.speechSynthesis.speak(utt);
  };

  const API_BASE = 'https://viptravel-backend.erdneebatulzii23.workers.dev';

  // Android WebView-д зориулсан Web Speech API шалгах
  const isAndroidWebView = () => {
    return /Android/.test(navigator.userAgent) && /wv/.test(navigator.userAgent);
  };

  // Утасны Web Speech API ашиглан текст авах (Android WebView-д зориулсан fallback)
  const startSpeechRecognition = (lang: string, isTop: boolean): Promise<string> => {
    console.log('startSpeechRecognition called with lang:', lang, 'isTop:', isTop);
    return new Promise((resolve, reject) => {
      // Android WebView-д зориулсан тусгай логик
      if (isAndroidWebView()) {
        console.log('Android WebView detected');
        // Android WebView-д microphone зөвшөөрөл авах
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('Media devices not supported in WebView');
          reject(new Error('Media devices not supported in WebView'));
          return;
        }

        console.log('Requesting microphone permission...');
        // Android-д зориулсан microphone зөвшөөрөл авах
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            console.log('Microphone permission granted, stream obtained');
            // Stream аваад дараа нь Web Speech API ашиглах
            const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SR) {
              console.error('Speech recognition not supported');
              stream.getTracks().forEach(track => track.stop());
              reject(new Error('Speech recognition not supported'));
              return;
            }

            console.log('Creating SpeechRecognition instance');
            const r = new SR();
            r.lang = langSpeechCode[lang] || lang;
            r.interimResults = true;  // Завсрын үр дүнг авах
            r.maxAlternatives = 1;
            r.continuous = true;      // Үргэлжлүүлэн ярих
            recognitionRef.current = r;

            let finalTranscript = '';
            let shouldResolve = false;
            
            r.onresult = (e: any) => {
              console.log('Speech recognition result:', e.results);
              let interimTranscript = '';
              
              for (let i = e.resultIndex; i < e.results.length; i++) {
                const transcript = e.results[i][0].transcript;
                
                if (e.results[i].isFinal) {
                  // Эцсийн үр дүн
                  finalTranscript += transcript;
                  console.log('Final transcript:', finalTranscript);
                } else {
                  // Завсрын үр дүн
                  interimTranscript += transcript;
                  console.log('Interim transcript:', interimTranscript);
                  
                  // Завсрын үр дүнг UI-д харуулах
                  if (isTop) {
                    setBotInterim(interimTranscript);
                  } else {
                    setTopInterim(interimTranscript);
                  }
                }
              }
              
              // Эцсийн үр дүнг хадгалах, гэхдээ resolve хийхгүй
              // Зөвхөн stopSpeechRecognition дуудагдахад л resolve хийх
            };
            
            r.onerror = (e: any) => {
              console.error('Speech recognition error:', e.error);
              stream.getTracks().forEach(track => track.stop());
              reject(new Error(e.error));
            };
            
            r.onend = () => {
              console.log('Speech recognition ended');
              stream.getTracks().forEach(track => track.stop());
              recognitionRef.current = null;
              
              // Завсрын үр дүнг цэвэрлэх
              if (isTop) {
                setBotInterim('');
              } else {
                setTopInterim('');
              }
              
              // Хэрэв эцсийн үр дүн байвал resolve хийх
              if (finalTranscript) {
                resolve(finalTranscript);
              }
            };
            
            console.log('Starting speech recognition...');
            r.start();
          })
          .catch(err => {
            console.error('Microphone permission denied:', err);
            reject(new Error('Microphone permission denied: ' + err.message));
          });
        return;
      }

      console.log('Regular web browser detected');
      // Ердийн веб браузерын логик
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { 
        console.error('Speech recognition not supported');
        reject(new Error('not supported')); 
        return; 
      }

      console.log('Creating SpeechRecognition instance for web');
      const r = new SR();
      r.lang = langSpeechCode[lang] || lang;
      r.interimResults = true;   // Завсрын үр дүнг авах
      r.maxAlternatives = 1;
      r.continuous = true;       // Үргэлжлүүлэн ярих
      recognitionRef.current = r;

      let finalTranscript = '';
      
      r.onresult = (e: any) => {
        console.log('Speech recognition result (web):', e.results);
        let interimTranscript = '';
        
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript;
          
          if (e.results[i].isFinal) {
            // Эцсийн үр дүн
            finalTranscript += transcript;
            console.log('Final transcript (web):', finalTranscript);
          } else {
            // Завсрын үр дүн
            interimTranscript += transcript;
            console.log('Interim transcript (web):', interimTranscript);
            
            // Завсрын үр дүнг UI-д харуулах
            if (isTop) {
              setBotInterim(interimTranscript);
            } else {
              setTopInterim(interimTranscript);
            }
          }
        }
        
        // Эцсийн үр дүнг хадгалах, гэхдээ resolve хийхгүй
        // Зөвхөн stopSpeechRecognition дуудагдахад л resolve хийх
      };
      
      r.onerror = (e: any) => {
        console.error('Speech recognition error (web):', e.error);
        reject(new Error(e.error));
      };
      
      r.onend = () => { 
        console.log('Speech recognition ended (web)');
        recognitionRef.current = null;
        
        // Завсрын үр дүнг цэвэрлэх
        if (isTop) {
          setBotInterim('');
        } else {
          setTopInterim('');
        }
        
        // Хэрэв эцсийн үр дүн байвал resolve хийх
        if (finalTranscript) {
          resolve(finalTranscript);
        }
      };
      
      console.log('Starting speech recognition (web)...');
      r.start();
    });
  };

  const stopSpeechRecognition = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  // Backend /translate-text дуудах (D1 cache only)
  const translateText = async (text: string, src: string, tgt: string): Promise<string> => {
    console.log('translateText called:', { text: text.substring(0, 50), src, tgt });
    
    // API дуудах (D1 cache backend дээр шалгагдана)
    const res = await fetch(`${API_BASE}/translate-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceLang: src, targetLang: tgt }),
    });
    
    if (!res.ok) {
      console.error('Translation API failed:', res.status, res.statusText);
      throw new Error('Translation failed');
    }
    
    const data = await res.json() as any;
    console.log('API response:', { 
      translated: data.translated?.substring(0, 50), 
      cached: data.cached || false,
      engine: data.engine || 'unknown',
      usage_count: data.usage_count || 1
    });
    
    return data.translated || text;
  };

  // ── TOP person mic toggle ─────────────────────────────
  // TOP person speaks topLang → translate to botLang → show on BOTTOM
  const toggleTop = async () => {
    console.log('toggleTop called - topLang:', topLang, 'botLang:', botLang);
    console.log('topActiveRef.current:', topActiveRef.current);
    console.log('botActiveRef.current:', botActiveRef.current);
    
    if (botActiveRef.current) {
      console.log('Cannot start - bot is active');
      return;
    }

    if (topActiveRef.current) {
      console.log('Stopping top recognition (toggleTop)');
      stopSpeechRecognition();
      topActiveRef.current = false;
      setTopListening(false);
      // Завсрын үр дүнг цэвэрлэх
      setBotInterim('');
      return;
    }

    console.log('Starting top recognition...');
    topActiveRef.current = true;
    setTopListening(true);
    setBotResult('');
    setBotOriginal('');
    setBotInterim('');

    try {
      console.log('Calling startSpeechRecognition with lang:', topLang);
      const transcript = await startSpeechRecognition(topLang, true); // true = isTop
      console.log('Transcript received:', transcript);
      topActiveRef.current = false;
      setTopListening(false);
      
      if (!transcript.trim()) {
        console.log('Empty transcript');
        return;
      }
      if (isProcessingRef.current) {
        console.log('Already processing');
        return;
      }

      console.log('Starting translation...');
      isProcessingRef.current = true;
      setBotTranslating(true);
      try {
        console.log('Calling translateText:', { text: transcript, src: topLang, tgt: botLang });
        const translated = await translateText(transcript, topLang, botLang);
        console.log('Translation result:', translated);
        setBotOriginal(transcript);
        setBotResult(translated);
        if (translated) {
          console.log('Speaking translated text in', botLang);
          speak(translated, botLang);
        }
      } catch (err) {
        console.error('Translation error:', err);
        showSnackbar('Орчуулга амжилтгүй боллоо.', 'error');
      } finally {
        setBotTranslating(false);
        isProcessingRef.current = false;
        console.log('Translation process completed');
      }
    } catch (err) {
      console.error('Speech recognition error:', err);
      topActiveRef.current = false;
      setTopListening(false);
      showSnackbar('Микрофон алдаа гарлаа.', 'error');
    }
  };

  // ── BOT person mic toggle ─────────────────────────────
  // BOT person speaks botLang → translate to topLang → show on TOP
  const toggleBot = async () => {
    console.log('toggleBot called - botLang:', botLang, 'topLang:', topLang);
    console.log('topActiveRef.current:', topActiveRef.current);
    console.log('botActiveRef.current:', botActiveRef.current);
    
    if (topActiveRef.current) {
      console.log('Cannot start - top is active');
      return;
    }

    if (botActiveRef.current) {
      console.log('Stopping bot recognition (toggleBot)');
      stopSpeechRecognition();
      botActiveRef.current = false;
      setBotListening(false);
      // Завсрын үр дүнг цэвэрлэх
      setTopInterim('');
      return;
    }

    console.log('Starting bot recognition...');
    botActiveRef.current = true;
    setBotListening(true);
    setTopResult('');
    setTopOriginal('');
    setTopInterim('');

    try {
      console.log('Calling startSpeechRecognition with lang:', botLang);
      const transcript = await startSpeechRecognition(botLang, false); // false = isTop (bot)
      console.log('Transcript received:', transcript);
      botActiveRef.current = false;
      setBotListening(false);
      
      if (!transcript.trim()) {
        console.log('Empty transcript');
        return;
      }
      if (isProcessingRef.current) {
        console.log('Already processing');
        return;
      }

      console.log('Starting translation...');
      isProcessingRef.current = true;
      setTopTranslating(true);
      try {
        console.log('Calling translateText:', { text: transcript, src: botLang, tgt: topLang });
        const translated = await translateText(transcript, botLang, topLang);
        console.log('Translation result:', translated);
        setTopOriginal(transcript);
        setTopResult(translated);
        if (translated) {
          console.log('Speaking translated text in', topLang);
          speak(translated, topLang);
        }
      } catch (err) {
        console.error('Translation error:', err);
        showSnackbar('Орчуулга амжилтгүй боллоо.', 'error');
      } finally {
        setTopTranslating(false);
        isProcessingRef.current = false;
        console.log('Translation process completed');
      }
    } catch (err) {
      console.error('Speech recognition error:', err);
      botActiveRef.current = false;
      setBotListening(false);
      showSnackbar('Микрофон алдаа гарлаа.', 'error');
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      topActiveRef.current = false;
      botActiveRef.current = false;
      stopSpeechRecognition();
      window.speechSynthesis.cancel();
    };
  }, []);

  const filteredLangs = languages.filter(l =>
    l.name.toLowerCase().includes(langSearch.toLowerCase())
  );

  // ── LangPicker ────────────────────────────────────────
  const LangPicker = ({ onSelect, onClose }: { onSelect: (code: string) => void; onClose: () => void }) => (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl p-4 max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
        <input
          autoFocus
          value={langSearch}
          onChange={e => setLangSearch(e.target.value)}
          placeholder="Хэл хайх..."
          className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none dark:text-white mb-3"
        />
        <div className="overflow-y-auto flex-1">
          {filteredLangs.map(l => (
            <button
              key={l.code}
              onClick={() => { onSelect(l.code); onClose(); setLangSearch(''); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="text-xl">{l.flag}</span>
              <span className="text-sm font-medium dark:text-white">{l.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const topInfo = getLangInfo(topLang);
  const botInfo = getLangInfo(botLang);

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-background-dark overflow-hidden select-none relative">

      {/* Буцах товч - WebView-д асуудал гардаг тул тодорхой route руу чиглүүлнэ */}
      <button 
        onClick={() => {
          // Android WebView-д navigate(-1) ажиллахгүй байж болно
          // Тиймээс тодорхой route руу чиглүүлнэ
          if (/Android/.test(navigator.userAgent) && /wv/.test(navigator.userAgent)) {
            // Android WebView бол /services руу чиглүүлнэ
            navigate('/services');
          } else {
            // Ердийн веб браузер бол navigate(-1) ашиглана
            navigate(-1);
          }
        }} 
        className="absolute top-4 left-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-2 rounded-full text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors z-10"
      >
        <span className="material-symbols-outlined">arrow_back</span>
      </button>

      {/* TOP HALF — эргүүлсэн (top person's view) */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-5 py-6"
        style={{ transform: 'rotate(180deg)' }}
      >
        <LangBtn code={topLang} name={topInfo.name} flag={topInfo.flag} onPress={() => { setShowTopPicker(true); setLangSearch(''); }} />
        {/* TOP person sees: BOT person's translated speech (in topLang) */}
        <ResultBubble
          text={topResult}
          original={topOriginal}
          interim={topInterim}
          translating={topTranslating}
          otherListening={botListening}
          onSpeak={() => speak(topResult, topLang)}
        />
        <MicButton listening={topListening} disabled={botListening || topTranslating || botTranslating} onPress={toggleTop} />
      </div>

      {/* ХУВААГЧ */}
      <div className="flex items-center px-5 flex-shrink-0">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        <div className="mx-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-sm">
          <span className="text-base">{topInfo.flag}</span>
          <span className="material-symbols-outlined text-slate-400 text-sm">swap_vert</span>
          <span className="text-base">{botInfo.flag}</span>
        </div>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* BOTTOM HALF (bot person's view) */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6">
        <LangBtn code={botLang} name={botInfo.name} flag={botInfo.flag} onPress={() => { setShowBotPicker(true); setLangSearch(''); }} />
        {/* BOT person sees: TOP person's translated speech (in botLang) */}
        <ResultBubble
          text={botResult}
          original={botOriginal}
          interim={botInterim}
          translating={botTranslating}
          otherListening={topListening}
          onSpeak={() => speak(botResult, botLang)}
        />
        <MicButton listening={botListening} disabled={topListening || topTranslating || botTranslating} onPress={toggleBot} />
      </div>

      {showTopPicker && <LangPicker onSelect={setTopLang} onClose={() => setShowTopPicker(false)} />}
      {showBotPicker && <LangPicker onSelect={setBotLang} onClose={() => setShowBotPicker(false)} />}
    </div>
  );
};

export default Translator;
