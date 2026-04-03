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
  translating: boolean;
  otherListening: boolean;
  onSpeak: () => void;
}> = ({ text, original, translating, otherListening, onSpeak }) => (
  <div className="w-full bg-white dark:bg-slate-800 rounded-3xl px-5 py-5 min-h-[100px] flex flex-col items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 mb-4 gap-2">
    {translating ? (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    ) : text ? (
      <>
        {original ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center italic w-full">"{original}"</p>
        ) : null}
        <div className="flex items-center justify-between w-full gap-3">
          <p className="text-lg font-semibold dark:text-white leading-relaxed flex-1 text-center">{text}</p>
          <button
            onClick={onSpeak}
            className="shrink-0 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-primary text-base">volume_up</span>
          </button>
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

  // Утасны Web Speech API ашиглан текст авах
  const startSpeechRecognition = (lang: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { reject(new Error('not supported')); return; }

      const r = new SR();
      r.lang = langSpeechCode[lang] || lang;
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.continuous = false;
      recognitionRef.current = r;

      r.onresult = (e: any) => resolve(e.results[0][0].transcript || '');
      r.onerror = (e: any) => reject(new Error(e.error));
      r.onend = () => { recognitionRef.current = null; };
      r.start();
    });
  };

  const stopSpeechRecognition = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  // Backend /translate-text дуудах
  const translateText = async (text: string, src: string, tgt: string): Promise<string> => {
    const res = await fetch(`${API_BASE}/translate-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceLang: src, targetLang: tgt }),
    });
    if (!res.ok) throw new Error('Translation failed');
    const data = await res.json() as any;
    return data.translated || text;
  };

  // ── TOP person mic toggle ─────────────────────────────
  // TOP person speaks topLang → translate to botLang → show on BOTTOM
  const toggleTop = async () => {
    if (botActiveRef.current) return;

    if (topActiveRef.current) {
      stopSpeechRecognition();
      topActiveRef.current = false;
      setTopListening(false);
      return;
    }

    topActiveRef.current = true;
    setTopListening(true);
    setBotResult('');
    setBotOriginal('');

    try {
      const transcript = await startSpeechRecognition(topLang);
      topActiveRef.current = false;
      setTopListening(false);
      if (!transcript.trim() || isProcessingRef.current) return;

      isProcessingRef.current = true;
      setBotTranslating(true);
      try {
        const translated = await translateText(transcript, topLang, botLang);
        setBotOriginal(transcript);
        setBotResult(translated);
        if (translated) speak(translated, botLang);
      } catch {
        showSnackbar('Орчуулга амжилтгүй боллоо.', 'error');
      } finally {
        setBotTranslating(false);
        isProcessingRef.current = false;
      }
    } catch {
      topActiveRef.current = false;
      setTopListening(false);
      showSnackbar('Микрофон алдаа гарлаа.', 'error');
    }
  };

  // ── BOT person mic toggle ─────────────────────────────
  // BOT person speaks botLang → translate to topLang → show on TOP
  const toggleBot = async () => {
    if (topActiveRef.current) return;

    if (botActiveRef.current) {
      stopSpeechRecognition();
      botActiveRef.current = false;
      setBotListening(false);
      return;
    }

    botActiveRef.current = true;
    setBotListening(true);
    setTopResult('');
    setTopOriginal('');

    try {
      const transcript = await startSpeechRecognition(botLang);
      botActiveRef.current = false;
      setBotListening(false);
      if (!transcript.trim() || isProcessingRef.current) return;

      isProcessingRef.current = true;
      setTopTranslating(true);
      try {
        const translated = await translateText(transcript, botLang, topLang);
        setTopOriginal(transcript);
        setTopResult(translated);
        if (translated) speak(translated, topLang);
      } catch {
        showSnackbar('Орчуулга амжилтгүй боллоо.', 'error');
      } finally {
        setTopTranslating(false);
        isProcessingRef.current = false;
      }
    } catch {
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

      {/* Буцах товч */}
      <button 
        onClick={() => navigate(-1)} 
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
