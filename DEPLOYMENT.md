# Production Deployment Guide — Lakshya CMS Monorepo

This guide explains how to deploy the unified production-ready application to a VPS (e.g., Ubuntu/Debian server).

## 🚀 Overview

The application is structured as a monorepo containing:
- **Express Backend (`server/`)**: Acts as the API server and serves both compiled frontend sites.
- **Public Site (`public-site/`)**: Serves public visitors at the root path (`/`).
- **Admin CMS Portal (`admin/`)**: Serves the CMS editors under the subpath (`/admin`).

---

## 📦 Step-by-Step Deployment

### 1. Prerequisite Checklist on VPS
Ensure the following are installed on your VPS:
- **Node.js** (v18 or higher recommended)
- **NPM** (v9 or higher)
- **PM2** (Process manager for Node.js - recommended to keep the server running)

To install PM2 globally:
```bash
sudo npm install -g pm2
```

### 2. Copy the Files to VPS
Copy the project folder to your VPS (e.g., using `rsync`, `scp`, or `git clone`). Ensure you exclude local `node_modules` folders to save time.

### 3. Install Dependencies
Run the install command in the root folder of the project on your VPS:
```bash
npm install
```

### 4. Build Frontend Assets
Build both the public-site and the admin portal for production:
```bash
npm run build
```
This compiles the React applications into static files inside `public-site/dist` and `admin/dist`.

### 5. Run with PM2 (Process Manager)
Start the Express server in the background using PM2 so it stays online and automatically restarts if it crashes or the VPS restarts:
```bash
pm2 start server/index.js --name "lakshya-app"
```

To make PM2 start automatically on VPS boot:
```bash
pm2 startup
pm2 save
```

### 6. (Recommended) Configure Nginx Reverse Proxy
To map your domain name (e.g., `lakshya.org`) to the Node.js process running on port `3000`, configure Nginx as a reverse proxy.

Example Nginx server block configuration (`/etc/nginx/sites-available/lakshya`):
```nginx
server {
    listen 80;
    server_name lakshya.org www.lakshya.org;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/lakshya /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 Security Operations & Maintenance

- **Persistent CMS Data**: All CMS changes are saved in JSON files inside `shared/data/`. Any server restarts on your VPS will **not** revert these changes; they are persisted permanently to the disk.
- **PIN Authorization File**: Your active PIN configuration is saved in `server/data/auth.json`. This file is ignored by Git via `.gitignore` to prevent committing sensitive PIN hashes. Keep a backup of this file if you wish, or reset it by deleting the file to revert the PIN to the default `123456`.
- **Inactivity Session Lock**: The portal locks automatically after **5 minutes** of idle inactivity.
