@echo off
echo ========================================
echo   AUTO DEPLOY - When you get back
echo ========================================
echo.
echo Waiting for build to complete...
timeout /t 3 /nobreak >nul

:check_build
npm run build >nul 2>&1
if %errorlevel% equ 0 goto build_done
timeout /t 2 /nobreak >nul
goto check_build

:build_done
echo ✓ Build complete!
echo.

echo Adding files to git...
git add build/

echo Committing...
git commit -m "Fix: Updated build with correct socket URL"

echo Pushing to GitHub...
git push -u origin fix-socket-build

echo Merging to production branch...
git checkout production
git merge fix-socket-build
git push origin production

echo Deploying to server...
ssh root@165.22.230.192 "cd /var/www/Space-Viewer && git pull origin production"

echo.
echo ========================================
echo   ✅ DEPLOYMENT COMPLETE!
echo   Check: https://unlrealities.ca
echo ========================================
pause
