# Database Migration Instructions

## Issue
Registration is failing because the database is missing the verification columns (`isPhoneVerified`, `isEmailVerified`, `isVerified`, `isAdmin`).

## Solution
Apply the migration script to add these columns to your Cloudflare D1 database.

## Steps to Apply Migration

### Option 1: Using Cloudflare Dashboard (Recommended)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **D1**
3. Select your database (likely named `viptravel-db` or similar)
4. Go to the **Console** tab
5. Copy and paste the contents of `add_verification_columns.sql` into the console
6. Click **Execute**

### Option 2: Using Wrangler CLI
```bash
# Navigate to backend folder
cd backend

# Apply migration (replace DB_NAME with your actual database name)
npx wrangler d1 execute DB_NAME --file=../add_verification_columns.sql --remote
```

### Option 3: Manual SQL Execution
If the above methods don't work, you can run each command individually:

```sql
ALTER TABLE users ADD COLUMN isPhoneVerified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN isEmailVerified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN isVerified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0;
UPDATE users SET isVerified = 1 WHERE role = 'traveler' AND status = 'approved';
UPDATE users SET isAdmin = 1 WHERE email = 'auth@cnviptravel.com';
```

**Note:** If you see errors like "duplicate column name", it means those columns already exist. You can ignore those specific errors.

## Verification
After applying the migration, try registering a new provider/guide again. The registration should now work correctly.

## What Changed
- **isPhoneVerified**: Tracks whether the user verified their phone number
- **isEmailVerified**: Tracks whether the user verified their email
- **isVerified**: Overall verification status (1 if approved)
- **isAdmin**: Marks admin users (automatically set for auth@cnviptravel.com)

## Backend Behavior After Migration
- **Travelers**: Auto-verified and approved if either email OR phone is verified
- **Providers/Guides**: Must be manually approved by admin (status='approved')
- **Admin account** (auth@cnviptravel.com): Auto-granted admin privileges on login
