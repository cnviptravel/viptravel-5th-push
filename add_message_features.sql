-- Add new columns to messages table for Facebook Messenger features
ALTER TABLE messages ADD COLUMN readAt INTEGER;
ALTER TABLE messages ADD COLUMN reactions TEXT DEFAULT '[]'; -- JSON array of MessageReaction objects
ALTER TABLE messages ADD COLUMN replyTo TEXT; -- JSON object of MessageReply
ALTER TABLE messages ADD COLUMN forwardedFrom TEXT; -- userId who forwarded this message