#!/bin/bash
# Server-side rebuild script

cd /var/www/Space-Viewer

echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed!"
    exit 1
fi

echo "🔨 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "🔄 Restarting backend..."
cd backend
npm install
pm2 restart space-viewer-backend

echo "✅ Deployment complete!"
