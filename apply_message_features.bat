@echo off
echo ========================================
echo VipTravel Message Features Migration
echo ========================================
echo.
echo This script will add Facebook Messenger features columns to messages table.
echo.
cd backend
echo Applying migration to viptravel-db...
npx wrangler d1 execute viptravel-db --file=../add_message_features.sql --remote
echo.
echo ========================================
echo Migration complete!
echo ========================================
echo.
echo If you see "duplicate column" errors, that's okay - it means those columns already exist.
echo.
echo Next step: Facebook Messenger features are now available.
echo.
pause