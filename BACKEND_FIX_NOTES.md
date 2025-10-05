# Backend Deployment Fixes

## Issues Found & Fixed

### 1. **CORS Configuration (CRITICAL)**
**Problem:** Socket.IO was hardcoded to only accept connections from `http://localhost:5173`
- This blocked all production users from using real-time collaboration features
- Users accessing from https://unlrealities.ca couldn't connect to WebSocket

**Fix:** 
- Added environment-aware CORS configuration
- Production: Accepts connections from https://unlrealities.ca and https://www.unlrealities.ca
- Development: Accepts localhost connections on ports 5173, 3000, 3001
- Applied to both Express and Socket.IO CORS settings

### 2. **Database Path**
**Problem:** Relative path `./nasa_viewer.db` could fail depending on working directory

**Fix:** 
- Changed to absolute path using `path.join(__dirname, 'nasa_viewer.db')`
- More reliable across different deployment contexts

### 3. **Environment Variables**
**Problem:** No way to differentiate production from development environment

**Fix:**
- Created `backend/ecosystem.config.js` for PM2 with proper environment variables
- Server now checks `NODE_ENV` to determine allowed CORS origins
- Logs environment information on startup for debugging

### 4. **Deployment Script**
**Problem:** 
- Didn't install frontend dependencies on server
- Didn't set NODE_ENV=production
- Basic PM2 restart without configuration

**Fix:**
- Updated `deploy.bat` to:
  - Install both frontend and backend dependencies
  - Use PM2 ecosystem config file
  - Deploy with `--env production` flag
  - Save PM2 configuration

### 5. **Server Binding**
**Problem:** Server was binding to localhost implicitly

**Fix:**
- Now explicitly binds to `0.0.0.0` (all interfaces) via HOST environment variable
- Better for containerized/proxied deployments
- Configurable via environment variable

## Testing the Fixes

### Local Testing:
```bash
cd backend
npm start
```
Should show:
```
✓ Server running on http://0.0.0.0:3000
✓ Environment: development
✓ Allowed origins: [ 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001' ]
```

### Production Deployment:
Run your deployment script as normal:
```bash
deploy.bat
```

The server will automatically use production CORS settings.

## What Users Should See

**Before Fix:**
- ❌ Real-time collaboration features not working
- ❌ WebSocket connection failures in browser console
- ❌ CORS errors when accessing from production domain

**After Fix:**
- ✅ Real-time collaboration working on production
- ✅ WebSocket connections successful
- ✅ No CORS errors

## Additional Recommendations

1. **Add nginx reverse proxy configuration** (if not already done):
   ```nginx
   location /socket.io {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

2. **Monitor PM2 logs** on the server:
   ```bash
   ssh root@165.22.230.192 "pm2 logs space-viewer-backend"
   ```

3. **Check allowed origins** match your actual domain:
   - If users access via different subdomains, add them to the `allowedOrigins` array in `backend/server.js`

## Files Modified
- ✅ `backend/server.js` - CORS, database path, server binding
- ✅ `deploy.bat` - Deployment process improvements  
- ✅ `backend/ecosystem.config.js` - New PM2 configuration file
