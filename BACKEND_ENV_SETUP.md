# Backend Environment Configuration

## Files Created

### 1. `backend/.env` (Development)
Local development environment variables.
```
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
```

### 2. `backend/.env.production` (Production)
Production environment variables that will be deployed to your server.
```
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

## Changes Made

### Frontend Changes
- **`src/hooks/useCollaborationStore.js`**: Updated socket URL configuration
  - Production now connects to `https://unlrealities.ca` (without port)
  - Can be overridden with `REACT_APP_BACKEND_URL` environment variable
  - Development still uses `http://localhost:3000`

### Deployment Changes
- **`deploy.bat`**: Added step to copy `.env.production` to server before restart
  - Now copies backend environment file via SCP
  - Ensures production environment variables are set correctly

### Security Changes
- **`.gitignore`**: Added backend env files to prevent committing secrets
  - `.env` files are now excluded from git
  - Only `.env.production` template is safe to commit if needed

## Server Configuration Required

Your backend server needs to be accessible for WebSocket connections. You have two options:

### Option 1: Reverse Proxy (Recommended)
Configure nginx on your server to proxy Socket.IO traffic:

```nginx
location /socket.io/ {
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

### Option 2: Direct Port Access
If you prefer to expose port 3000 directly:
1. Open port 3000 in your firewall
2. Update `.env.production` in frontend:
   ```
   REACT_APP_BACKEND_URL=https://unlrealities.ca:3000
   ```

## Deployment Process

1. Run `deploy.bat` - it will now:
   - Build the frontend
   - Commit and push to GitHub
   - Copy `.env.production` to server
   - Pull latest code on server
   - Restart the backend with PM2

2. Backend will use the `.env` file for configuration

## Verifying Backend is Running

SSH into your server and check:
```bash
pm2 list
pm2 logs space-viewer-backend
```

The backend should show:
```
✓ Server running on http://0.0.0.0:3000
✓ Environment: production
✓ Allowed origins: ['https://unlrealities.ca', 'https://www.unlrealities.ca']
```

## Troubleshooting

If WebSocket connection still fails:
1. Check if backend is running: `pm2 status`
2. View backend logs: `pm2 logs space-viewer-backend`
3. Test port accessibility: `curl http://localhost:3000` from server
4. Check firewall rules if using direct port access
5. Verify nginx configuration if using reverse proxy
