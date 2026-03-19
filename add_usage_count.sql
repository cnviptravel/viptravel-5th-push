-- translations хүснэгтэд usage_count багана нэмэх
ALTER TABLE translations ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 1;

-- Хурдан эрэмбэлж харахад туслах index
CREATE INDEX IF NOT EXISTS idx_translations_usage ON translations(usage_count DESC);
