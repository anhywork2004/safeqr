@echo off
REM ============================================
REM  SafeQR Cloudflare Deployment Script
REM  Account: anhy.work.2004@gmail.com
REM ============================================
echo.
echo  🚀 SafeQR - Cloudflare Deployment
echo  ======================================
echo.

REM Step 1: Login to Cloudflare
echo  [1/5] Logging into Cloudflare...
echo        Please complete the browser login with: anhy.work.2004@gmail.com
call npx wrangler login
if %errorlevel% neq 0 (
    echo  ❌ Login failed. Please try again.
    pause
    exit /b 1
)
echo  ✅ Logged in!
echo.

REM Step 2: Create D1 Database
echo  [2/5] Creating D1 database (safeqr-db)...
cd worker
call npx wrangler d1 create safeqr-db
if %errorlevel% neq 0 (
    echo  ⚠️  Database might already exist, continuing...
)
echo.

REM Step 3: Get database_id and update wrangler.toml
echo  [3/5] Getting database info...
for /f "tokens=*" %%i in ('call npx wrangler d1 info safeqr-db 2^>^&1 ^| findstr /C:"database_id"') do set DB_LINE=%%i
echo  Database info: %DB_LINE%
echo  ⚠️  Please copy the database_id from above and update worker\wrangler.toml if needed
echo.

REM Step 4: Run migration
echo  [4/5] Running database migration...
call npx wrangler d1 migrations apply safeqr-db
if %errorlevel% neq 0 (
    echo  ❌ Migration failed!
    pause
    exit /b 1
)
echo  ✅ Migration complete!
echo.

REM Step 5: Deploy Worker
echo  [5/5] Deploying Worker API...
call npx wrangler deploy
if %errorlevel% neq 0 (
    echo  ❌ Worker deployment failed!
    pause
    exit /b 1
)
echo  ✅ Worker deployed!
echo.

REM Get worker URL
echo  ┌─────────────────────────────────────────┐
echo  │  🎉 Deployment Complete!                │
echo  │                                         │
echo  │  Worker URL: check output above         │
echo  │  Update js/api.js with the Worker URL   │
echo  └─────────────────────────────────────────┘
echo.

cd ..
echo  Next steps:
echo  1. Copy the Worker URL from above
echo  2. Open js/api.js and set API_BASE to the Worker URL
echo  3. Run: npx wrangler pages deploy . --project-name=safeqr
echo.
pause
