import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import Pusher from 'pusher-js';
import { CloudflareCalls } from '../services/cloudflareCalls';
import { AuthContext } from '../App';
import { useSnackbar } from './SnackbarContext';
import { useLanguage } from './LanguageContext';
import CallModal from '../components/CallModal';

const API_URL = import.meta.env.VITE_API_URL || "https://viptravel-backend.erdneebatulzii23.workers.dev";

interface CallContextType {
  incomingCall: any;
  pendingCall: any;
  receiverLocalStream: MediaStream | null;
  receiverRemoteStream: MediaStream | null;
  acceptCall: () => Promise<void>;
  endCall: (silent?: boolean) => void;
  callsRef: React.MutableRefObject<CloudflareCalls | null>;
}

export const CallContext = createContext<CallContextType>({
  incomingCall: null,
  pendingCall: null,
  receiverLocalStream: null,
  receiverRemoteStream: null,
  acceptCall: async () => {},
  endCall: () => {},
  callsRef: { current: null }
});

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

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const { showSnackbar } = useSnackbar();
  const { auth } = useContext(AuthContext);
  
  const [incomingCall, setIncomingCall] = useState<any>(null);   // яриж байгаа
  const [pendingCall, setPendingCall] = useState<any>(null);      // дуудлага ирж байгаа (авах/татгалзах)
  const [receiverLocalStream, setReceiverLocalStream] = useState<MediaStream | null>(null);
  const [receiverRemoteStream, setReceiverRemoteStream] = useState<MediaStream | null>(null);

  const processedCallIds = useRef<Set<string>>(new Set());
  const callsRef = useRef<CloudflareCalls | null>(null);
  const pendingTracksRef = useRef<{senderSessionId: string; trackIds: string[]} | null>(null);
  const pusherRef = useRef<Pusher | null>(null);

  const ringtoneRef = useRef<{start:()=>void; stop:()=>void} | null>(null);
  const callConnectedAtRef = useRef<number | null>(null);

  // ===== RINGTONE — дуудлага ирэхэд дугарах =====
  useEffect(() => {
    if (pendingCall && !incomingCall) {
      const rt = createRingtone();
      ringtoneRef.current = rt;
      rt.start();
      return () => { rt.stop(); ringtoneRef.current = null; };
    }
  }, [pendingCall, incomingCall]);

  const userId = auth.user?._id ?? null;

  useEffect(() => {
    if (!auth.isAuthenticated || !userId) return;

    if (pusherRef.current) {
      pusherRef.current.disconnect();
      pusherRef.current = null;
    }

    console.log("Pusher бүртгээлэх ID:", userId);
    
    // Add authEndpoint to support private channels
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY as string, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER as string,
      authEndpoint: `${API_URL}/pusher/auth`,
      auth: {
        params: { user_id: userId }
      }
    });
    
    pusherRef.current = pusher;
    
    // Subscribe to private channel
    const channel = pusher.subscribe(`private-user-${userId}`);

    channel.bind('incoming-call', (data: any) => {
      if (!data.id || processedCallIds.current.has(data.id)) return;
      processedCallIds.current.add(data.id);
      pendingTracksRef.current = null;
      setPendingCall(data);
    });

    channel.bind('call-ended', () => {
      console.log('[Pusher] call-ended received');
      ringtoneRef.current?.stop();
      callsRef.current?.close();
      callsRef.current = null;
      pendingTracksRef.current = null;
      setReceiverLocalStream(null);
      setReceiverRemoteStream(null);
      setIncomingCall(null);
      setPendingCall(null);
      const callerEnd = (window as any).__callerEndCall as (() => void) | undefined;
      if (callerEnd) callerEnd();
    });

    channel.bind('call-accepted', () => {
      console.log('[Pusher] call-accepted received');
      const updater = (window as any).__callerSetConnected as (() => void) | undefined;
      if (updater) updater();
    });

    channel.bind('call-tracks', async (data: any) => {
      console.log('[call-tracks] received:', { trackIds: data.trackIds, senderSessionId: data.senderSessionId });
      const callerCalls = (window as any).__callerCallsRef as import('../services/cloudflareCalls').CloudflareCalls | undefined;
      if (callerCalls?.sessionId) {
        try {
          if (data.trackIds && data.trackIds.length > 0) {
            console.log('[call-tracks] caller pulling receiver tracks...');
            const ok = await callerCalls.pullTracksRetry(callerCalls.sessionId, data.senderSessionId, data.trackIds, 4);
            console.log('[call-tracks] caller pullTracks:', ok ? 'OK' : 'FAILED');
          } else {
            console.log('[call-tracks] receiver trackIds хоосон');
          }
        } catch (err) {
          console.error('Caller pullTracks алдаа:', err);
        }
        return;
      }
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
    
    // NEW: Handle Real-time notifications and messages
    channel.bind('notification', (data: any) => {
      console.log('[Pusher] notification received', data);
      document.dispatchEvent(new CustomEvent('new-notification', { detail: data }));
    });
    
    channel.bind('chat-message', (data: any) => {
      console.log('[Pusher] chat-message received', data);
      document.dispatchEvent(new CustomEvent('new-chat-message', { detail: data }));
    });

    return () => {
      pusher.unsubscribe(`private-user-${userId}`);
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, [auth.isAuthenticated, userId]);

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

  const acceptCall = async () => {
    if (!pendingCall || !auth.user) return;
    if (callsRef.current) return; 
    const data = pendingCall;
    setPendingCall(null);

    setIncomingCall(data);

    try {
      const calls = new CloudflareCalls();
      callsRef.current = calls;
      await calls.refreshIceServers(); 

      const isVideo = data.type === 'video_call';

      fetch(`${API_URL}/messages/call/accepted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerId: data.senderId }),
      }).catch(() => {});

      console.log('[acceptCall] Acquiring media before answering...');
      try {
        const stream = await calls.startLocalStream(isVideo);
        if (!stream) {
          throw new Error('Failed to acquire media - cannot answer call');
        }
        
        if (!isVideo && stream) {
          stream.getVideoTracks().forEach(t => { 
            console.log(`[acceptCall] Disabling video track for voice call: ${t.id}`);
            t.enabled = false; 
          });
        }
        
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
        
        setReceiverLocalStream(stream);
      } catch (mediaErr: any) {
        console.error('[acceptCall] Media acquisition failed:', mediaErr);
        showSnackbar('Unable to access camera/microphone. Call will continue without your video/audio.', 'warning');
      }

      const remoteStream = new MediaStream();
      calls.pc.ontrack = (event) => {
        console.log('[ontrack receiver] track:', event.track.kind, event.track.readyState, event.track.id);
        remoteStream.addTrack(event.track);
        setReceiverRemoteStream(remoteStream);
      };

      console.log('[acceptCall] Adding local stream to peer connection...');
      if (calls.localStream) {
        calls.addLocalStreamToConnection();
      }

      const { sessionId: mySessionId, trackIds: myTrackIds } = await calls.startSession();
      console.log('[acceptCall] session created:', mySessionId, 'trackIds:', myTrackIds);

      await fetch(`${API_URL}/messages/call/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: data.senderId,
          senderSessionId: mySessionId,
          trackIds: myTrackIds,
        }),
      });

      const pending = pendingTracksRef.current;
      pendingTracksRef.current = null;
      if (pending && pending.trackIds.length > 0) {
        console.log('[acceptCall] pulling caller tracks:', pending.trackIds);
        const ok = await calls.pullTracksRetry(mySessionId, pending.senderSessionId, pending.trackIds, 3);
        console.log('[acceptCall] pullTracks result:', ok, 'remote tracks:', remoteStream.getTracks().map(t => `${t.kind}:${t.readyState}`));
      } else {
        console.log('[acceptCall] caller tracks ирээгүй, pendingTracksRef-д хадгалагдана');
      }

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

  return (
    <CallContext.Provider value={{
      incomingCall, pendingCall, receiverLocalStream, receiverRemoteStream, acceptCall, endCall, callsRef
    }}>
      {children}

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
    </CallContext.Provider>
  );
};
