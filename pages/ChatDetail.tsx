import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    apiGetMessages, apiSendMessage, apiGetUser, compressMedia, 
    apiSubscribeToMessages, apiMarkMessagesRead, apiGetChatSettings,
    apiInitiateCall, apiSendCallTracks, apiUploadMedia
} from '../services/api';       
import { Message, User, ChatSettings } from '../types';
import { AuthContext } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import CallModal from '../components/CallModal';
import { CloudflareCalls } from '../services/cloudflareCalls'; 
import Pusher from 'pusher-js';
import { useSnackbar } from '../contexts/SnackbarContext';

const API_URL = "https://viptravel-backend.erdneebatulzii23.workers.dev";

// =========================================================
// VOICE MESSAGE PLAYER COMPONENT
// =========================================================
const VoiceMessage: React.FC<{ src: string; isMe: boolean }> = ({ src, isMe }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dur, setDur] = useState(0);
  const animRef = useRef<number>(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      cancelAnimationFrame(animRef.current);
    } else {
      a.play().then(() => {
        setPlaying(true);
        const tick = () => {
          if (a.paused) return;
          setProgress(a.duration ? a.currentTime / a.duration : 0);
          animRef.current = requestAnimationFrame(tick);
        };
        tick();
      }).catch(e => console.warn('audio play:', e));
    }
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onLoaded = () => setDur(a.duration || 0);
    const onEnded = () => { setPlaying(false); setProgress(0); cancelAnimationFrame(animRef.current); };
    a.addEventListener('loadedmetadata', onLoaded);
    a.addEventListener('ended', onEnded);
    return () => {
      a.removeEventListener('loadedmetadata', onLoaded);
      a.removeEventListener('ended', onEnded);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Waveform bars (decorative)
  const bars = [0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.9, 0.65, 0.8, 0.45, 0.75, 0.55, 0.9, 0.7, 0.5];

  return (
    <div className="flex items-center gap-2.5 min-w-[180px] max-w-[260px]">
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />
      <button onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
        isMe ? 'bg-white/25 text-white' : 'bg-blue-500 text-white'
      }`}>
        <span className="material-symbols-outlined text-lg">{playing ? 'pause' : 'play_arrow'}</span>
      </button>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* Waveform */}
        <div className="flex items-end gap-px h-5">
          {bars.map((h, i) => {
            const filled = progress > i / bars.length;
            return (
              <div key={i} className={`flex-1 rounded-full transition-colors duration-150 ${
                filled 
                  ? (isMe ? 'bg-white' : 'bg-blue-500') 
                  : (isMe ? 'bg-white/30' : 'bg-slate-300 dark:bg-slate-600')
              }`} style={{ height: `${h * 100}%` }} />
            );
          })}
        </div>
        <span className={`text-[10px] tabular-nums ${isMe ? 'text-white/60' : 'text-slate-400'}`}>
          {fmt(dur)}
        </span>
      </div>
    </div>
  );
};

const ChatDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { showSnackbar } = useSnackbar();
  const { auth } = useContext(AuthContext);
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(null);
  const [remoteStreamState, setRemoteStreamState] = useState<MediaStream | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callsRef = useRef<CloudflareCalls | null>(null);
  const callPusherCleanupRef = useRef<(() => void) | null>(null);
  const callInProgressRef = useRef(false); // double-tap guard
  const callConnectedAtRef = useRef<number | null>(null); // дуудлага холбогдсон цаг

  const [chatSettings, setChatSettings] = useState<ChatSettings>({ 
      wallpaper: 'bg-slate-50 dark:bg-[#0d141b]', 
      font: 'font-sans', 
      muted: false 
  });
  const [isBlocked, setIsBlocked] = useState(false);
  const [amIBlocked, setAmIBlocked] = useState(false);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);

  // Message delete & chat settings
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const longPressTimerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const isInitialLoadRef = useRef(true);
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '✈️', '📷', '🇲🇳', '👋', '🙏', '😊', '😎', '🚌', '🏕️'];

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm(t('confirm_delete_msg'))) return;
    try {
      await fetch(`${API_URL}/messages/${msgId}`, { method: 'DELETE' });
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (e) { console.error(e); }
    setSelectedMsgId(null);
  };

  const handleDeleteConversation = async () => {
    if (!auth.user || !userId) return;
    if (!confirm(t('confirm_delete_chat'))) return;
    try {
      await fetch(`${API_URL}/conversations/${auth.user._id}/${userId}`, { method: 'DELETE' });
      // ChatList-д refresh хийхэд туслах event trigger хийх
      window.dispatchEvent(new CustomEvent('chat-deleted'));
      navigate('/chats');
    } catch (e) { console.error(e); }
    setShowChatMenu(false);
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showSnackbar('Message copied to clipboard', 'success');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
    setSelectedMsgId(null);
  };

  const handleReplyMessage = (msg: Message) => {
    setInputText(`Replying to: ${msg.text?.substring(0, 50)}${msg.text && msg.text.length > 50 ? '...' : ''}\n`);
    setSelectedMsgId(null);
  };

  const handleForwardMessage = async (msg: Message) => {
    if (!auth.user || !userId) return;
    
    const forwardTo = prompt('Enter user ID to forward to:');
    if (!forwardTo) {
      setSelectedMsgId(null);
      return;
    }
    
    try {
      // Use the API function to forward message
      const response = await fetch(`${API_URL}/messages/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalMessageId: msg.id,
          senderId: auth.user._id,
          receiverId: forwardTo
        })
      });
      
      if (response.ok) {
        showSnackbar('Message forwarded successfully', 'success');
      } else {
        showSnackbar('Failed to forward message', 'error');
      }
    } catch (e) {
      console.error(e);
      showSnackbar('Error forwarding message', 'error');
    }
    setSelectedMsgId(null);
  };

  const handleAddReaction = async (messageId: string, reaction: string) => {
    if (!auth.user) return;
    try {
      const response = await fetch(`${API_URL}/messages/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, userId: auth.user._id, reaction })
      });
      if (response.ok) {
        loadMessages(); // Refresh messages to show reaction
      }
    } catch (e) {
      console.error('Failed to add reaction:', e);
    }
  };

  const handleRemoveReaction = async (messageId: string) => {
    if (!auth.user) return;
    try {
      const response = await fetch(`${API_URL}/messages/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, userId: auth.user._id, reaction: null })
      });
      if (response.ok) {
        loadMessages(); // Refresh messages
      }
    } catch (e) {
      console.error('Failed to remove reaction:', e);
    }
  };

  const handleMsgLongPress = (msgId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setSelectedMsgId(msgId);
    }, 500);
  };

  const handleMsgTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  
  const loadMessages = async () => {
    if (auth.user && userId) {
      try {
        const data = await apiGetMessages(auth.user._id, userId);
        if (Array.isArray(data)) {
          setMessages(data);
        }
      } catch (e) {
        console.error("Messages load error", e);
      }
    }
  };

  useEffect(() => {
    const initChat = async () => {
        if (userId && auth.user) {
            // Fetch everything in parallel to avoid sequential delay
            const [u, settings, _msgs] = await Promise.all([
                apiGetUser(userId),
                apiGetChatSettings(auth.user._id, userId),
                loadMessages()
            ]);

            if (u) {
                setPartner(u);
                if (u.blockedUsers?.includes(auth.user._id)) setAmIBlocked(true);
            }
            if (auth.user.blockedUsers?.includes(userId)) setIsBlocked(true);

            if (settings && (settings as any).wallpaper) {
                setChatSettings(settings);
            }

            apiMarkMessagesRead(auth.user._id, userId);
        }
    };
    initChat();
  }, [userId, auth.user?._id]);

  const authUserId = auth.user?._id;
  useEffect(() => {
    if (userId && authUserId) {
        const unsubscribe = apiSubscribeToMessages(() => {
          loadMessages();
          apiMarkMessagesRead(authUserId, userId);
        });

        const interval = setInterval(loadMessages, 5000);

        return () => {
            unsubscribe();
            clearInterval(interval);
            if (callsRef.current) {
                callsRef.current.close();
                callsRef.current = null;
            }
        };
    }
  }, [userId, authUserId]);

  useEffect(() => {
    if (isInitialLoadRef.current && messages.length > 0) {
      // Анхны ачаалалд шууд доош очих
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      isInitialLoadRef.current = false;
      return;
    }
    // Хэрэглэгч доод хэсэгт байвал л автоматаар scroll хийх
    if (!isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Дуудлага холбогдсон цаг тэмдэглэх
  useEffect(() => {
    if (remoteStreamState && callActive && !callConnectedAtRef.current) {
        callConnectedAtRef.current = Date.now();
    }
  }, [remoteStreamState, callActive]);

  const handleSend = async () => {
    if (!inputText.trim() || !auth.user || !userId) return;
    const text = inputText;
    setInputText('');
    setShowEmojiPicker(false);
    try {
        const newMessage = await apiSendMessage(auth.user._id, userId, text);
        setMessages(prev => [...prev, newMessage]); 
    } catch (e) {
        showSnackbar(t('send_failed'), 'error');
    }
  };

  const endCall = (silent?: boolean) => {
    const myCallType = callType || 'voice';
    const wasConnected = callActive && !!callConnectedAtRef.current;
    const duration = callConnectedAtRef.current ? Math.floor((Date.now() - callConnectedAtRef.current) / 1000) : 0;

    callInProgressRef.current = false;
    callConnectedAtRef.current = null;
    if (!silent && userId && auth.user) {
      fetch(`${API_URL}/messages/call/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notifyUserId: userId,
          callerId: auth.user._id,
          receiverId: userId,
          callType: myCallType,
          duration,
          answered: wasConnected
        })
      }).catch(e => console.error('call-end error:', e));
    }
    if (callsRef.current) {
        callsRef.current.close();
        callsRef.current = null;
    }
    if (callPusherCleanupRef.current) {
        callPusherCleanupRef.current();
        callPusherCleanupRef.current = null;
    }
    delete (window as any).__callerCallsRef;
    delete (window as any).__callerRemoteUpdate;
    delete (window as any).__callerEndCall;
    delete (window as any).__callerSetConnected;
    setLocalStreamState(null);
    setRemoteStreamState(null);
    setCallActive(false);
    setCallType(null);
    setCallAccepted(false);
  };

  // =========================================================
  // ДУУДЛАГА ЭХЛҮҮЛЭХ - БИДИРЕКШНЛ СИГНАЛ (Facebook Messenger зарчим)
  // =========================================================
  const startCall = async (type: 'voice' | 'video') => {
    if (!auth.user || !partner) return;
    if (callInProgressRef.current || callActive || callsRef.current) return;
    callInProgressRef.current = true;
    console.log('[startCall] starting', type);
    try {
        const calls = new CloudflareCalls();
        callsRef.current = calls;
        await calls.refreshIceServers(); // ← нэмэх
        
        // 1. STRICT MEDIA ACQUISITION: Камер/микрофон асаах (дуудлага илгээхээс өмнө)
        console.log('[startCall] Acquiring media before sending any signaling...');
        const stream = await calls.startLocalStream(type === 'video');
        if (!stream) {
          throw new Error('Failed to acquire media - cannot start call');
        }
        setLocalStreamState(stream);

        // 2. Remote track stable stream — ref-ээр шууд video element-д оноох
        const callerRemoteStream = new MediaStream();
        calls.pc.ontrack = (event) => {
            console.log('[ontrack caller] track:', event.track.kind, event.track.readyState);
            callerRemoteStream.addTrack(event.track);
            // Same ref = React won't re-render on subsequent calls (flicker fix)
            setRemoteStreamState(callerRemoteStream);
        };

        // 2.1 ⚡ Global ref-г ШУУД тохируулах
        (window as any).__callerCallsRef = calls;
        (window as any).__callerRemoteUpdate = (s: MediaStream) => {
          console.log('[callerRemoteUpdate] tracks:', s.getTracks().map(t => `${t.kind}:${t.readyState}`));
          setRemoteStreamState(s);
        };
        (window as any).__callerEndCall = () => {
          endCall(true);
        };
        // call-accepted event → calling tone зогсоож "connected" харуулах
        (window as any).__callerSetConnected = () => {
          console.log('[callerSetConnected] receiver accepted!');
          setCallAccepted(true);
        };

        // 3. ⚡ CallModal-г ШУУД нээнэ! (дуудаж байна... төлөвтэй)
        setCallActive(true);
        setCallType(type);

        // 4. BIDIRECTIONAL SIGNALING: Өөрийн бүх track-ийг нэмсэн байх
        console.log('[startCall] Adding all local tracks to peer connection...');
        calls.addLocalStreamToConnection();

        // 5. Session + tracks (2-step Cloudflare)
        const { sessionId: mySessionId, trackIds } = await calls.startSession();
        console.log('[startCall] session created:', mySessionId, 'tracks:', trackIds);

        // 6. Backend дуудлага илгээх (media бэлэн болсны дараа)
        const callRes = await fetch(`${API_URL}/messages/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              senderId: auth.user._id, 
              receiverId: userId, 
              type: type, 
              senderName: auth.user.name || "User",
              senderPic: auth.user.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
          })
        });
        const callData = await callRes.json() as any;
        if (!callRes.ok) throw new Error(callData.error || t('backend_error'));

        // 7. trackIds илгээх (receiver-т өөрийн track мэдээлэл)
        await fetch(`${API_URL}/messages/call/tracks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                receiverId: userId,
                senderSessionId: mySessionId,
                trackIds
            })
        });
        console.log('[startCall] tracks sent to receiver');

        // 8. ROBUST CONNECTION LOGIC: ICE candidate monitoring
        console.log('[startCall] Waiting for ICE connection...');
        const connected = await calls.waitForConnection(15000);
        if (!connected) {
          console.warn('[startCall] ICE connection timeout, but continuing...');
        }

    } catch (e: any) {
        console.error("Call Error:", e);
        endCall();
    }
  };

  // =========================================================
  // VOICE MESSAGE RECORDING
  // =========================================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick best supported mimeType (mp4/aac for iOS, webm/opus for others)
      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        const preferred = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
        for (const mt of preferred) {
          if (MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break; }
        }
      }
      console.log('[voice] recording mimeType:', mimeType);
      const ext = mimeType.includes('mp4') || mimeType.includes('aac') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (audioChunksRef.current.length === 0) return;
        
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 500) return;
        
        try {
          const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: mimeType.split(';')[0] });
          const url = await apiUploadMedia(file);
          if (auth.user && userId) {
            await apiSendMessage(auth.user._id, userId, undefined, url, 'voice', file.name);
            loadMessages();
          }
        } catch (err) {
          console.error('Voice upload error:', err);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      showSnackbar(t('mic_error'), 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingTime(0);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const formatRecTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && auth.user && userId) {
      const file = e.target.files[0];
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      try {
        const mediaUrl = await apiUploadMedia(file); 
        const newMessage = await apiSendMessage(auth.user._id, userId, undefined, mediaUrl, type, file.name);
        setMessages(prev => [...prev, newMessage]);
      } catch (error) {
        console.error("Upload error:", error);
        showSnackbar(t('upload_failed'), 'error');
      }
    }
  };

  return (
    <div className={`flex flex-col h-full ${chatSettings.wallpaper} ${chatSettings.font} relative`}>
      {/* Header — fixed бэхэлсэн, хэзээ ч алга болохгүй */}
      <div className="fixed top-0 left-0 right-0 max-w-md mx-auto flex items-center justify-between px-3 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/60 z-50">
        <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => navigate('/chats')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 -ml-1 transition-colors">
                <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            {partner && (
                <div className="flex items-center gap-2.5 cursor-pointer min-w-0" onClick={() => navigate(`/profile/${partner._id}`)}>
                    <div className="relative flex-shrink-0">
                      <img src={partner.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-700" alt={partner.name} />
                      {partner.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-slate-900" />}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-sm dark:text-white truncate">{partner.name}</h3>
                        <p className="text-[10px] text-slate-400">{partner.isOnline ? t('online_status') : ''}</p>
                    </div>
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={() => startCall('voice')} className="w-9 h-9 flex items-center justify-center rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all active:scale-90" title={t('voice_call')}>
                <span className="material-symbols-outlined text-[22px]">call</span>
            </button>
            <button onClick={() => startCall('video')} className="w-9 h-9 flex items-center justify-center rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all active:scale-90" title={t('video_call')}>
                <span className="material-symbols-outlined text-[22px]">videocam</span>
            </button>
            <div className="relative">
                <button onClick={() => setShowChatMenu(!showChatMenu)} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90">
                    <span className="material-symbols-outlined text-[22px]">more_vert</span>
                </button>
                {showChatMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 shadow-xl rounded-2xl border border-slate-100 dark:border-slate-700 z-50 py-1 overflow-hidden animate-slide-up">
                        <button onClick={handleDeleteConversation} className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">delete_sweep</span>
                            {t('delete_chat')}
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Messages List */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pt-[52px] p-4 space-y-4 no-scrollbar"
        onScroll={() => {
          const el = scrollContainerRef.current;
          if (!el) return;
          const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
          setIsUserScrolling(!isAtBottom);
        }}
      >
          {messages.map((msg) => {
              // Дуудлагын бүртгэл — төвд, тусгай загвар
              if (msg.mediaType === 'call_log') {
                  let displayValue = msg.text;
                  let icon = 'call';

                  if (msg.text?.startsWith('CALL_LOG:')) {
                      const parts = msg.text.split(':');
                      const callType = parts[1]; // VIDEO or VOICE
                      const duration = parts[2]; // MISSED or seconds
                      icon = callType === 'VIDEO' ? 'videocam' : 'call';

                      if (duration === 'MISSED') {
                          displayValue = t(`missed_${callType.toLowerCase()}_call`);
                      } else {
                          const d = parseInt(duration);
                          const mins = Math.floor(d / 60);
                          const secs = d % 60;
                          const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                          displayValue = `${t(`${callType.toLowerCase()}_call_log`)} · ${timeStr}`;
                      }
                  } else {
                      // Fallback for old Mongolian logs
                      icon = msg.text?.includes('Видео') ? 'videocam' : 'call';
                  }

                  return (
                      <div key={msg.id} className="flex justify-center my-1">
                          <div className="bg-slate-100 dark:bg-slate-800/80 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                              <span className="material-symbols-outlined text-sm text-slate-400">
                                  {icon}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">{displayValue}</span>
                              <span className="text-[9px] text-slate-400 ml-1">
                                  {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                          </div>
                      </div>
                  );
              }
              const isMe = msg.senderId === auth.user?._id;
              return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} relative group`}
                       onTouchStart={() => handleMsgLongPress(msg.id)}
                       onTouchEnd={handleMsgTouchEnd}
                       onContextMenu={(e) => { e.preventDefault(); setSelectedMsgId(msg.id); }}
                  >
                      <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${
                          isMe 
                          ? 'bg-primary text-white rounded-br-none' 
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none border border-slate-100 dark:border-slate-700'
                      }`}>
                          {msg.media ? (
                              msg.mediaType === 'image' ? <img src={msg.media} className="rounded-lg max-w-full" alt="sent content" /> : 
                              msg.mediaType === 'video' ? <video src={msg.media} controls className="rounded-lg max-w-full" /> :
                              msg.mediaType === 'voice' ? (
                                <VoiceMessage src={msg.media!} isMe={isMe} />
                              ) :
                              <a href={msg.media} download={msg.fileName} className="underline text-xs">{msg.fileName || 'File'}</a>
                          ) : <p className="text-sm">{msg.text}</p>}
                          <div className={`text-[9px] mt-1 flex justify-end opacity-70`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                      </div>
                      {/* Message action popup */}
                      {selectedMsgId === msg.id && (
                          <div className={`absolute ${isMe ? 'right-0' : 'left-0'} -top-16 z-50 flex items-center gap-1 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-slate-200 dark:border-slate-700 px-1 py-1 animate-slide-up`}>
                              <button onClick={() => handleCopyMessage(msg.text || '')} className="flex items-center gap-1 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs">
                                  <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                              </button>
                              <button onClick={() => handleReplyMessage(msg)} className="flex items-center gap-1 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs">
                                  <span className="material-symbols-outlined text-sm">reply</span> Reply
                              </button>
                              <button onClick={() => handleForwardMessage(msg)} className="flex items-center gap-1 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs">
                                  <span className="material-symbols-outlined text-sm">forward</span> Forward
                              </button>
                              <button onClick={() => handleDeleteMessage(msg.id)} className="flex items-center gap-1 px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-bold">
                                  <span className="material-symbols-outlined text-sm">delete</span> {t('delete')}
                              </button>
                              <button onClick={() => setSelectedMsgId(null)} className="flex items-center px-2 py-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs">
                                  <span className="material-symbols-outlined text-sm">close</span>
                              </button>
                          </div>
                      )}
                  </div>
              );
          })}
          <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!(isBlocked || amIBlocked) ? (
          <div className="px-2.5 py-2.5 pb-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-700/60">
            {isRecording ? (
              /* Voice Recording UI */
              <div className="flex items-center gap-2 py-1">
                <button onClick={cancelRecording} className="text-slate-400 hover:text-red-500 p-2 transition-colors flex-shrink-0">
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
                <div className="flex-1 flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-2xl px-4 py-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium tabular-nums">{formatRecTime(recordingTime)}</span>
                  <div className="flex-1 flex items-center justify-center gap-0.5 h-6">
                    {[0.3, 0.6, 1, 0.7, 0.4, 0.8, 0.5, 0.9, 0.3, 0.7].map((h, i) => (
                      <div key={i} className="w-0.5 rounded-full bg-red-400/60" style={{
                        height: '100%', transform: `scaleY(${h})`,
                        animation: 'soundWave 0.9s ease-in-out infinite',
                        animationDelay: `${i * 0.08}s`
                      }} />
                    ))}
                  </div>
                </div>
                <button onClick={stopRecording} className="bg-blue-500 hover:bg-blue-600 text-white p-2.5 rounded-full shadow-sm flex items-center justify-center active:scale-90 transition-all flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
            ) : (
              /* Normal Input UI */
              <div className="flex items-center gap-1.5">
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-slate-400 hover:text-primary p-1.5 transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-xl">sentiment_satisfied</span>
                </button>
                <label className="text-slate-400 hover:text-primary p-1.5 cursor-pointer transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-xl">attach_file</span>
                    <input type="file" className="hidden" onChange={handleMediaUpload} />
                </label>
                <div className="flex-1 relative">
                  <input 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Message..."
                      className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5 text-sm outline-none dark:text-white border-none focus:ring-2 focus:ring-blue-500/20 transition-shadow"
                  />
                </div>
                {inputText.trim() ? (
                  <button onClick={handleSend} className="bg-blue-500 hover:bg-blue-600 text-white p-2.5 rounded-full shadow-sm flex items-center justify-center active:scale-90 transition-all flex-shrink-0">
                      <span className="material-symbols-outlined text-lg">send</span>
                  </button>
                ) : (
                  <button onClick={startRecording} className="bg-blue-50 dark:bg-blue-500/10 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/20 w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-all flex-shrink-0">
                      <span className="material-symbols-outlined text-[22px]">mic</span>
                  </button>
                )}
              </div>
            )}
          </div>
      ) : (
          <div className="p-4 bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-500 font-bold uppercase tracking-wider">
              {isBlocked ? "Та энэ хэрэглэгчийг блоклосон байна" : "Та энэ хэрэглэгчид блоклогдсон байна"}
          </div>
      )}

      {showEmojiPicker && (
          <div className="absolute bottom-20 left-4 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-3 grid grid-cols-6 gap-1 z-20 border border-slate-100 dark:border-slate-700 animate-slide-up">
              {emojis.map(e => <button key={e} onClick={() => { setInputText(p => p + e); setShowEmojiPicker(false); }} className="text-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">{e}</button>)}
          </div>
      )}

      {/* CallModal — stream state-аар дамжуулна (prop change → useEffect → srcObject) */}
      {callType && partner && callActive && (
          <CallModal
              type={callType}
              partnerName={partner.name}
              partnerPic={partner.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}
              onEndCall={endCall}
              onMissed={endCall}
              localStream={localStreamState}
              remoteStream={remoteStreamState}
              isAccepted={callAccepted}
          />
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes soundWave {
          0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ChatDetail;
