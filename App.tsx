import React, { useState, useEffect, useRef } from 'react'; 
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthState, User, UserRole } from './types';
import Login from './pages/Login';
import Register from './pages/Register';
import RoleSelection from './pages/RoleSelection';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Services from './pages/Services';
import Live from './pages/Live';
import CreatePost from './pages/CreatePost';
import PublicProfile from './pages/PublicProfile';
import ChatList from './pages/ChatList';
import ChatDetail from './pages/ChatDetail';
import Translator from './pages/Translator';
import AdminPanel from './pages/AdminPanel';
import { LanguageProvider } from './contexts/LanguageContext';
import { apiLogout } from './services/api';
import { AppConfigProvider } from './contexts/AppConfigContext';
import { MapProvider } from './contexts/MapContext';
import { SnackbarProvider, useSnackbar } from './contexts/SnackbarContext';
import Pusher from 'pusher-js';
import { CloudflareCalls } from './services/cloudflareCalls';
import CallModal from './components/CallModal';

const API_URL = "https://viptravel-backend.erdneebatulzii23.workers.dev";

export const AuthContext = React.createContext<{
  auth: AuthState;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
  logout: () => void;
}>({
  auth: { user: null, isAuthenticated: false, isLoading: true },
  setAuth: () => {},
  logout: () => {},
});

const BUILD_VERSION = "v11.3-20260220";
console.log(`[VipTravel] Build: ${BUILD_VERSION}`);

// ============ RINGTONE — FaceTime загвар гурван ноот ============
function createRingtone() {
  let ctx: AudioContext | null = null;
  let intervalId: any = null;
  let stopped = false;
  const playNote = (c: AudioContext, freq: number, start: number, dur: number, vol: number) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.frequency.value = freq; osc.type = 'sine';
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.02);
    gain.gain.setValueAtTime(vol, start + dur - 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.start(start); osc.stop(start + dur);
  };
  return {
    start() {
      try {
        ctx = new AudioContext();
        stopped = false;
        const ring = () => {
          if (stopped || !ctx) return;
          const t = ctx.currentTime;
          // Гурван ноот: G5 → B5 → D6 (дээшлэх arpeggio)
          playNote(ctx, 783.99, t, 0.15, 0.12);
          playNote(ctx, 987.77, t + 0.18, 0.15, 0.12);
          playNote(ctx, 1174.66, t + 0.36, 0.25, 0.14);
          // Давтагдах
          playNote(ctx, 783.99, t + 0.85, 0.15, 0.12);
          playNote(ctx, 987.77, t + 1.03, 0.15, 0.12);
          playNote(ctx, 1174.66, t + 1.21, 0.25, 0.14);
        };
        ring();
        intervalId = setInterval(ring, 3000);
      } catch(e) { console.warn('Ringtone error:', e); }
    },
    stop() {
      stopped = true;
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      try { ctx?.close(); } catch(_) {}
      ctx = null;
    }
  };
}

import { useLanguage } from './contexts/LanguageContext';

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const { showSnackbar } = useSnackbar();
  const [incomingCall, setIncomingCall] = useState<any>(null);   // яриж байгаа
  const [pendingCall, setPendingCall] = useState<any>(null);      // дуудлага ирж байгаа (авах/татгалзах)
  const [receiverLocalStream, setReceiverLocalStream] = useState<MediaStream | null>(null);
  const [receiverRemoteStream, setReceiverRemoteStream] = useState<MediaStream | null>(null);
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const processedCallIds = useRef<Set<string>>(new Set());
  const callsRef = useRef<CloudflareCalls | null>(null);
  const pendingTracksRef = useRef<{senderSessionId: string; trackIds: string[]} | null>(null);
  const pusherRef = useRef<Pusher | null>(null);

  const ringtoneRef = useRef<{start:()=>void; stop:()=>void} | null>(null);
  const callConnectedAtRef = useRef<number | null>(null);

  // Remote stream: CallModal handles srcObject via props

  // ===== RINGTONE — дуудлага ирэхэд дугарах =====
  useEffect(() => {
    if (pendingCall && !incomingCall) {
      const rt = createRingtone();
      ringtoneRef.current = rt;
      rt.start();
      return () => { rt.stop(); ringtoneRef.current = null; };
    }
  }, [pendingCall, incomingCall]);

  useEffect(() => {
    const storedUser = localStorage.getItem('cj_travel_current_user');
    if (storedUser) {
      setAuth({
        user: JSON.parse(storedUser),
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // ===================== PUSHER & VIDEO CALL INTEGRATION =====================
  // auth.user._id ашиглана — object reference биш, тийм дахин ре-рун хийхгүй
  const userId = auth.user?._id ?? null;
  useEffect(() => {
    if (!auth.isAuthenticated || !userId) return;

    // Аль хэдийн Pusher байвал одоо хаах
    if (pusherRef.current) {
      pusherRef.current.disconnect();
      pusherRef.current = null;
    }

    console.log("Pusher бүртгээлэх ID:", userId);
    const pusher = new Pusher('37cb2c72dc3de4f325bb', { cluster: 'ap1' });
    pusherRef.current = pusher;
    const channel = pusher.subscribe(`user-${userId}`);

      // ДУУДЛАГА ХҮЛЭЭЖ АВАХ — зөвхөн state тохируулна, camera огт асахгүй
      channel.bind('incoming-call', (data: any) => {
        if (!data.id || processedCallIds.current.has(data.id)) return;
        processedCallIds.current.add(data.id);
        pendingTracksRef.current = null;
        setPendingCall(data);
      });

      // НӨГӨӨ ТАЛ ДУУДЛАГА ДУУСГАХАД
      channel.bind('call-ended', () => {
        console.log('[Pusher] call-ended received');
        // Receiver side цэвэрлэх
        ringtoneRef.current?.stop();
        callsRef.current?.close();
        callsRef.current = null;
        pendingTracksRef.current = null;
        setReceiverLocalStream(null);
        setReceiverRemoteStream(null);
        setIncomingCall(null);
        setPendingCall(null);
        // Caller side цэвэрлэх
        const callerEnd = (window as any).__callerEndCall as (() => void) | undefined;
        if (callerEnd) callerEnd();
      });

      // ДУУДЛАГА ХҮЛЭЭН АВАГЧ АВСАН ДОХИО — caller шууд мэдэж удирдлага зогсооно
      channel.bind('call-accepted', () => {
        console.log('[Pusher] call-accepted received');
        const updater = (window as any).__callerSetConnected as (() => void) | undefined;
        if (updater) updater();
      });

      // НӨГӨӨ ТАЛЫН TRACK МЭДЭЭЛЭЛ — хоёр тал (caller + receiver) хоёулаа сонсоно
      channel.bind('call-tracks', async (data: any) => {
        console.log('[call-tracks] received:', { trackIds: data.trackIds, senderSessionId: data.senderSessionId });
        // Caller (ChatDetail) instance шалгах
        const callerCalls = (window as any).__callerCallsRef as import('./services/cloudflareCalls').CloudflareCalls | undefined;
        if (callerCalls?.sessionId) {
          try {
            if (data.trackIds && data.trackIds.length > 0) {
              console.log('[call-tracks] caller pulling receiver tracks...');
              const ok = await callerCalls.pullTracksRetry(callerCalls.sessionId, data.senderSessionId, data.trackIds, 4);
              console.log('[call-tracks] caller pullTracks:', ok ? 'OK' : 'FAILED');
              // Backup: ontrack ажиллаагүй бол getRemoteStream()-ээр
              // ontrack handler in ChatDetail sets state directly — no backup needed (flicker fix)
            } else {
              console.log('[call-tracks] receiver trackIds хоосон');
            }
          } catch (err) {
            console.error('Caller pullTracks алдаа:', err);
          }
          return;
        }
        // Receiver (App.tsx) instance шалгах
        if (!callsRef.current?.sessionId) {
          console.log('[call-tracks] session байхгүй, pending-д хадгална');
          pendingTracksRef.current = { senderSessionId: data.senderSessionId, trackIds: data.trackIds };
          return;
        }
        const mySessionId = callsRef.current.sessionId;
        try {
          console.log('[call-tracks] receiver pulling caller tracks...');
          await callsRef.current.pullTracksRetry(mySessionId, data.senderSessionId, data.trackIds, 4);
        } catch (err) {
          console.error('pullTracks алдаа:', err);
        }
      });

    return () => {
      pusher.unsubscribe(`user-${userId}`);
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, [auth.isAuthenticated, userId]);
  // =================================================================================

  const logout = async () => {
    if (auth.user) {
      await apiLogout(auth.user._id);
    }
    localStorage.removeItem('cj_travel_current_user');
    setAuth({ user: null, isAuthenticated: false, isLoading: false });
  };

  const endCall = (silent?: boolean) => {
    const partnerId = incomingCall?.senderId || pendingCall?.senderId;
    const callTypeStr = (incomingCall?.type || pendingCall?.type || '');
    const ct = callTypeStr.includes('video') ? 'video' : 'voice';
    const wasAnswered = !!incomingCall;
    const duration = callConnectedAtRef.current ? Math.floor((Date.now() - callConnectedAtRef.current) / 1000) : 0;

    if (!silent && partnerId) {
      fetch(`${API_URL}/messages/call/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notifyUserId: partnerId,
          callerId: partnerId,
          receiverId: userId,
          callType: ct,
          duration,
          answered: wasAnswered
        })
      }).catch(e => console.error('call-end notify error:', e));
    }
    ringtoneRef.current?.stop();
    callConnectedAtRef.current = null;
    callsRef.current?.close();
    callsRef.current = null;
    pendingTracksRef.current = null;
    setReceiverLocalStream(null);
    setReceiverRemoteStream(null);
    setIncomingCall(null);
    setPendingCall(null);
  };

  // ХҮЛЭЭН АВАХ — BIDIRECTIONAL SIGNALING (Facebook Messenger зарчим)
  const acceptCall = async () => {
    if (!pendingCall || !auth.user) return;
    if (callsRef.current) return; // re-entrancy guard — аль хэдийн авч байна
    const data = pendingCall;
    setPendingCall(null);

    // ⚡ UI-г ШУУД харуулна — freeze байхгүй
    setIncomingCall(data);

    try {
      const calls = new CloudflareCalls();
      callsRef.current = calls;
      await calls.refreshIceServers(); // ← нэмэх

      const isVideo = data.type === 'video_call';

      // ⚡ Caller-т ШУУД "дуудлага авсан" дохио илгээх (хүлээлгэгүй fire-and-forget)
      fetch(`${API_URL}/messages/call/accepted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerId: data.senderId }),
      }).catch(() => {});

      // STRICT MEDIA ACQUISITION: Камер/микрофон асаах (дуудлага авахаасаа өмнө)
      console.log('[acceptCall] Acquiring media before answering...');
      try {
        const stream = await calls.startLocalStream(isVideo);
        if (!stream) {
          throw new Error('Failed to acquire media - cannot answer call');
        }
        
        // Voice call: disable video tracks (user can toggle on later)
        if (!isVideo && stream) {
          stream.getVideoTracks().forEach(t => { 
            console.log(`[acceptCall] Disabling video track for voice call: ${t.id}`);
            t.enabled = false; 
          });
        }
        
        // Ensure we have at least audio for bidirectional communication
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          console.warn('[acceptCall] No audio track available, trying to get audio only');
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              }
            });
            audioStream.getAudioTracks().forEach(track => {
              stream.addTrack(track);
            });
            console.log('[acceptCall] Added audio track to stream');
          } catch (audioErr) {
            console.error('[acceptCall] Failed to get audio track:', audioErr);
          }
        }
        
        // Local stream-г шууд UI-д харуулна
        setReceiverLocalStream(stream);
      } catch (mediaErr: any) {
        console.error('[acceptCall] Media acquisition failed:', mediaErr);
        // Continue without media but warn user
        showSnackbar('Unable to access camera/microphone. Call will continue without your video/audio.', 'warning');
      }

      // Нэг тогтвортой MediaStream — ontrack бүрт шинэ stream үүсгэхгүй
      const remoteStream = new MediaStream();
      calls.pc.ontrack = (event) => {
        console.log('[ontrack receiver] track:', event.track.kind, event.track.readyState, event.track.id);
        remoteStream.addTrack(event.track);
        // Same ref = no extra re-render, CallModal handles srcObject via props
        setReceiverRemoteStream(remoteStream);
      };

      // BIDIRECTIONAL SIGNALING: Өөрийн localStream-ийг peerConnection-д нэмж, дараа нь createAnswer хий
      console.log('[acceptCall] Adding local stream to peer connection...');
      if (calls.localStream) {
        calls.addLocalStreamToConnection();
      }

      // Өөрийн session үүсгэх + tracks push
      const { sessionId: mySessionId, trackIds: myTrackIds } = await calls.startSession();
      console.log('[acceptCall] session created:', mySessionId, 'trackIds:', myTrackIds);

      // Өөрийн track-уудыг Caller-т ШУУД буцаах (ICE хүлээх шаардлагагүй, tracks/new API-аар бүртгэгдсэн)
      await fetch(`${API_URL}/messages/call/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: data.senderId,
          senderSessionId: mySessionId,
          trackIds: myTrackIds,
        }),
      });

      // Caller-ийн track-уудыг pull хийх (retry логиктай)
      const pending = pendingTracksRef.current;
      pendingTracksRef.current = null;
      if (pending && pending.trackIds.length > 0) {
        console.log('[acceptCall] pulling caller tracks:', pending.trackIds);
        const ok = await calls.pullTracksRetry(mySessionId, pending.senderSessionId, pending.trackIds, 3);
        console.log('[acceptCall] pullTracks result:', ok, 'remote tracks:', remoteStream.getTracks().map(t => `${t.kind}:${t.readyState}`));
      } else {
        console.log('[acceptCall] caller tracks ирээгүй, pendingTracksRef-д хадгалагдана');
      }

      // ROBUST CONNECTION LOGIC: ICE candidate monitoring
      console.log('[acceptCall] Waiting for ICE connection...');
      const connected = await calls.waitForConnection(15000);
      if (!connected) {
        console.warn('[acceptCall] ICE connection timeout, but continuing...');
      }

      callConnectedAtRef.current = Date.now();
    } catch (err: any) {
      console.error('Дуудлага авахад алдаа:', err);
      endCall();
    }
  };

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout }}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/login" element={!auth.isAuthenticated ? <Login /> : <Navigate to="/" />} />
            <Route path="/role-select" element={!auth.isAuthenticated ? <RoleSelection /> : <Navigate to="/" />} />
            <Route path="/register/:role" element={!auth.isAuthenticated ? <Register /> : <Navigate to="/" />} />
            
            <Route path="/" element={auth.isAuthenticated ? <Feed /> : <Navigate to="/login" />} />
            <Route path="/create" element={auth.isAuthenticated ? <CreatePost /> : <Navigate to="/login" />} />
            <Route path="/profile" element={auth.isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
            <Route path="/profile/:userId" element={auth.isAuthenticated ? <PublicProfile /> : <Navigate to="/login" />} />
            <Route path="/services" element={auth.isAuthenticated ? <Services /> : <Navigate to="/login" />} />
            <Route path="/live" element={auth.isAuthenticated ? <Live /> : <Navigate to="/login" />} />
            
            <Route path="/chats" element={auth.isAuthenticated ? <ChatList /> : <Navigate to="/login" />} />
            <Route path="/chat/:userId" element={auth.isAuthenticated ? <ChatDetail /> : <Navigate to="/login" />} />
            
            <Route path="/translator" element={auth.isAuthenticated ? <Translator /> : <Navigate to="/login" />} />
            
            <Route path="/admin" element={auth.isAuthenticated && (auth.user?.role === UserRole.Admin || auth.user?.isAdmin) ? <AdminPanel /> : <Navigate to="/" />} />
            
            <Route path="/resorts" element={<Navigate to="/services" />} />
            <Route path="/providers" element={<Navigate to="/services" />} />
            <Route path="/guides" element={<Navigate to="/services" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>

      {/* Дуудлага ирж байна — авах/татгалзах UI */}
      {pendingCall && !incomingCall && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-8">
          <div className="text-white text-center">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="material-symbols-outlined text-5xl text-white">
                {pendingCall.type === 'video_call' ? 'videocam' : 'call'}
              </span>
            </div>
            <p className="text-lg font-semibold">{pendingCall.senderName}</p>
            <p className="text-sm text-white/60 mt-1">
              {pendingCall.type === 'video_call' ? t('incoming_video_call') : t('incoming_voice_call')}
            </p>
          </div>
          <div className="flex gap-12">
            <button onClick={() => endCall()} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                <span className="material-symbols-outlined text-3xl text-white">call_end</span>
              </div>
              <span className="text-white/70 text-xs">{t('decline')}</span>
            </button>
            <button onClick={acceptCall} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                <span className="material-symbols-outlined text-3xl text-white">call</span>
              </div>
              <span className="text-white/70 text-xs">{t('accept')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Яриж байгаа UI — CallModal ашиглана (receiver тал) */}
      {incomingCall && (
        <CallModal
          type={incomingCall.type === 'video_call' ? 'video' : 'voice'}
          partnerName={incomingCall.senderName || 'Unknown'}
          partnerPic={incomingCall.senderPic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}
          onEndCall={() => endCall()}
          onMissed={() => endCall()}
          localStream={receiverLocalStream}
          remoteStream={receiverRemoteStream}
          isAccepted={true}
          isReceiver={true}
        />
      )}
    </AuthContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppConfigProvider>
        <MapProvider>
          <SnackbarProvider>
            <AppContent />
          </SnackbarProvider>
        </MapProvider>
      </AppConfigProvider>
    </LanguageProvider>
  );
};

export default App;
