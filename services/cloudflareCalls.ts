const API_URL = "https://viptravel-backend.erdneebatulzii23.workers.dev";

export class CloudflareCalls {
  pc: RTCPeerConnection;
  localStream: MediaStream | null = null;
  sessionId: string | null = null;
  private iceRestartTimer: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor(options?: { forceRelay?: boolean; connectionTimeoutMs?: number }) {
    // Fallback ICE servers (used if refreshIceServers() fails)
    const iceServers = [
      { urls: "stun:stun.metered.ca:80" },
      {
        urls: "turn:stun.metered.ca:80",
        username: "3aa97fb03344582aaa3ea7bb",
        credential: "U8lmuJxBALafv09u"
      },
      {
        urls: "turn:stun.metered.ca:80?transport=tcp",
        username: "3aa97fb03344582aaa3ea7bb",
        credential: "U8lmuJxBALafv09u"
      },
      {
        urls: "turns:stun.metered.ca:443?transport=tcp",
        username: "3aa97fb03344582aaa3ea7bb",
        credential: "U8lmuJxBALafv09u"
      }
    ];

    this.pc = new RTCPeerConnection({
      iceServers,
      // Use 'relay' only when explicitly forced for China firewall testing
      // Otherwise use 'all' to try P2P first, then relay
      iceTransportPolicy: options?.forceRelay ? 'relay' : 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });
    
    this.setupHandlers();
  }

  private setupHandlers() {
    // Enhanced ICE candidate handling for robust connection
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] ICE candidate generated:', {
          candidate: event.candidate.candidate.substring(0, 100),
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          type: event.candidate.type
        });
      } else {
        console.log('[WebRTC] ICE gathering complete - all candidates collected');
      }
    };
    
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState;
      console.log('[WebRTC] ICE connection state changed:', state);
      
      if (state === 'checking') {
        console.log('[WebRTC] ICE checking - establishing connection...');
        // Start ICE restart timer if not connected within 5 seconds
        this.startIceRestartTimer();
      } else if (state === 'connected' || state === 'completed') {
        console.log('[WebRTC] ICE connection established successfully!');
        this.clearIceRestartTimer();
        this.clearConnectionTimeout();
      } else if (state === 'failed') {
        console.error('[WebRTC] ICE connection failed - attempting recovery...');
        this.clearIceRestartTimer();
        this.attemptIceRestart();
      } else if (state === 'disconnected') {
        console.warn('[WebRTC] ICE disconnected - network issues detected');
      } else if (state === 'closed') {
        console.log('[WebRTC] ICE connection closed');
        this.clearIceRestartTimer();
        this.clearConnectionTimeout();
      }
    };
    
    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      console.log('[WebRTC] Connection state changed:', state);
      
      if (state === 'connected') {
        console.log('[WebRTC] Peer connection fully connected!');
        this.clearConnectionTimeout();
      } else if (state === 'failed') {
        console.error('[WebRTC] Peer connection failed');
      } else if (state === 'disconnected') {
        console.warn('[WebRTC] Peer connection disconnected');
      }
    };
    
    this.pc.onsignalingstatechange = () => {
      console.log('[WebRTC] Signaling state:', this.pc.signalingState);
    };
    
    // Handle incoming ICE candidates from remote peer
    this.pc.onicecandidateerror = (event) => {
      console.warn('[WebRTC] ICE candidate error:', event);
    };
  }

  async refreshIceServers(): Promise<void> {
    try {
      // API key backend-д нуугдсан — frontend шууд metered.ca-д хандахгүй
      const res = await fetch(`${API_URL}/calls/turn-credentials`);
      if (!res.ok) {
        console.warn('[CloudflareCalls] TURN credentials fetch failed:', res.status);
        return;
      }
      const data = await res.json() as any;
      if (!data.iceServers || !Array.isArray(data.iceServers)) return;

      console.log('[CloudflareCalls] Received ICE servers:', data.iceServers.length, 'entries');

      // Шинэ credentials-тэй PeerConnection дахин үүсгэх
      const oldOnTrack = this.pc.ontrack;
      this.pc.close();
      this.pc = new RTCPeerConnection({
        iceServers: data.iceServers,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      this.pc.ontrack = oldOnTrack;
      this.setupHandlers();

      console.log('[CloudflareCalls] ICE servers refreshed successfully');
    } catch (err) {
      console.warn('[CloudflareCalls] refreshIceServers failed, using fallback:', err);
    }
  }

  private startIceRestartTimer() {
    this.clearIceRestartTimer();
    this.iceRestartTimer = setTimeout(() => {
      console.log('[WebRTC] ICE restart timer triggered - attempting ICE restart');
      this.attemptIceRestart();
    }, 5000); // 5 seconds
  }

  private clearIceRestartTimer() {
    if (this.iceRestartTimer) {
      clearTimeout(this.iceRestartTimer);
      this.iceRestartTimer = null;
    }
  }

  private clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private async attemptIceRestart() {
    try {
      console.log('[WebRTC] Attempting ICE restart...');
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      
      // Send the new offer to signaling server
      if (this.sessionId) {
        const res = await fetch(`${API_URL}/calls/${this.sessionId}/renegotiate`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            sessionDescription: { 
              type: "offer", 
              sdp: offer.sdp 
            } 
          })
        });
        console.log('[WebRTC] ICE restart offer sent:', res.ok);
      }
    } catch (err) {
      console.error('[WebRTC] ICE restart failed:', err);
    }
  }

  async startLocalStream(video: boolean = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('[startLocalStream] Got media stream with tracks:', 
        this.localStream.getTracks().map(t => `${t.kind}:${t.id}:${t.enabled ? 'enabled' : 'disabled'}:${t.readyState}`));
    } catch (err) {
      console.warn('[startLocalStream] Failed to get video+audio, trying audio only:', err);
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        console.log('[startLocalStream] Got audio-only stream with tracks:', 
          this.localStream.getTracks().map(t => `${t.kind}:${t.id}:${t.enabled ? 'enabled' : 'disabled'}:${t.readyState}`));
      } catch (audioErr) {
        console.error('[startLocalStream] Failed to get any media:', audioErr);
        this.localStream = null;
        throw audioErr;
      }
    }
    if (!video && this.localStream) {
      this.localStream.getVideoTracks().forEach(t => { t.enabled = false; });
    }
    return this.localStream;
  }
  
  // Explicitly add local stream tracks to peer connection
  addLocalStreamToConnection() {
    if (!this.localStream) {
      console.warn('[addLocalStreamToConnection] No local stream available');
      return false;
    }
    
    const tracks = this.localStream.getTracks();
    console.log('[addLocalStreamToConnection] Adding', tracks.length, 'tracks to peer connection');
    
    tracks.forEach(track => {
      // Check if track is already added
      const existingSender = this.pc.getSenders().find(s => s.track === track);
      if (!existingSender) {
        console.log(`[addLocalStreamToConnection] Adding ${track.kind} track: ${track.id}`);
        this.pc.addTrack(track, this.localStream!);
      } else {
        console.log(`[addLocalStreamToConnection] ${track.kind} track already added: ${track.id}`);
      }
    });
    
    return true;
  }
  
  // Add ICE candidate from remote peer
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      console.log('[addIceCandidate] Adding ICE candidate:', candidate.candidate?.substring(0, 80));
      await this.pc.addIceCandidate(candidate);
    } catch (err) {
      console.error('[addIceCandidate] Failed to add ICE candidate:', err);
      throw err;
    }
  }

  // ICE холболт бүрэн болтол хүлээх (with increased timeout for China connections)
  async waitForConnection(timeoutMs = 30000): Promise<boolean> {
    const s = this.pc.iceConnectionState;
    if (s === 'connected' || s === 'completed') return true;
    
    return new Promise((resolve) => {
      this.clearConnectionTimeout();
      this.connectionTimeout = setTimeout(() => {
        this.pc.removeEventListener('iceconnectionstatechange', handler);
        resolve(this.pc.iceConnectionState === 'connected' || this.pc.iceConnectionState === 'completed');
      }, timeoutMs);
      
      const handler = () => {
        const st = this.pc.iceConnectionState;
        if (st === 'connected' || st === 'completed') {
          this.clearConnectionTimeout();
          this.pc.removeEventListener('iceconnectionstatechange', handler);
          resolve(true);
        } else if (st === 'failed' || st === 'closed') {
          this.clearConnectionTimeout();
          this.pc.removeEventListener('iceconnectionstatechange', handler);
          resolve(false);
        }
      };
      this.pc.addEventListener('iceconnectionstatechange', handler);
    });
  }

  // ==========================================
  // 2-STEP SESSION: 1) sessions/new  2) tracks/new
  // ==========================================
  async startSession(): Promise<{ sessionId: string; trackIds: string[] }> {
    // 1. Ensure local stream tracks are added to peer connection
    if (this.localStream) {
      console.log('[startSession] Adding local stream tracks to peer connection');
      this.addLocalStreamToConnection();
    } else {
      console.log('[startSession] No local stream, adding recvonly transceivers');
      this.pc.addTransceiver('audio', { direction: 'recvonly' });
      this.pc.addTransceiver('video', { direction: 'recvonly' });
    }

    // 2. SDP offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Track мэдээлэл цуглуулах (mids assigned after setLocalDescription)
    const localTracks: Array<{mid: string; trackName: string}> = [];
    this.pc.getTransceivers().forEach(t => {
      if (t.sender.track && t.mid) {
        localTracks.push({ mid: t.mid, trackName: t.sender.track.id });
      }
    });
    console.log('[startSession] localTracks:', localTracks);

    // 3. STEP 1: Session үүсгэх (tracks ХАМААГҮЙ!)
    if ((this.pc.signalingState as string) === 'closed') throw new Error('PC closed before session');
    const res1 = await fetch(`${API_URL}/calls/sessions/new`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionDescription: { type: "offer", sdp: offer.sdp }
      })
    });
    const data1 = await res1.json() as any;
    console.log('[startSession] session response:', res1.ok, Object.keys(data1));
    if (!data1.sessionId || !data1.sessionDescription?.sdp) {
      throw new Error('Session үүсгэл: ' + JSON.stringify(data1).substring(0, 300));
    }

    this.sessionId = data1.sessionId;
    if ((this.pc.signalingState as string) === 'closed') throw new Error('PC closed during session');
    await this.pc.setRemoteDescription(new RTCSessionDescription({
      type: (data1.sessionDescription.type || 'answer') as RTCSdpType,
      sdp: data1.sessionDescription.sdp
    }));
    console.log('[startSession] sessionId:', this.sessionId);

    // 4. STEP 2: Track-уудыг ТУСАД НЬ бүртгэх (tracks/new)
    let trackIds: string[] = [];
    if (localTracks.length > 0) {
      const res2 = await fetch(`${API_URL}/calls/${this.sessionId}/tracks/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracks: localTracks.map(t => ({
            location: "local",
            mid: t.mid,
            trackName: t.trackName
          }))
        })
      });
      const data2 = await res2.json() as any;
      console.log('[startSession] tracks/new response:', res2.ok, JSON.stringify(data2).substring(0, 500));

      // Handle renegotiation if needed
      if (data2.requiresImmediateRenegotiation && data2.sessionDescription?.sdp) {
        console.log('[startSession] renegotiating after track push...');
        await this.pc.setRemoteDescription(new RTCSessionDescription({
          type: (data2.sessionDescription.type || 'offer') as RTCSdpType,
          sdp: data2.sessionDescription.sdp
        }));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        const rRes = await fetch(`${API_URL}/calls/${this.sessionId}/renegotiate`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionDescription: { type: "answer", sdp: answer.sdp } })
        });
        console.log('[startSession] renegotiate:', rRes.ok);
      }

      // TrackNames Cloudflare response-с авах
      if (data2.tracks && Array.isArray(data2.tracks)) {
        trackIds = data2.tracks
          .filter((t: any) => t.trackName && !t.errorCode)
          .map((t: any) => t.trackName);
        console.log('[startSession] confirmed tracks:', trackIds);
        const errors = data2.tracks.filter((t: any) => t.errorCode);
        if (errors.length) console.warn('[startSession] track errors:', errors);
      }
    }

    // Fallback
    if (trackIds.length === 0) {
      trackIds = localTracks.map(t => t.trackName);
      console.log('[startSession] fallback trackNames:', trackIds);
    }

    return { sessionId: this.sessionId, trackIds };
  }

  // Нөгөө хүний track-уудыг татах
  async pullTracks(mySessionId: string, partnerSessionId: string, partnerTrackIds: string[]): Promise<{ success: boolean }> {
    console.log('[pullTracks]', { mySessionId: mySessionId.substring(0,8), partnerSession: partnerSessionId.substring(0,8), tracks: partnerTrackIds.length });
    const res = await fetch(`${API_URL}/calls/${mySessionId}/tracks/new`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tracks: partnerTrackIds.map(trackName => ({
          location: "remote",
          sessionId: partnerSessionId,
          trackName
        }))
      })
    });

    const data = await res.json() as any;

    if (!res.ok) {
      console.error(`[pullTracks] HTTP ${res.status}:`, JSON.stringify(data).substring(0, 300));
      return { success: false };
    }

    // Track алдаа шалгах
    if (data.tracks && Array.isArray(data.tracks)) {
      const errors = data.tracks.filter((t: any) => t.errorCode);
      if (errors.length > 0) {
        console.warn('[pullTracks] errors:', errors.map((e: any) => `${e.trackName?.substring(0,8)}:${e.errorCode}`));
        if (errors.length === data.tracks.length) return { success: false };
      }
    }

    // Handle renegotiation if needed
    if (data.requiresImmediateRenegotiation && data.sessionDescription?.sdp) {
      console.log('[pullTracks] renegotiating after track pull...');
      await this.pc.setRemoteDescription(new RTCSessionDescription({
        type: (data.sessionDescription.type || 'offer') as RTCSdpType,
        sdp: data.sessionDescription.sdp
      }));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      const rRes = await fetch(`${API_URL}/calls/${mySessionId}/renegotiate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionDescription: { type: "answer", sdp: answer.sdp } })
      });
      console.log('[pullTracks] renegotiate:', rRes.ok);
    }

    return { success: true };
  }

  // Нөгөө хүний track-уудыг дахин оролдлого хийж татах
  async pullTracksRetry(mySessionId: string, partnerSessionId: string, partnerTrackIds: string[], maxRetries: number = 3): Promise<boolean> {
    console.log('[pullTracksRetry] Starting with maxRetries:', maxRetries);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[pullTracksRetry] Attempt ${attempt}/${maxRetries}`);
        const result = await this.pullTracks(mySessionId, partnerSessionId, partnerTrackIds);
        
        if (result.success) {
          console.log(`[pullTracksRetry] Success on attempt ${attempt}`);
          return true;
        }
        
        console.warn(`[pullTracksRetry] Attempt ${attempt} failed, will retry in ${attempt * 1000}ms`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      } catch (error) {
        console.error(`[pullTracksRetry] Attempt ${attempt} error:`, error);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }
    
    console.error(`[pullTracksRetry] All ${maxRetries} attempts failed`);
    return false;
  }

  // Close the peer connection
  close() {
    console.log('[close] Closing peer connection');
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.clearIceRestartTimer();
    this.clearConnectionTimeout();
    this.pc.close();
    this.sessionId = null;
  }

  // Get remote stream from peer connection
  getRemoteStream(): MediaStream | null {
    const remoteStream = new MediaStream();
    this.pc.getReceivers().forEach(receiver => {
      if (receiver.track) {
        remoteStream.addTrack(receiver.track);
      }
    });
    return remoteStream.getTracks().length > 0 ? remoteStream : null;
  }

  // Check if connection is established
  isConnected(): boolean {
    const state = this.pc.iceConnectionState;
    return state === 'connected' || state === 'completed';
  }

  // Get connection statistics
  async getStats(): Promise<RTCStatsReport | null> {
    try {
      return await this.pc.getStats();
    } catch (err) {
      console.error('[getStats] Failed to get stats:', err);
      return null;
    }
  }
}