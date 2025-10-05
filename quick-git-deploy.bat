@echo off
echo Quick Deploy - Build folder only
echo ======================================

echo Step 1: Adding build folder to git...
git add build/

echo Step 2: Committing...
git commit -m "Update build with fixed socket URL"


echo Step 2.5: Fetching latest from production...


git fetch origin production
git reset --hard origin/production
echo Step 3: Pushing to GitHub (force)...
git push -f origin production

echo Step 4: Pulling on server...
ssh root@165.22.230.192 "cd /var/www/Space-Viewer && git pull origin production"

echo ======================================
echo Done! Check https://unlrealities.ca
pause
