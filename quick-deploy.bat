@echo off
echo ========================================
echo    Quick Deploy - Copy Build Only
echo ========================================
echo.

echo This will copy your local build to the server
echo without rebuilding on the server.
echo.
pause

echo Copying build folder to server...
scp -r build\* root@165.22.230.192:/var/www/Space-Viewer/build/

if %errorlevel% neq 0 (
    echo ERROR: Copy failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================
echo    ✓ Build folder copied!
echo    Your site should now use the updated code.
echo ========================================
pause
