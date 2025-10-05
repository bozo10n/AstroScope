@echo off
echo ========================================
echo    Deploying Space Viewer
echo ========================================
echo.

echo [1/6] Checking dependencies...
if not exist "node_modules\" (
    echo Installing frontend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed!
        pause
        exit /b %errorlevel%
    )
)
echo ✓ Dependencies ready
echo.

echo [2/6] Building React frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b %errorlevel%
)
echo ✓ Build complete
echo.

echo [3/6] Staging changes...
git add .
echo ✓ Changes staged
echo.

echo [4/6] Committing...
set commit_msg=Deploy: %date% %time%
git commit -m "%commit_msg%"
echo ✓ Committed
echo.

echo [5/6] Pushing to GitHub (force)...
git push -f origin production
if %errorlevel% neq 0 (
    echo ERROR: Push failed!
    pause
    exit /b %errorlevel%
)
echo ✓ Pushed to GitHub
echo.

echo [6/6] Deploying to server...
echo Copying backend environment file...
scp backend\.env.production root@165.22.230.192:/var/www/Space-Viewer/backend/.env
echo Pulling latest code, building, and restarting...
ssh root@165.22.230.192 "cd /var/www/Space-Viewer && git fetch origin production && git reset --hard origin/production && git lfs pull && npm install && npm run build && cd backend && npm install && pm2 restart space-viewer-backend"
if %errorlevel% neq 0 (
    echo ERROR: Server deployment failed!
    pause
    exit /b %errorlevel%
)
echo.

echo ========================================
echo    ✓ Deployment Complete!
echo    Site: https://unlrealities.ca
echo ========================================
pause