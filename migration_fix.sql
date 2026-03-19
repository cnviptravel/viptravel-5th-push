DROP TABLE IF EXISTS telegram_verifications;
DROP TABLE IF EXISTS email_verifications;

CREATE TABLE telegram_verifications (
  code TEXT PRIMARY KEY,
  userId TEXT, 
  phone TEXT,
  verified INTEGER DEFAULT 0,
  chatId TEXT,
  otpCode TEXT,
  createdAt INTEGER
);

CREATE TABLE email_verifications (
  email TEXT PRIMARY KEY,
  code TEXT,
  createdAt INTEGER
);
