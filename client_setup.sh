#!/bin/bash
# ==============================================================================
# Lakshya NGO Web Application & CMS - Client Server Automated Setup Script
# ==============================================================================

set -e

echo "🚀 Starting Lakshya NGO Application Setup on Client VPS..."

# 1. Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v18 or higher) first."
    echo "   Ubuntu command: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# 2. Check PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 PM2 process manager not found. Installing PM2 globally..."
    sudo npm install -g pm2
fi

# 3. Install NPM Dependencies
echo "📥 Installing project dependencies..."
npm install

# 4. Build Production App & Admin Bundles
echo "⚙️ Compiling production bundles for Public Website & Admin Portal..."
npm run build

# 5. Start / Restart server with PM2
echo "🔄 Registering PM2 service process..."
if pm2 show lakshya-app > /dev/null 2>&1; then
    pm2 restart lakshya-app
else
    pm2 start server/index.js --name "lakshya-app"
fi

pm2 save

echo ""
echo "=============================================================================="
echo "🎉 SUCCESS! Lakshya NGO Website & CMS are live on Port 3000."
echo "=============================================================================="
echo "Next step: Configure Nginx reverse proxy to direct https://lakshyafordevelopment.org to port 3000."
