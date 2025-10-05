# Manual Deployment Steps

Since the automated deploy script requires SSH password input, follow these manual steps:

## Quick Fix - Deploy Now

### Step 1: Local Build (Already Done)
Your local build is complete with the updated socket configuration.

### Step 2: SSH to Server
```bash
ssh root@165.22.230.192
```

### Step 3: On the Server, Run These Commands:
```bash
cd /var/www/Space-Viewer

# Pull latest code
git pull origin production

# Install frontend dependencies (may take a few minutes)
npm install

# Build the frontend
npm run build

# Copy backend env file if you haven't already
# (Or use the scp command from your local machine)

# Install backend dependencies
cd backend
npm install

# Restart backend
pm2 restart space-viewer-backend

# Check if it's running
pm2 status
pm2 logs space-viewer-backend --lines 20
```

### Step 4: Verify
Go to https://unlrealities.ca and check the browser console. It should now show:
```
Connecting to: https://unlrealities.ca
```
(without the :3000 port)

---

## Long-term Solution: SSH Key Authentication

To avoid password prompts and enable automated deployment:

### On Your Windows Machine:
```powershell
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096

# Copy your public key to the server
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh root@165.22.230.192 "cat >> ~/.ssh/authorized_keys"
```

After this, your `deploy.bat` script will work without password prompts!

---

## Alternative: Build Locally, Copy Build Folder

If you prefer not to build on the server:

### Option A: Using SCP (add to deploy.bat after line 53)
```batch
echo Copying build folder to server...
scp -r build/* root@165.22.230.192:/var/www/Space-Viewer/build/
```

### Option B: Commit build folder to git
Remove `/build` from `.gitignore` (not recommended for large files)

---

## Current Issue Summary

**Problem:** Server's `build/` folder contains old code that still connects to `:3000`

**Solution:** Rebuild on server OR copy your local build folder

**Why it happened:** The deploy script commits code but doesn't update the build folder on the server
