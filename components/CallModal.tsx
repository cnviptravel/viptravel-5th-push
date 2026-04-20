import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import useTranslation from '../hooks/useTranslation';

// ============ CALLING TONE — залгаж байгаа дуу (ringback) ============
function createCallingTone() {
  let ctx: AudioContext | null = null;
  let intervalId: any = null;
  let stopped = false;
  const playNote = (c: AudioContext, freq: number, start: number, dur: number, vol: number) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.frequency.value = freq; osc.type = 'sine';
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.05);
    gain.gain.setValueAtTime(vol, start + dur - 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.start(start); osc.stop(start + dur);
  };
  return {
    start() {
      try {
        ctx = new AudioContext();
        stopped = false;
        const beep = () => {
          if (stopped || !ctx) return;
          const t = ctx.currentTime;
          // Зөөлөн ringback — 425Hz (Европ стандарт), 1с тус бүр
          playNote(ctx, 425, t, 1.0, 0.06);
          playNote(ctx, 425, t + 1.5, 1.0, 0.06);
        };
        beep();
        intervalId = setInterval(beep, 5000);
      } catch(e) { console.warn('Calling tone error:', e); }
    },
    stop() {
      stopped = true;
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      try { ctx?.close(); } catch(_) {}
      ctx = null;
    }
  };
}

interface CallModalProps {
  type: 'voice' | 'video';
  partnerName: string;
  partnerPic: string;
  onEndCall: () => void;
  onMissed: () => void;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  isAccepted?: boolean; // receiver авсан дохио (удирдлага зогсоох)
  isReceiver?: boolean; // receiver тал — calling tone хэрэггүй
}

const ControlBtn: React.FC<{
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5 group">
    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 group-active:scale-90 ${
      active
        ? 'bg-white text-black shadow-lg'
        : 'bg-white/15 backdrop-blur-sm text-white hover:bg-white/25'
    }`}>
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </div>
    <span className="text-white/50 text-[10px] tracking-wide">{label}</span>
  </button>
);

const CallModal: React.FC<CallModalProps> = ({ 
  type, partnerName, partnerPic, onEndCall, onMissed,
  localStream, remoteStream, isAccepted, isReceiver
}) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'calling' | 'connecting' | 'connected'>(isReceiver ? 'connecting' : 'calling');
  const [duration, setDuration] = useState(0);
  const [currentType, setCurrentType] = useState(type);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(type !== 'video');
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callingToneRef = useRef<{start:()=>void; stop:()=>void} | null>(null);
  
  // Subtitle state
  const [subtitles, setSubtitles] = useState<Array<{text: string, timestamp: number, id: string}>>([]);
  const subtitleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Translation hook for real-time audio processing
  const { 
    isRecording, 
    isProcessing, 
    transcribedText, 
    translatedText,
    startRecording, 
    stopRecording 
  } = useTranslation({
    targetLang: 'en', // Default to English translation
    channel: `call-${partnerName}-${Date.now()}`, // Unique channel for this call
    onTranscription: (text) => {
      // Add new subtitle when transcription is received
      const newSubtitle = {
        text: text,
        timestamp: Date.now(),
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      };
      setSubtitles(prev => [...prev.slice(-2), newSubtitle]); // Keep only last 2 subtitles
      
      // Clear subtitle after 5 seconds
      if (subtitleTimeoutRef.current) {
        clearTimeout(subtitleTimeoutRef.current);
      }
      subtitleTimeoutRef.current = setTimeout(() => {
        setSubtitles([]);
      }, 5000);
    },
    onError: (error) => {
      console.error('Translation error:', error);
    }
  });

  // ===== CALLING TONE — дуудаж байгаа дуу =====
  useEffect(() => {
    if (status === 'calling') {
      const ct = createCallingTone();
      callingToneRef.current = ct;
      ct.start();
      return () => { ct.stop(); callingToneRef.current = null; };
    }
  }, [status]);

  // isAccepted → calling tone зогсоож "холбогдож байна..." харуулах
  useEffect(() => {
    if (isAccepted && status === 'calling') {
      setStatus('connecting');
      callingToneRef.current?.stop();
    }
  }, [isAccepted]);

  useEffect(() => {
    if (localVideoRef.current && localStream && localVideoRef.current.srcObject !== localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(e => console.warn('local play():', e));
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      // stream ирмэгц status connected болгоно + calling tone зогсооно
      setStatus('connected');
      callingToneRef.current?.stop();
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(e => console.warn('remote play():', e));
      }
      
      // Start audio recording for transcription when call is connected
      if (status !== 'connected') {
        setTimeout(() => {
          startRecording().catch(e => console.error('Failed to start recording:', e));
        }, 1000);
      }
    }
  }, [remoteStream, status]);

  // Start/stop recording based on call status
  useEffect(() => {
    if (status === 'connected' && !isRecording) {
      // Start recording with a small delay
      const timer = setTimeout(() => {
        startRecording().catch(e => console.error('Failed to start recording:', e));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status !== 'connected' && isRecording) {
      stopRecording().catch(e => console.error('Failed to stop recording:', e));
    }
  }, [status, isRecording, startRecording, stopRecording]);

  // Stable ref callbacks (useCallback prevents re-fire on every render → no flicker)
  const remoteVideoRefCb = useCallback((el: HTMLVideoElement | null) => {
    (remoteVideoRef as any).current = el;
    if (el && remoteStream && el.srcObject !== remoteStream) {
      el.srcObject = remoteStream;
      el.play().catch(() => {});
    }
  }, [remoteStream]);

  const localVideoRefCb = useCallback((el: HTMLVideoElement | null) => {
    (localVideoRef as any).current = el;
    if (el && localStream && el.srcObject !== localStream) {
      el.srcObject = localStream;
      el.play().catch(() => {});
    }
  }, [localStream]);

  useEffect(() => {
    let interval: any;
    if (status === 'connected') {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Timeout арилгасан — хэрэглэгч дуусгах товч дарах хүртэл дуудлага тасрахгүй

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
  };

  const toggleCamera = async () => {
    if (currentType === 'voice' && isCamOff && (window as any).__callerCallsRef) {
      // Upgrade from voice to video
      await (window as any).__callerCallsRef.upgradeToVideo();
      const newStream = (window as any).__callerCallsRef.localStream;
      if (newStream && localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
      setCurrentType('video'); // Make UI switch to video mode
    } else {
      localStream?.getVideoTracks().forEach(t => { t.enabled = isCamOff; });
    }
    setIsCamOff(!isCamOff);
  };

  const handleEnd = () => {
    callingToneRef.current?.stop();
    onEndCall();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden select-none bg-black" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Facebook-style Full Screen Video Layout */}
      
      {/* REMOTE VIDEO - Full screen background */}
      <div className="absolute inset-0 bg-black z-10">
        <video
          ref={remoteVideoRefCb}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            currentType === 'video' && status === 'connected' && remoteStream ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
      
      {/* Background overlay when no remote video */}
      {!(currentType === 'video' && status === 'connected' && remoteStream) && (
        <div className="absolute inset-0 z-20">
          <img src={partnerPic} className="w-full h-full object-cover scale-110" alt="" />
          <div className="absolute inset-0 backdrop-blur-3xl bg-black/70" />
          <div className="absolute inset-0 opacity-60" style={{
            background: 'radial-gradient(ellipse at 25% 15%, #3b82f670 0%, transparent 55%), radial-gradient(ellipse at 75% 85%, #8b5cf660 0%, transparent 55%)'
          }} />
        </div>
      )}

      {/* LOCAL VIDEO - Small picture-in-picture in top right corner */}
      {!isCamOff && localStream && (
        <div className={`absolute top-6 right-6 z-30 transition-all duration-300 ${status === 'connected' ? 'opacity-100' : 'opacity-0'}`}>
          <div className="relative w-32 h-48 rounded-2xl overflow-hidden border-3 border-white/40 shadow-2xl shadow-black/80">
            <video 
              ref={localVideoRefCb} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover"
            />
            {/* Local video status indicator */}
            <div className="absolute top-2 left-2 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-white text-xs font-medium bg-black/50 px-2 py-0.5 rounded-full">You</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP STATUS BAR ── */}
      <div className="absolute top-0 left-0 right-0 z-40 pt-8 pb-4 px-6 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex flex-col items-center">
          <h2 className="text-white text-2xl font-bold tracking-tight drop-shadow-lg">
            {partnerName}
          </h2>
          <div className="flex items-center gap-2 mt-1.5">
            {status === 'connected' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-300 text-sm font-medium tabular-nums">{formatTime(duration)}</span>
              </>
            ) : status === 'connecting' ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-blue-300 text-sm tracking-widest uppercase animate-pulse">
                  Connecting...
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-white/70 text-sm tracking-widest uppercase animate-pulse">
                  {currentType === 'video' ? 'Video Calling...' : 'Voice Calling...'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CENTER AVATAR (when no video or connecting) ── */}
      {!(currentType === 'video' && status === 'connected') && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6">
          {/* Avatar with rings */}
          <div className="relative flex items-center justify-center">
            {status === 'calling' && (
              <>
                <div className="absolute w-56 h-56 rounded-full border-2 border-white/20 animate-ping" />
                <div className="absolute w-48 h-48 rounded-full border-2 border-white/15 animate-ping" style={{ animationDelay: '0.3s' }} />
                <div className="absolute w-40 h-40 rounded-full border-2 border-white/10 animate-ping" style={{ animationDelay: '0.6s' }} />
              </>
            )}
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl shadow-black/60">
              <img src={partnerPic} className="w-full h-full object-cover" alt={partnerName} />
            </div>
            {status === 'connected' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-black" />
            )}
          </div>

          {/* Sound wave for voice calls */}
          {currentType === 'voice' && status === 'connected' && (
            <div className="flex items-center gap-1.5 h-10">
              {[0.3, 0.6, 1, 0.7, 0.4, 0.8, 0.5, 0.9, 0.6, 0.7, 0.5, 0.8].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-white/70"
                  style={{
                    height: '100%',
                    transform: `scaleY(${h})`,
                    animation: `soundWave 1.2s ease-in-out infinite`,
                    animationDelay: `${i * 0.08}s`
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SUBTITLES POSITIONED ABOVE CONTROLS ── */}
      {status === 'connected' && showSubtitles && subtitles.length > 0 && (
        <div className="absolute bottom-32 left-0 right-0 z-[10000] flex justify-center px-4">
          <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-6 py-4 max-w-2xl w-full border border-white/10 shadow-2xl">
            <div className="flex flex-col gap-2">
              {subtitles.map((sub) => (
                <div key={sub.id} className="text-white text-center animate-fadeIn">
                  <div className="text-lg font-semibold mb-1">{sub.text}</div>
                  {translatedText && (
                    <div className="text-sm text-blue-300 font-medium">
                      {translatedText}
                    </div>
                  )}
                  {isProcessing && (
                    <div className="flex justify-center items-center gap-1 mt-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      <span className="text-xs text-blue-300 ml-2">Translating...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM CONTROL BAR WITH ALL BUTTONS IN ONE ROW ── */}
      <div className="absolute bottom-0 left-0 right-0 z-50 pb-8 px-6">
        {/* Glassmorphism control bar with all buttons in one row */}
        <div className="rounded-3xl p-5 backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
          <div className="flex justify-between items-center">
            {/* Mic Button */}
            <ControlBtn 
              icon={isMuted ? 'mic_off' : 'mic'} 
              label={isMuted ? t('mute') : t('mic')} 
              active={isMuted} 
              onClick={toggleMute} 
            />
            
            {/* Camera Button */}
            <ControlBtn 
              icon={isCamOff ? 'videocam_off' : 'videocam'} 
              label={t('camera')} 
              active={isCamOff} 
              onClick={toggleCamera} 
            />
            
            {/* Speaker Button */}
            <ControlBtn 
              icon={isSpeaker ? 'volume_up' : 'volume_off'} 
              label={t('speaker')} 
              active={!isSpeaker} 
              onClick={() => setIsSpeaker(!isSpeaker)} 
            />
            
            {/* Subtitles/Translation Toggle Button */}
            <button 
              onClick={() => {
                if (!isRecording) {
                  startRecording().catch(e => console.error('Failed to start recording:', e));
                } else {
                  stopRecording().catch(e => console.error('Failed to stop recording:', e));
                }
              }}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 group-active:scale-90 ${
                isRecording
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-white/15 backdrop-blur-sm text-white hover:bg-white/25'
              }`}>
                <span className="material-symbols-outlined text-xl">
                  {isRecording ? 'subtitles' : 'subtitles'}
                </span>
              </div>
              <span className="text-white/50 text-[10px] tracking-wide">
                {isRecording ? 'Stop Trans' : 'Subtitles'}
              </span>
            </button>
            
            {/* End Call Button - same size as others */}
            <button 
              onClick={handleEnd} 
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 group-active:scale-90 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30">
                <span className="material-symbols-outlined text-xl text-white">call_end</span>
              </div>
              <span className="text-white/50 text-[10px] tracking-wide">{t('end_call')}</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes soundWave {
          0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default CallModal;
