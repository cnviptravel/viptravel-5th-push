export enum UserRole {
  Traveler = 'traveler',
  Guide = 'guide',
  Provider = 'provider',
  Admin = 'admin'
}

export type ProviderCategory = 'tour_agency' | 'resort' | 'rental' | 'restaurant' | 'transport' | 'other';

export interface UserPrivacy {
  showEmail: boolean;
  showPhone: boolean;
  showOnlineStatus: boolean;
  showHobbies?: boolean;
}

export interface ChatSettings {
  wallpaper: string;
  font: string;
  muted: boolean;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPic: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  providerId: string;
  providerName: string;
  customerId: string;
  serviceTitle?: string;
  postId?: string;
  date: string;
  guests: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentMethod: 'qpay' | 'socialpay' | 'card';
  createdAt: string;
}

export interface VerificationData {
  documentType: string;
  documentImage?: string;
  certificateImage?: string;
  additionalInfo?: string;
  submittedAt?: string;
}

export interface ExamResult {
  language: string;
  score: number;
  maxScore: number;
  date: string;
  status: 'passed' | 'failed';
}

export interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  media?: string;
  mediaType?: 'image' | 'video';
}

export interface User {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  referralSource?: string;
  email: string;
  password?: string;
  role: UserRole;
  phone?: string;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  isVerified?: boolean; // true if either email OR phone verified
  isAdmin?: boolean;
  profilePic?: string;
  bio?: string;
  nationality?: string;
  location?: { lat: number, lng: number, address: string };
  
  experience?: string;
  visitedPlaces?: string[];
  languages?: string[];
  guidingLocations?: string[];
  examResults?: ExamResult[];
  
  providerCategory?: ProviderCategory;
  serviceDescription?: string;
  website?: string;
  operatingHours?: string;
  amenities?: string[];
  pricePerDay?: number;
  services?: Service[];
  travelPhotos?: string[];
  coverPhoto?: string;

  reviews?: Review[];
  averageRating?: number;

  privacy: UserPrivacy;
  blockedUsers: string[];
  savedPostIds: string[];
  
  // --- ШИНЭЭР НЭМСЭН ТАЛБАРУУД (Follow System) ---
  followers?: string[]; // Намайг дагаж буй хүмүүс
  following?: string[]; // Миний дагаж буй хүмүүс
  // ----------------------------------------------

  status?: 'pending' | 'approved' | 'rejected';
  verificationData?: VerificationData;
  createdAt?: string;
  isOnline?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Post {
  _id: string;
  userId: string;
  userName: string;
  userPic: string;
  userRole: UserRole;
  userPhone?: string;
  text: string;
  image?: string;
  video?: string;
  likes: string[];
  comments: Comment[];
  
  // --- ШИНЭЧИЛСЭН ТАЛБАРУУД ---
  // 'travel' төрлийг нэмсэн (Аялагчийн тэмдэглэлд зориулж)
  type: 'regular' | 'service' | 'travel'; 
  
  linkUrl?: string;
  createdAt: string;

  // Үйлчилгээний пост-д зориулсан шинэ талбарууд:
  serviceTitle?: string; // Үйлчилгээний нэр
  price?: number;        // Үнэ
  capacity?: number;     // Хүний тоо
  rating?: number;       // Постын үнэлгээ
  bookingCount?: number; // Нийт захиалгын тоо
  // -----------------------------
}

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  // Энд 'video_call' болон 'voice_call' нэмсэн байгааг анзаараарай 👇
  type: 'like' | 'comment' | 'booking' | 'follow' | 'video_call' | 'voice_call' | 'review' | 'approved' | 'rejected'; 
  postId?: string;
  read: boolean;
  createdAt: string;
}

export interface MessageReaction {
  userId: string;
  reaction: string; // 'like', 'love', 'haha', 'wow', 'sad', 'angry'
  createdAt: string;
}

export interface MessageReply {
  messageId: string;
  senderId: string;
  text: string;
  media?: string;
  mediaType?: 'image' | 'video' | 'voice' | 'file';
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  media?: string;
  mediaType?: 'image' | 'video' | 'voice' | 'file' | 'call_missed' | 'call_ended' | 'call_log';
  fileName?: string;
  createdAt: string;
  read: boolean;
  readAt?: string;
  reactions?: MessageReaction[];
  replyTo?: MessageReply;
  forwardedFrom?: string; // userId who forwarded this message
}

export interface ChatPreview {
  userId: string;
  userName: string;
  userPic: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}