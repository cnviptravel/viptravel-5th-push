-- Migration to add verification columns to users table
-- Run this in your Cloudflare D1 database

-- Add verification columns if they don't exist
-- SQLite doesn't support IF NOT EXISTS in ALTER TABLE, so we'll try to add them
-- If they already exist, the command will fail but that's okay

-- Add isPhoneVerified column
ALTER TABLE users ADD COLUMN isPhoneVerified INTEGER DEFAULT 0;

-- Add isEmailVerified column  
ALTER TABLE users ADD COLUMN isEmailVerified INTEGER DEFAULT 0;

-- Add isVerified column
ALTER TABLE users ADD COLUMN isVerified INTEGER DEFAULT 0;

-- Add isAdmin column
ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0;

-- Update existing users: set isVerified=1 for travelers who have been approved
UPDATE users SET isVerified = 1 WHERE role = 'traveler' AND status = 'approved';

-- Update existing users: set isAdmin=1 for the admin email
UPDATE users SET isAdmin = 1 WHERE email = 'auth@cnviptravel.com';
