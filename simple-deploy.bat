@echo off
echo ========================================
echo    Simple Deploy - Copy Build Only
echo ========================================
echo.

echo [1/4] Building locally...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b %errorlevel%
)
echo ✓ Build complete
echo.

echo [2/4] Pushing to GitHub...
git add build/
git commit -m "Deploy: %date% %time%"
git push -f origin production
echo ✓ Pushed to GitHub
echo.

echo [3/4] Syncing server with GitHub...
ssh root@165.22.230.192 "cd /var/www/Space-Viewer && git fetch origin production && git reset --hard origin/production"
if %errorlevel% neq 0 (
    echo ERROR: Server sync failed!
    pause
    exit /b %errorlevel%
)
echo ✓ Server synced
echo.

echo [4/4] Restarting backend...
ssh root@165.22.230.192 "cd /var/www/Space-Viewer/backend && pm2 restart space-viewer-backend"
if %errorlevel% neq 0 (
    echo WARNING: Backend restart may have failed
)
echo.

echo ========================================
echo    ✓ Deployment Complete!
echo    Site: https://unlrealities.ca
echo ========================================
pause
