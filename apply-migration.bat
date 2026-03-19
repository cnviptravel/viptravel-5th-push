@echo off
echo ========================================
echo VipTravel Database Migration
echo ========================================
echo.
echo This script will add verification columns to your database.
echo.
cd backend
echo Applying migration to viptravel-db...
npx wrangler d1 execute viptravel-db --file=../add_verification_columns.sql --remote
echo.
echo ========================================
echo Migration complete!
echo ========================================
echo.
echo If you see "duplicate column" errors, that's okay - it means those columns already exist.
echo.
echo Next step: Try registering a provider/guide again.
echo.
pause
