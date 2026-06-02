@echo off
REM ============================================
REM  SafeQR – Cloudflare Pages Deploy
REM  Account: anhy.work.2004@gmail.com
REM  Site: https://safeqr.io (api.safeqr.io)
REM ============================================
echo.
echo  SafeQR - Cloudflare Pages Deployment
echo  =======================================
echo  Account: anhy.work.2004@gmail.com
echo.

REM ── Step 1: Login ──
echo [1/3] Logging in to Cloudflare...
echo       Complete browser OAuth with: anhy.work.2004@gmail.com
call npx wrangler login
if %errorlevel% neq 0 ( echo  Login failed. & pause & exit /b 1 )
echo  Logged in!
echo.

REM ── Step 2: Deploy Pages ──
echo [2/3] Deploying to Cloudflare Pages (project: safeqr)...
call npx wrangler pages deploy . --project-name=safeqr --branch=main
if %errorlevel% neq 0 (
    echo  Pages deploy failed. Trying to create project first...
    call npx wrangler pages project create safeqr --production-branch=main
    call npx wrangler pages deploy . --project-name=safeqr --branch=main
    if %errorlevel% neq 0 ( echo  Deploy failed. & pause & exit /b 1 )
)
echo  Pages deployed!
echo.

REM ── Step 3: Deploy Worker (API) ──
echo [3/3] Deploying Worker API...
cd worker
call npx wrangler deploy
if %errorlevel% neq 0 ( echo  Worker deploy failed. & cd .. & pause & exit /b 1 )
cd ..
echo  Worker deployed!
echo.

echo  ============================================
echo   Deployment Complete!
echo   Site:    https://safeqr.pages.dev
echo   Custom:  https://safeqr.io (set in CF dashboard)
echo  ============================================
echo.
pause
