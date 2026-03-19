import { User, Post, UserRole, Notification, Message, ChatPreview, Booking, Review, ChatSettings } from '../types';
import { GoogleGenAI } from "@google/genai";
import Pusher from 'pusher-js';
import { auth as firebaseAuth } from './firebase';
import { 
    createUserWithEmailAndPassword, 
    sendEmailVerification, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    User as FirebaseUser
} from 'firebase/auth';

// ------------------------------------------------------------------
// BACKEND URL (Cloudflare Worker)
// ------------------------------------------------------------------
const API_URL = "https://viptravel-backend.erdneebatulzii23.workers.dev";
const PUSHER_KEY = "37cb2c72dc3de4f325bb"; 

const STORAGE_KEYS = {
  USERS: 'cj_travel_users',
  POSTS: 'cj_travel_posts',
  CURRENT_USER: 'cj_travel_current_user',
  NOTIFICATIONS: 'cj_travel_notifications',
  MESSAGES: 'cj_travel_messages',
  BOOKINGS: 'cj_travel_bookings',
  CHAT_SETTINGS: 'cj_travel_chat_settings'
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Text translation using Cloudflare M2M100
export const apiTranslate = async (
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> => {
  const res = await fetch(`${API_URL}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, sourceLang, targetLang }),
  });
  const data = await res.json() as any;
  return data.translatedText || '';
};

// Audio translation using Cloudflare Whisper + M2M100
export const apiTranslateAudio = async (
  audioBlob: Blob,
  sourceLang: string,
  targetLang: string
): Promise<{ original: string; translated: string }> => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  formData.append('sourceLang', sourceLang);
  formData.append('targetLang', targetLang);

  const res = await fetch(`${API_URL}/translate-audio`, {
    method: 'POST',
    body: formData,
  });
  
  if (!res.ok) {
    const error = await res.json() as any;
    throw new Error(error.error || "Translation failed");
  }
  
  const data = await res.json() as any;
  return {
    original: data.original || '',
    translated: data.translated || '',
  };
};

// ==================================================================
// 1. MEDIA UPLOAD (Backend R2 руу)
// ==================================================================
export const apiUploadMedia = async (file: File): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${API_URL}/upload`, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) throw new Error("Upload failed");
        const text = await response.text();
        let data: any = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            throw new Error("Invalid server response");
        }
        return `${API_URL}/image/${data.filename}`;
    } catch (error) {
        console.error("Upload Error:", error);
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => resolve(e.target?.result as string);
        });
    }
};

export const compressMedia = async (file: File): Promise<string> => {
    return await apiUploadMedia(file);
};

// ==================================================================
// 2. REGISTER & LOGIN
// ==================================================================

export const apiRegister = async (userData: any): Promise<User> => {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                full_name: userData.full_name,
                first_name: userData.first_name,
                last_name: userData.last_name,
                birth_date: userData.birth_date,
                referral_source: userData.referral_source,
                email: userData.email,
                phone: userData.phone,
                password: userData.password,
                role: userData.role || UserRole.Traveler,
                isEmailVerified: userData.isEmailVerified || false,
                isPhoneVerified: userData.isPhoneVerified || false
            }),
        });
        const responseText = await response.text();
        console.log("REGISTER RESPONSE TEXT:", responseText);
        if (!responseText) throw new Error("Server returned empty response");
        let data: any = {};
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            throw new Error("Invalid server response");
        }
        if (!response.ok || data.error) {
            console.error("REGISTER ERROR DETAILS:", data.details, data.error);
            throw new Error(data.details || data.error || 'Registration failed');
        }
        
        // Backend now returns full user object directly
        const user = parseUserData({
            ...data,
            created_at: data.createdAt || data.created_at || new Date().toISOString(),
            isOnline: true
        });
        
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        return user;
    } catch (error) {
        console.error("API Register Error:", error);
        throw error;
    }
};

export const apiLogin = async (email: string, password: string): Promise<User> => {
    // ===== DEMO ACCOUNT — ямар ч нөхцөлд нэвтрэх =====
    if (email === 'admin1@viptravel.com' && password === '1234') {
        const demoUser: User = {
            _id: 'demo-admin-001',
            name: 'Demo Admin',
            firstName: 'Demo',
            lastName: 'Admin',
            email: 'admin1@viptravel.com',
            role: UserRole.Admin,
            isAdmin: true,
            isVerified: true,
            isEmailVerified: true,
            isPhoneVerified: false,
            profilePic: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
            bio: 'Demo Admin Account',
            privacy: { showEmail: false, showPhone: false, showOnlineStatus: true },
            blockedUsers: [],
            savedPostIds: [],
            followers: [],
            following: [],
            travelPhotos: [],
            status: 'approved',
            isOnline: true,
            createdAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(demoUser));
        return demoUser;
    }
    
    if (email === 'travel@viptravel.com' && password === '1234') {
        const demoUser: User = {
            _id: 'demo-travel-001',
            name: 'Demo Traveler',
            firstName: 'Demo',
            lastName: 'Traveler',
            email: 'travel@viptravel.com',
            role: UserRole.Traveler,
            isAdmin: false,
            isVerified: true,
            isEmailVerified: true,
            isPhoneVerified: true,
            profilePic: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
            bio: 'Demo Traveler Account',
            privacy: { showEmail: false, showPhone: false, showOnlineStatus: true },
            blockedUsers: [],
            savedPostIds: [],
            followers: [],
            following: [],
            travelPhotos: [],
            status: 'approved',
            isOnline: true,
            createdAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(demoUser));
        return demoUser;
    }

    if (email === 'guide@viptravel.com' && password === '1234') {
        const demoUser: User = {
            _id: 'demo-guide-001',
            name: 'Demo Guide',
            firstName: 'Demo',
            lastName: 'Guide',
            email: 'guide@viptravel.com',
            role: UserRole.Guide,
            isAdmin: false,
            isVerified: true,
            isEmailVerified: true,
            isPhoneVerified: true,
            profilePic: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
            bio: 'Demo Guide Account',
            privacy: { showEmail: false, showPhone: false, showOnlineStatus: true },
            blockedUsers: [],
            savedPostIds: [],
            followers: [],
            following: [],
            travelPhotos: [],
            status: 'approved',
            isOnline: true,
            createdAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(demoUser));
        return demoUser;
    }

    if (email === 'provider@viptravel.com' && password === '1234') {
        const demoUser: User = {
            _id: 'demo-provider-001',
            name: 'Demo Provider',
            firstName: 'Demo',
            lastName: 'Provider',
            email: 'provider@viptravel.com',
            role: UserRole.Provider,
            isAdmin: false,
            isVerified: true,
            isEmailVerified: true,
            isPhoneVerified: true,
            profilePic: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
            bio: 'Demo Provider Account',
            privacy: { showEmail: false, showPhone: false, showOnlineStatus: true },
            blockedUsers: [],
            savedPostIds: [],
            followers: [],
            following: [],
            travelPhotos: [],
            status: 'approved',
            isOnline: true,
            createdAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(demoUser));
        return demoUser;
    }
    // ===== DEMO ACCOUNT ТӨГСГӨЛ =====

    try {
        // Try Firebase authentication, but don't block login if Firebase fails
        try {
            await signInWithEmailAndPassword(firebaseAuth, email, password);
        } catch (firebaseError: any) {
            // Firebase-д бүртгэл байхгүй бол шинээр үүсгэх
            if (firebaseError.code === 'auth/user-not-found' || 
                firebaseError.code === 'auth/invalid-credential' ||
                firebaseError.code === 'auth/wrong-password') {
                try {
                    const { createUserWithEmailAndPassword } = await import('firebase/auth');
                    await createUserWithEmailAndPassword(firebaseAuth, email, password);
                    console.log('Firebase user created during login fallback');
                } catch (createError: any) {
                    console.warn('Firebase fallback create failed:', createError.message);
                }
            }
            console.warn('Firebase auth warning:', firebaseError.code);
        }

        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const responseText = await response.text();
        console.log("LOGIN RESPONSE TEXT:", responseText);
        if (!responseText) throw new Error("Server returned empty response");
        let data: any = {};
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            throw new Error("Invalid server response");
        }
        if (!response.ok || data.error) throw new Error(data.error || 'Login failed');

        const user = parseUserData({
            ...data,
            created_at: data.created_at ? new Date(data.created_at).toISOString() : new Date().toISOString(),
            isOnline: true
        });

        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        return user;
    } catch (error) {
        console.error("Login Error:", error);
        throw error;
    }
};

export const apiLogout = async (userId: string): Promise<void> => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

export const apiSendRecoveryEmail = async (email: string): Promise<void> => {
    const response = await fetch(`${API_URL}/auth/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error('Код илгээхэд алдаа гарлаа');
};

export const apiResetPassword = async (email: string, code: string, newPassword: string): Promise<void> => {
    const response = await fetch(`${API_URL}/auth/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
    });
    if (!response.ok) throw new Error('Нууц үг шинэчлэхэд алдаа гарлаа');
};

export const apiSendPhoneOTP = async (phone: string): Promise<void> => {
    await fetch(`${API_URL}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
    });
};

export const apiVerifyPhone = async (userId: string, code: string): Promise<User> => {
    const response = await fetch(`${API_URL}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
    });
    const updatedUser = await response.json() as any;
    const user = { ...updatedUser, _id: String(updatedUser.id), name: updatedUser.full_name };
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user as User;
};

// ==================================================================
// 3. ADMIN MANAGEMENT API
// ==================================================================
export const apiGetAllUsers = async (): Promise<User[]> => {
    const response = await fetch(`${API_URL}/users`);
    const json = await response.json() as any;
    const data = Array.isArray(json) ? json : (json.data || json.results || []);
    return data.map(u => parseUserData(u));
};

export const apiUpdateUserStatus = async (userId: string, status: 'approved' | 'rejected' | 'pending'): Promise<void> => {
    const storedUser = localStorage.getItem('cj_travel_current_user');
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    const adminId = currentUser?._id || '';

    const response = await fetch(`${API_URL}/users/${userId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, userId: adminId }),
    });

    if (!response.ok) {
        throw new Error(`Status update failed: ${response.status}`);
    }
};

// ==================================================================
// 4. PROFILE & PHOTO MANAGEMENT API
// ==================================================================

// Helper to consistently parse raw DB user data into User type
const parseUserData = (data: any): User => {
    const safeParse = (val: any, fallback: any) => {
        if (typeof val === 'string') {
            try {
                return JSON.parse(val || JSON.stringify(fallback));
            } catch {
                return fallback;
            }
        }
        return val || fallback;
    };

    return {
        ...data,
        _id: String(data.id || data._id),
        name: data.full_name || data.name || 'Guest',
        profilePic: data.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
        travelPhotos: safeParse(data.travelPhotos, []),
        savedPostIds: safeParse(data.savedPostIds, []),
        blockedUsers: safeParse(data.blockedUsers, []),
        followers: safeParse(data.followers, []),
        following: safeParse(data.following, []),
        visitedPlaces: safeParse(data.visitedPlaces, []),
        languages: safeParse(data.languages, []),
        examResults: safeParse(data.examResults, []),
        verificationData: safeParse(data.verificationData, undefined),
        // location is stored as JSON string in DB - parse it
        location: safeParse(data.location, undefined),
        status: data.status || 'approved',
        coverPhoto: data.coverPhoto || undefined,
        privacy: data.privacy || { showEmail: false, showPhone: false, showOnlineStatus: true },
    } as User;
};

export const apiUpdateProfile = async (userId: string, updates: Partial<User>): Promise<User> => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
    });
    const data = await response.json() as any;
    const user = parseUserData(data);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
};

export const apiAddTravelPhoto = async (userId: string, photoUrl: string): Promise<User> => {
    const response = await fetch(`${API_URL}/users/${userId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
    });
    const data = await response.json() as any;
    return parseUserData(data);
};

export const apiDeleteTravelPhoto = async (userId: string, photoUrl: string): Promise<User> => {
    const response = await fetch(`${API_URL}/users/${userId}/photos/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
    });
    const data = await response.json() as any;
    return parseUserData(data);
};

export const apiGetUser = async (userId: string): Promise<User | null> => {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`);
        if (!response.ok) return null;
        const data = await response.json() as any;
        return parseUserData(data);
    } catch (error) {
        return null;
    }
};

export const apiGetUsersByRole = async (role: UserRole): Promise<User[]> => {
    const response = await fetch(`${API_URL}/users/role/${role}`);
    const json = await response.json() as any;
    const data = Array.isArray(json) ? json : (json.data || json.results || []);
    return data.map(u => parseUserData(u));
};

// ==================================================================
// 5. BLOCKING SYSTEM API
// ==================================================================
export const apiBlockUser = async (currentUserId: string, targetUserId: string): Promise<User> => {
    const response = await fetch(`${API_URL}/users/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentUserId, targetUserId }),
    });
    const data = await response.json() as any;
    return { ...data, _id: String(data.id), name: data.full_name } as User;
};

export const apiUnblockUser = async (currentUserId: string, targetUserId: string): Promise<User> => {
    const response = await fetch(`${API_URL}/users/unblock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentUserId, targetUserId }),
    });
    const data = await response.json() as any;
    return { ...data, _id: String(data.id), name: data.full_name } as User;
};

// ==================================================================
// 6. CHAT API
// ==================================================================
export const apiSubscribeToMessages = (callback: () => void) => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!storedUser) return () => {};

    const user = JSON.parse(storedUser);
    const pusher = new Pusher(PUSHER_KEY, { cluster: 'ap1' });
    const channel = pusher.subscribe(`user-${user._id}`);

    // Зөвхөн chat-message л сонсоно — incoming-call биш (түүнд App.tsx хандална)
    channel.bind('chat-message', () => callback());
    channel.bind('message-updated', () => callback());

    return () => {
        channel.unbind_all();
        channel.unsubscribe();
        pusher.disconnect();
    };
};

// Facebook Messenger features
export const apiAddMessageReaction = async (messageId: string, userId: string, reaction: string): Promise<Message> => {
    const response = await fetch(`${API_URL}/messages/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, userId, reaction }),
    });
    if (!response.ok) throw new Error("Failed to add reaction");
    return await response.json() as Message;
};

export const apiRemoveMessageReaction = async (messageId: string, userId: string): Promise<Message> => {
    const response = await fetch(`${API_URL}/messages/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, userId, reaction: null }),
    });
    if (!response.ok) throw new Error("Failed to remove reaction");
    return await response.json() as Message;
};

export const apiMarkMessageRead = async (messageId: string): Promise<void> => {
    await fetch(`${API_URL}/messages/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
    });
};

export const apiForwardMessage = async (originalMessageId: string, senderId: string, receiverId: string): Promise<Message> => {
    const response = await fetch(`${API_URL}/messages/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalMessageId, senderId, receiverId }),
    });
    if (!response.ok) throw new Error("Failed to forward message");
    return await response.json() as Message;
};

export const apiSendMessage = async (
    senderId: string, 
    receiverId: string, 
    text?: string, 
    media?: string, 
    mediaType?: 'image' | 'video' | 'voice' | 'file' | 'call_missed' | 'call_ended',
    fileName?: string
): Promise<Message> => {
    const response = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId, receiverId, text, media, mediaType, fileName }),
    });
    if (!response.ok) throw new Error("Failed to send message");
    return await response.json() as Message;
};

export const apiMarkMessagesRead = async (currentUserId: string, senderId: string): Promise<void> => {
    await fetch(`${API_URL}/messages/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentUserId, senderId }),
    });
};

export const apiGetTotalUnreadMessageCount = async (userId: string): Promise<number> => {
    try {
        const response = await fetch(`${API_URL}/messages/unread/count/${userId}`);
        const data = await response.json() as { count: number };
        return data.count || 0;
    } catch { return 0; }
};

export const apiGetMessages = async (userId1: string, userId2: string): Promise<Message[]> => {
    try {
        const response = await fetch(`${API_URL}/messages/${userId1}/${userId2}`);
        if (!response.ok) return [];
        return await response.json() as Message[];
    } catch (error) {
        console.error("apiGetMessages error:", error);
        return [];
    }
};

export const apiGetConversations = async (currentUserId: string): Promise<ChatPreview[]> => {
    try {
        const response = await fetch(`${API_URL}/conversations/${currentUserId}`);
        if (!response.ok) return [];
        return await response.json() as ChatPreview[];
    } catch (error) {
        console.error("apiGetConversations error:", error);
        return [];
    }
};

// ==================================================================
// 7. ДУУДЛАГА API - ЗАСВАРЛАСАН ✅
// ==================================================================

// Дуудлага эхлүүлэх — sessionId авна
export const apiInitiateCall = async (
    senderId: string, 
    receiverId: string, 
    type: 'voice' | 'video', 
    senderName: string
): Promise<{ meetingId: string }> => {
    const response = await fetch(`${API_URL}/messages/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId, receiverId, type, senderName }),
    });
    const data = await response.json() as any;
    if (!response.ok) throw new Error(data.error || "Дуудлага эхлүүлэхэд алдаа гарлаа");
    return { meetingId: data.meetingId };
};

// Track мэдээллийг нөгөө хүнд дамжуулах ✅
export const apiSendCallTracks = async (
    receiverId: string,
    meetingId: string,
    senderSessionId: string,
    trackIds: string[]
): Promise<void> => {
    await fetch(`${API_URL}/messages/call/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, meetingId, senderSessionId, trackIds }),
    });
};

export const apiGetChatSettings = async (currentUserId: string, targetUserId: string): Promise<ChatSettings> => {
    const response = await fetch(`${API_URL}/chat/settings/${currentUserId}/${targetUserId}`);
    if (!response.ok) return { wallpaper: 'bg-slate-50 dark:bg-[#0d141b]', font: 'font-sans', muted: false };
    return await response.json() as ChatSettings;
};

export const apiUpdateChatSettings = async (currentUserId: string, targetUserId: string, settings: ChatSettings) => {
    await fetch(`${API_URL}/chat/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentUserId, targetUserId, settings }),
    });
};

// ==================================================================
// 8. POSTS API
// ==================================================================
export const apiGetPosts = async (): Promise<Post[]> => {
    const response = await fetch(`${API_URL}/posts`);
    const results = await response.json() as any[];

    const postsWithUserPhone = await Promise.all(results.map(async (p) => {
        const user = await apiGetUser(p.userId);
        return {
            ...p,
            _id: p._id || p.id,
            createdAt: p.createdAt || p.created_at,
            likes: typeof p.likes === 'string' ? JSON.parse(p.likes) : (p.likes || []),
            comments: typeof p.comments === 'string' ? JSON.parse(p.comments) : (p.comments || []),
            userPhone: user?.phone,
        };
    }));

    return postsWithUserPhone;
};

export const apiCreatePost = async (postData: Partial<Post>): Promise<Post> => {
    const response = await fetch(`${API_URL}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
    });
    return await response.json() as Post;
};

export const apiToggleSavePost = async (userId: string, postId: string): Promise<User> => {
    const response = await fetch(`${API_URL}/users/${userId}/save-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
    });
    const data = await response.json() as any;
    const user = parseUserData(data);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
};

export const apiLikePost = async (postId: string, userId: string): Promise<void> => {
    await fetch(`${API_URL}/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
    });
};

export const apiDeletePost = async (postId: string): Promise<void> => {
    await fetch(`${API_URL}/posts/${postId}`, { method: "DELETE" });
};

export const apiCommentPost = async (postId: string, userId: string, userName: string, text: string): Promise<void> => {
    await fetch(`${API_URL}/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userName, text }),
    });
};

export const apiGetSavedPosts = async (postIds: string[]): Promise<Post[]> => {
    try {
        const response = await fetch(`${API_URL}/posts/saved`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postIds }),
        });
        if (!response.ok) return [];
        const results = await response.json() as any[];
        return results.map(p => ({
            ...p,
            _id: p._id || p.id,
            createdAt: p.createdAt || p.created_at,
            likes: typeof p.likes === 'string' ? JSON.parse(p.likes) : (p.likes || []),
            comments: typeof p.comments === 'string' ? JSON.parse(p.comments) : (p.comments || [])
        }));
    } catch (error) {
        return [];
    }
};

// ==================================================================
// 9. BOOKINGS, REVIEWS, CONFIG
// ==================================================================
export const apiCreateBooking = async (bookingData: Partial<Booking>): Promise<Booking> => {
    const response = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
    });
    return await response.json() as Booking;
};

export const apiGetBookings = async (userId: string): Promise<Booking[]> => {
    const response = await fetch(`${API_URL}/bookings/${userId}`);
    return await response.json() as Booking[];
};

export const apiAddReview = async (providerId: string, review: Partial<Review>): Promise<void> => {
    await fetch(`${API_URL}/reviews/${providerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review),
    });
};

export const apiGetNotifications = async (userId: string): Promise<Notification[]> => {
    const response = await fetch(`${API_URL}/notifications/${userId}`);
    const data = await response.json() as any[];
    return data.map(n => ({ ...n, read: !!n.read }));
};

export const apiMarkNotificationsRead = async (userId: string): Promise<void> => {
    await fetch(`${API_URL}/notifications/${userId}/read`, { method: "POST" });
};

export const apiGetAppConfig = async () => {
    const response = await fetch(`${API_URL}/config`);
    return await response.json();
};

export const apiUpdateAppConfig = async (newConfig: any) => {
    await fetch(`${API_URL}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
    });
    return newConfig;
};

// ==================================================================
// FIREBASE AUTH HELPERS
// ==================================================================
export const apiFirebaseRegister = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await sendEmailVerification(userCredential.user);
    return userCredential.user;
};

export const apiFirebaseResendVerification = async () => {
    if (firebaseAuth.currentUser) {
        await sendEmailVerification(firebaseAuth.currentUser);
    }
};

export const apiFirebaseCheckVerification = async (): Promise<boolean> => {
    if (firebaseAuth.currentUser) {
        await firebaseAuth.currentUser.reload();
        return firebaseAuth.currentUser.emailVerified;
    }
    return false;
};

// ==================================================================
// OTP VERIFICATION
// ==================================================================
export const apiSendOTP = async (type: 'email' | 'telegram', identifier: string): Promise<any> => {
    const response = await fetch(`${API_URL}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, identifier }),
    });
    if (!response.ok) {
        const err = await response.json() as any;
        throw new Error(err.error || "Failed to send OTP");
    }
    return await response.json();
};

export const apiVerifyOTP = async (type: 'email' | 'telegram', identifier: string, code: string): Promise<boolean> => {
    const response = await fetch(`${API_URL}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, identifier, code }),
    });
    if (!response.ok) return false;
    const data = await response.json() as any;
    return !!data.success;
};

// Deprecated but kept for backward compatibility if needed
export const apiTelegramVerify = async (phone: string): Promise<{ code: string, botUsername: string }> => {
    // We can reuse apiSendOTP for telegram initialization
    const res = await apiSendOTP('telegram', phone);
    return { code: res.sessionCode, botUsername: res.botUsername };
};

export const apiCheckTelegramStatus = async (code: string): Promise<boolean> => {
    const response = await fetch(`${API_URL}/telegram/status/${code}`);
    const data = await response.json() as any;
    return !!data.verified;
};

export const apiGenerateTripPlan = async (destination: string, duration: string, budget: string, language: string): Promise<string> => {
    try {
        const response = await fetch(`${API_URL}/ai/plan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ destination, duration, budget, language }),
        });
        const data = await response.json() as any;
        return data.plan || "Failed to generate plan.";
    } catch (error) {
        console.error("AI Plan Error:", error);
        return "Error generating plan.";
    }
};

export const apiFollowUser = async (currentUserId: string, targetUserId: string) => {
    const response = await fetch(`${API_URL}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentUserId, targetUserId }),
    });
    return await response.json();
};

export const apiUnfollowUser = async (currentUserId: string, targetUserId: string) => {
    const response = await fetch(`${API_URL}/unfollow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentUserId, targetUserId }),
    });
    return await response.json();
};

export const apiGetAllBookings = async (): Promise<Booking[]> => {
    const stored = localStorage.getItem('cj_travel_current_user');
    const u = stored ? JSON.parse(stored) : null;
    const res = await fetch(`${API_URL}/bookings/all?userId=${u?._id || ''}`);
    if (!res.ok) throw new Error('Failed to fetch bookings');
    const data = await res.json() as any;
    return (data.data || data) as Booking[];
};

export const apiGetApiUsage = async (days = 30) => {
    const stored = localStorage.getItem('cj_travel_current_user');
    const u = stored ? JSON.parse(stored) : null;
    const res = await fetch(`${API_URL}/admin/api-usage?days=${days}&userId=${u?._id || ''}`);
    if (!res.ok) throw new Error('Failed');
    return await res.json() as any;
};

export const apiGetApiUsageDetail = async (days = 30, apiName?: string) => {
    const stored = localStorage.getItem('cj_travel_current_user');
    const u = stored ? JSON.parse(stored) : null;
    const p = new URLSearchParams({ days: String(days), userId: u?._id || '' });
    if (apiName) p.set('api', apiName);
    const res = await fetch(`${API_URL}/admin/api-usage/detail?${p}`);
    if (!res.ok) throw new Error('Failed');
    return await res.json() as any;
};

export const apiGetApiUsageByDay = async (days = 30) => {
    const stored = localStorage.getItem('cj_travel_current_user');
    const u = stored ? JSON.parse(stored) : null;
    const res = await fetch(`${API_URL}/admin/api-usage/daily?days=${days}&userId=${u?._id || ''}`);
    if (!res.ok) throw new Error('Failed');
    return await res.json() as any;
};

export const apiDeleteUser = async (userId: string): Promise<void> => {
    const stored = localStorage.getItem('cj_travel_current_user');
    const currentUser = stored ? JSON.parse(stored) : null;
    const adminId = currentUser?._id || '';
    const res = await fetch(`${API_URL}/users/${userId}?userId=${adminId}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
};
