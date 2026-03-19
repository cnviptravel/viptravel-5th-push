-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  birth_date TEXT,
  referral_source TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'traveler', -- 'traveler', 'guide', 'provider'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at INTEGER,
  isPhoneVerified INTEGER DEFAULT 0,
  isEmailVerified INTEGER DEFAULT 0,
  isVerified INTEGER DEFAULT 0, -- 1 if either email OR phone verified
  isAdmin INTEGER DEFAULT 0, -- 1 if user is admin
  profilePic TEXT,
  bio TEXT,
  nationality TEXT,
  experience TEXT,
  serviceDescription TEXT,
  visitedPlaces TEXT DEFAULT '[]', -- JSON array
  languages TEXT DEFAULT '[]', -- JSON array
  guidingLocations TEXT DEFAULT '[]', -- JSON array
  verificationData TEXT, -- JSON object
  examResults TEXT DEFAULT '[]', -- JSON array
  coverPhoto TEXT,
  travelPhotos TEXT DEFAULT '[]', -- JSON array of URLs
  blockedUsers TEXT DEFAULT '[]', -- JSON array of user IDs
  savedPostIds TEXT DEFAULT '[]' -- JSON array of post IDs
);

-- Telegram Verifications table
CREATE TABLE IF NOT EXISTS telegram_verifications (
  code TEXT PRIMARY KEY,
  userId TEXT, 
  phone TEXT,
  verified INTEGER DEFAULT 0,
  chatId TEXT,
  otpCode TEXT, -- The 6-digit code sent to user
  createdAt INTEGER
);

-- Email Verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
  email TEXT PRIMARY KEY,
  code TEXT,
  createdAt INTEGER
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  userName TEXT,
  userPic TEXT,
  userRole TEXT,
  text TEXT,
  image TEXT,
  video TEXT,
  type TEXT DEFAULT 'regular', -- 'regular', 'service'
  serviceTitle TEXT,
  price REAL,
  capacity INTEGER,
  created_at INTEGER,
  likes TEXT DEFAULT '[]', -- JSON array of user IDs
  comments TEXT DEFAULT '[]' -- JSON array of comment objects
);

-- Messages table (already existed but ensuring full schema)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  senderId TEXT NOT NULL,
  receiverId TEXT NOT NULL,
  text TEXT,
  media TEXT,
  mediaType TEXT, -- 'image', 'video', 'voice', 'file', 'call_log'
  fileName TEXT,
  createdAt INTEGER,
  read INTEGER DEFAULT 0
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  providerId TEXT NOT NULL,
  providerName TEXT,
  customerId TEXT NOT NULL,
  serviceTitle TEXT,
  postId TEXT,
  date TEXT,
  guests INTEGER,
  totalPrice REAL,
  status TEXT DEFAULT 'confirmed',
  paymentMethod TEXT,
  createdAt INTEGER
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  providerId TEXT NOT NULL,
  reviewerId TEXT NOT NULL,
  reviewerName TEXT,
  reviewerPic TEXT,
  rating INTEGER,
  comment TEXT,
  createdAt INTEGER
);

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
  followerId TEXT NOT NULL,
  followingId TEXT NOT NULL,
  created_at INTEGER,
  PRIMARY KEY (followerId, followingId)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipientId TEXT NOT NULL,
  senderId TEXT,
  senderName TEXT,
  type TEXT, -- 'like', 'comment', 'follow', 'review', 'admin_status', etc.
  postId TEXT,
  read INTEGER DEFAULT 0,
  createdAt INTEGER
);

-- AppConfig table
CREATE TABLE IF NOT EXISTS AppConfig (
  id INTEGER PRIMARY KEY,
  appName TEXT,
  logoUrl TEXT,
  loginLogoUrl TEXT,
  loginNameImageUrl TEXT,
  appNameImageUrl TEXT
);

-- Chat Settings table
CREATE TABLE IF NOT EXISTS chat_settings (
  u1 TEXT NOT NULL,
  u2 TEXT NOT NULL,
  settings TEXT, -- JSON object { wallpaper, font, muted }
  PRIMARY KEY (u1, u2)
);
