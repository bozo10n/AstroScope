@echo off
echo ========================================
echo    Fresh Server Setup
echo ========================================
echo.

echo WARNING: This will DELETE the entire /var/www/Space-Viewer folder on the server
echo and do a fresh clone from GitHub.
echo.
pause

echo [1/5] Building locally...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b %errorlevel%
)
echo ✓ Build complete
echo.

echo [2/5] Pushing to GitHub...
git add .
git commit -m "Fresh deploy: %date% %time%"
git push -f origin production
echo ✓ Pushed to GitHub
echo.

echo [3/5] Removing old server installation...
ssh root@165.22.230.192 "rm -rf /var/www/Space-Viewer"
echo ✓ Old installation removed
echo.

echo [4/5] Cloning fresh from GitHub...
ssh root@165.22.230.192 "cd /var/www && git clone -b production https://github.com/bozo10n/Space-Viewer.git"
if %errorlevel% neq 0 (
    echo ERROR: Clone failed!
    pause
    exit /b %errorlevel%
)
echo ✓ Fresh clone complete
echo.

echo [5/5] Setting up backend...
echo Copying environment file...
scp backend\.env.production root@165.22.230.192:/var/www/Space-Viewer/backend/.env
echo Installing backend dependencies...
ssh root@165.22.230.192 "cd /var/www/Space-Viewer/backend && npm install && pm2 restart space-viewer-backend || pm2 start ecosystem.config.js"
echo ✓ Backend setup complete
echo.

echo ========================================
echo    ✓ Fresh Installation Complete!
echo    Site: https://unlrealities.ca
echo ========================================
pause
