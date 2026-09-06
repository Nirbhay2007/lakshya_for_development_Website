#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -euo pipefail

echo "🚀 Starting deployment to VPS..."

# 1. Build the production bundles locally
echo "📦 Building production assets..."
npm run build

# VPS VM Configuration
VM_IP="${VM_IP:-80.225.201.147}"
VM_USER="${VM_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_nirbhay}"
REMOTE_DIR="${REMOTE_DIR:-~/lakshya}"

# Check SSH Key existence
if [ ! -f "$SSH_KEY" ]; then
  echo "❌ Error: SSH key not found at $SSH_KEY"
  exit 1
fi

# 2. Sync files via rsync
echo "📤 Synchronizing files to VPS (preserving live CMS data & PIN configs)..."
rsync -avz --delete \
  --exclude='node_modules/' \
  --exclude='.git/' \
  --exclude='.vscode/' \
  --exclude='.idea/' \
  --exclude='.DS_Store' \
  --exclude='.env*' \
  --exclude='*.zip' \
  --exclude='*.log' \
  --exclude='shared/data/' \
  --exclude='server/data/' \
  --exclude='server/backups/' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  ./ "$VM_USER@$VM_IP:$REMOTE_DIR/"

# 2b. Initial seed for shared/data/ (only if not already present on server, avoids overwriting live CMS changes)
echo "🌱 Ensuring initial CMS seed data exists on VPS without overwriting live data..."
rsync -avz --ignore-existing \
  --exclude='media/' \
  --exclude='temp/' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  ./shared/data/ "$VM_USER@$VM_IP:$REMOTE_DIR/shared/data/"

# 3. Post-sync installation and PM2 process restart on remote VM
echo "⚙️  Installing dependencies and restarting PM2 process on the VPS..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VM_USER@$VM_IP" << 'EOF'
  set -euo pipefail

  # Load NVM and Node environment if present
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  if [ -d "$HOME/.nvm/versions/node" ]; then
    LATEST_NODE=$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -n 1)
    if [ -n "$LATEST_NODE" ]; then
      export PATH="$HOME/.nvm/versions/node/$LATEST_NODE/bin:$PATH:/usr/local/bin:/usr/bin"
    fi
  fi

  cd ~/lakshya
  
  echo "📁 Ensuring required directories exist..."
  mkdir -p server/data server/backups shared/data/temp shared/data/media
  
  echo "📥 Running npm install on server..."
  npm install --omit=dev --no-audit --no-fund
  
  echo "🔄 Starting / Reloading lakshya-app PM2 process..."
  if pm2 describe lakshya-app > /dev/null 2>&1; then
    pm2 restart lakshya-app --update-env
  else
    pm2 start server/index.js --name "lakshya-app"
  fi
  pm2 save
  
  echo "📊 Process list:"
  pm2 list
EOF

echo "🎉 Deployment complete! Visit http://$VM_IP:3000 to verify."

