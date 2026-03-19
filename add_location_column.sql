-- Migration: Add location column to users table
-- Run this in your Cloudflare D1 database
-- Command: wrangler d1 execute viptravel-db --file=add_location_column.sql --remote

-- Add location column (stored as JSON string: {"lat": 47.9, "lng": 106.9, "address": "Ulaanbaatar"})
ALTER TABLE users ADD COLUMN location TEXT;

-- Optional: Set default location for existing approved guides/providers in Ulaanbaatar
-- UPDATE users SET location = '{"lat":47.9221,"lng":106.9155,"address":"Ulaanbaatar, Mongolia"}' WHERE status = 'approved' AND (role = 'guide' OR role = 'provider');
