# Deployment Guide

Complete guide for deploying the **Git Repository Analysis System** to a **production VM** with Ubuntu, Nginx, and PM2.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [VM Provisioning](#vm-provisioning)
- [Server Setup](#server-setup)
- [Application Deployment](#application-deployment)
- [Nginx Configuration](#nginx-configuration)
- [SSL Certificate Setup](#ssl-certificate-setup)
- [PM2 Process Management](#pm2-process-management)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Deployment Updates](#deployment-updates)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers deploying the application to a **single Virtual Machine (VM)** running **Ubuntu Server**. This deployment strategy is ideal for:

- **Predictable Costs**: Fixed monthly VM cost
- **Long-Running Tasks**: Git cloning and analysis can take several minutes
- **File System Access**: Need to clone repositories to disk
- **Full Control**: Install system dependencies and configure environment

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet (HTTPS)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Nginx (Port 443/80)                        │
│  - SSL Termination                                          │
│  - Reverse Proxy                                            │
│  - Static File Caching                                      │
│  - Security Headers                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              PM2 Process Manager (Cluster Mode)             │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Next.js     │  │  Next.js     │                        │
│  │  Instance 1  │  │  Instance 2  │  ... (n cores)         │
│  │  Port 3000   │  │  Port 3000   │                        │
│  └──────────────┘  └──────────────┘                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Firebase   │  │  Firestore   │  │    Gemini    │     │
│  │     Auth     │  │  Database    │  │      AI      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before starting deployment, ensure you have:

### Required Accounts & Credentials

- [x] **Firebase Project** with Firestore and Authentication enabled
  - Production Firebase project separate from development
  - Service account JSON key file
- [x] **Google Gemini API Key**
  - From [Google AI Studio](https://makersuite.google.com/app/apikey)
  - Sufficient quota for production usage
- [x] **Domain Name** (recommended)
  - DNS configured to point to VM
  - A record for `your-domain.com`
  - A record for `www.your-domain.com`
- [x] **SSH Access** to your VM
  - SSH key configured
  - Sudo privileges

### Local Development Completed

- [x] Application tested locally
- [x] All tests passing (`pnpm test`)
- [x] Build successful (`pnpm build`)
- [x] Environment variables configured

---

## VM Provisioning

### Recommended Specifications

For production deployment, we recommend:

| Resource    | Minimum          | Recommended      | Heavy Load       |
| ----------- | ---------------- | ---------------- | ---------------- |
| **CPU**     | 2 cores          | 4 cores          | 8+ cores         |
| **RAM**     | 4 GB             | 8 GB             | 16+ GB           |
| **Storage** | 50 GB SSD        | 100 GB SSD       | 200+ GB SSD      |
| **Network** | 1 Gbps           | 1 Gbps           | 10 Gbps          |
| **OS**      | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |

**Why these specs:**

- **CPU**: Multiple cores for PM2 cluster mode (one instance per core)
- **RAM**: Node.js processes, Git operations, and caching
- **Storage**: Cloned repositories, logs, and build artifacts
- **Network**: Fast repository cloning and user response times

### Cloud Provider Options

Choose a cloud provider based on your requirements:

#### Google Cloud Platform (GCP)

**Advantages:**

- Same provider as Firebase and Gemini (better integration)
- Competitive pricing
- Strong global network

**Instance Type:** `e2-standard-2` (2 vCPU, 8GB RAM) ≈ $50/month

```bash
# Create VM instance
gcloud compute instances create git-analyzer-vm \
  --zone=us-central1-a \
  --machine-type=e2-standard-2 \
  --image-family=ubuntu-2404-lts-amd64 \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=100GB \
  --boot-disk-type=pd-ssd \
  --tags=http-server,https-server
```

#### AWS (Amazon Web Services)

**Advantages:**

- Most mature cloud provider
- Extensive documentation
- Large ecosystem

**Instance Type:** `t3.medium` (2 vCPU, 4GB RAM) ≈ $30/month

```bash
# Launch EC2 instance via AWS Console
# AMI: Ubuntu Server 24.04 LTS
# Instance Type: t3.medium
# Storage: 100GB gp3 SSD
# Security Group: Allow SSH (22), HTTP (80), HTTPS (443)
```

#### DigitalOcean

**Advantages:**

- Simple interface
- Predictable pricing
- Good documentation

**Droplet:** Regular Intel with Premium SSD (2 vCPU, 4GB RAM) ≈ $24/month

```bash
# Create via DigitalOcean Console
# Image: Ubuntu 24.04 LTS
# Plan: Regular Intel, 2 vCPU, 4GB RAM, 80GB SSD
# Data center: Choose closest to your users
```

#### Hetzner

**Advantages:**

- Best price/performance ratio
- European data centers
- Excellent hardware

**Server:** CPX21 (3 vCPU, 4GB RAM) ≈ €5.99/month (~$6.50/month)

#### Linode (Akamai)

**Advantages:**

- Good support
- Simple pricing
- Global data centers

**Linode:** Linode 4GB (2 vCPU, 4GB RAM) ≈ $24/month

### Firewall Configuration

Ensure the following ports are open:

| Port | Protocol | Purpose                   | Source                     |
| ---- | -------- | ------------------------- | -------------------------- |
| 22   | TCP      | SSH                       | Your IP only (recommended) |
| 80   | TCP      | HTTP (redirects to HTTPS) | 0.0.0.0/0 (all)            |
| 443  | TCP      | HTTPS                     | 0.0.0.0/0 (all)            |

**Security Best Practices:**

- Restrict SSH (port 22) to your IP address or VPN
- Disable password authentication (use SSH keys only)
- Enable automatic security updates
- Install fail2ban for brute-force protection

---

## Server Setup

### Automated Setup Script

We provide an automated setup script for quick installation:

```bash
# SSH into your VM
ssh your-username@your-vm-ip

# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/yourusername/Git-Repository-Analysis-System/main/scripts/setup-vm.sh -o setup-vm.sh
chmod +x setup-vm.sh
sudo ./setup-vm.sh
```

**The script installs:**

- Node.js 20 LTS
- pnpm package manager
- Git
- Nginx web server
- PM2 process manager
- Certbot for SSL certificates

### Manual Setup (Step-by-Step)

If you prefer manual installation or want to understand each step:

#### 1. Update System Packages

```bash
# Update package lists
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y

# Install essential build tools
sudo apt install -y build-essential curl wget git
```

#### 2. Install Node.js 20 LTS

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

#### 3. Install pnpm

```bash
# Install pnpm globally
sudo npm install -g pnpm

# Verify installation
pnpm --version  # Should show v9.x.x
```

#### 4. Install and Configure Git

```bash
# Install Git
sudo apt install -y git

# Configure Git (for cloning operations)
git config --global user.name "Git Analyzer Bot"
git config --global user.email "bot@your-domain.com"

# Verify installation
git --version  # Should show v2.x.x
```

#### 5. Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx

# Test: Visit http://your-vm-ip in browser
# Should see "Welcome to nginx!" page
```

#### 6. Install PM2

```bash
# Install PM2 globally
sudo pnpm install -g pm2

# Configure PM2 to start on boot
pm2 startup
# Follow the command output to complete setup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

# Verify installation
pm2 --version
```

#### 7. Configure Firewall (UFW)

```bash
# Enable UFW if not already enabled
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'  # Allows both HTTP (80) and HTTPS (443)
sudo ufw enable

# Check firewall status
sudo ufw status
```

#### 8. Install Certbot (for SSL)

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

---

## Application Deployment

### 1. Create Application Directory

```bash
# Create directory for the application
sudo mkdir -p /var/www/git-analyzer

# Change ownership to your user
sudo chown -R $USER:$USER /var/www/git-analyzer

# Navigate to directory
cd /var/www/git-analyzer
```

### 2. Clone Repository

```bash
# Clone from GitHub
git clone https://github.com/yourusername/Git-Repository-Analysis-System.git .

# Or if using SSH
git clone git@github.com:yourusername/Git-Repository-Analysis-System.git .

# Check current branch
git branch

# Ensure you're on the main branch
git checkout main
```

### 3. Install Dependencies

```bash
# Install all dependencies
pnpm install --frozen-lockfile

# This ensures exact versions from pnpm-lock.yaml are installed
# Takes 2-5 minutes depending on network speed
```

### 4. Configure Environment Variables

```bash
# Create production environment file
cp .env.local.example .env.local

# Edit environment variables
nano .env.local
```

**Production `.env.local` Configuration:**

```bash
# ============================================================
# Firebase Client Configuration (Public)
# ============================================================
NEXT_PUBLIC_FIREBASE_API_KEY=your-production-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-prod-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-prod-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# ============================================================
# Firebase Admin SDK (Server-side - KEEP SECRET)
# ============================================================
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account-file.json

# ============================================================
# Google Gemini API Configuration
# ============================================================
GEMINI_API_KEY=your-production-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_MAX_TOKENS=8192
GEMINI_TEMPERATURE=0.7

# ============================================================
# Rate Limiting Configuration
# ============================================================
# Anonymous users (by IP)
RATE_LIMIT_ANONYMOUS_MAX=5
RATE_LIMIT_ANONYMOUS_WINDOW=3600000  # 1 hour

# Authenticated users
RATE_LIMIT_AUTHENTICATED_MAX=20
RATE_LIMIT_AUTHENTICATED_WINDOW=3600000

# ============================================================
# Git Operations Configuration
# ============================================================
GIT_CLONE_TIMEOUT=300000      # 5 minutes
GIT_MAX_REPO_SIZE=524288000   # 500MB

# ============================================================
# Application Configuration
# ============================================================
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**Save and close** (Ctrl+O, Enter, Ctrl+X in nano)

### 5. Add Firebase Service Account

```bash
# Create service account file
nano service-account-file.json
```

**Paste your production Firebase service account JSON:**

```json
{
  "type": "service_account",
  "project_id": "your-prod-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-prod-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

**Secure the file:**

```bash
# Set restrictive permissions (readable only by owner)
chmod 600 service-account-file.json

# Verify permissions
ls -la service-account-file.json
# Should show: -rw------- 1 your-user your-user
```

### 6. Deploy Firestore Rules and Indexes

```bash
# Install Firebase CLI if not already installed
pnpm install -g firebase-tools

# Login to Firebase
firebase login --no-localhost
# Follow the authentication flow

# Select your production project
firebase use your-prod-project-id

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

### 7. Build Application

```bash
# Build Next.js application for production
pnpm build

# This creates an optimized production build in .next/ directory
# Takes 2-5 minutes
```

**Expected output:**

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (5/5)
✓ Collecting build traces
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    5.2 kB          95 kB
├ ○ /dashboard                           8.1 kB          98 kB
├ ○ /login                               3.9 kB          93 kB
└ ○ /scan/[id]                          12.5 kB         102 kB
```

### 8. Test Build Locally

```bash
# Start production server locally
pnpm start

# In another terminal, test the application
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}

# Stop the server (Ctrl+C)
```

---

## Nginx Configuration

### 1. Create Nginx Configuration File

```bash
# Create configuration file
sudo nano /etc/nginx/sites-available/git-analyzer
```

**Paste the following configuration:**

```nginx
# Upstream configuration for Next.js
upstream git_analyzer {
    # PM2 will run multiple instances on the same port
    server 127.0.0.1:3000;

    # Keep connections alive for better performance
    keepalive 64;
}

# HTTP server - Redirect all HTTP traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server - Main application
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # ============================================================
    # SSL Configuration (Certificates added by Certbot)
    # ============================================================
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/your-domain.com/chain.pem;

    # SSL Optimization
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # ============================================================
    # Security Headers
    # ============================================================
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # ============================================================
    # Logging
    # ============================================================
    access_log /var/log/nginx/git-analyzer-access.log;
    error_log /var/log/nginx/git-analyzer-error.log warn;

    # ============================================================
    # Proxy Settings
    # ============================================================

    # Main application
    location / {
        proxy_pass http://git_analyzer;
        proxy_http_version 1.1;

        # WebSocket support (for hot reload in development)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Timeouts (important for long-running scan operations)
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Cache bypass for dynamic content
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets from Next.js (images, fonts, etc.)
    location /_next/static {
        proxy_pass http://git_analyzer;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Next.js images
    location /_next/image {
        proxy_pass http://git_analyzer;
        proxy_cache_valid 200 7d;
        add_header Cache-Control "public, max-age=604800";
    }

    # API routes - No caching
    location /api {
        proxy_pass http://git_analyzer;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Long timeout for analysis operations
        proxy_read_timeout 300s;

        # No caching for API responses
        proxy_cache_bypass 1;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://git_analyzer;
        access_log off;  # Don't log health checks
    }

    # Favicon and robots.txt
    location = /favicon.ico {
        proxy_pass http://git_analyzer;
        access_log off;
        log_not_found off;
    }

    location = /robots.txt {
        proxy_pass http://git_analyzer;
        access_log off;
        log_not_found off;
    }
}
```

**Important:** Replace `your-domain.com` with your actual domain name.

### 2. Enable Configuration

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/git-analyzer /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
# Should show: "syntax is ok" and "test is successful"

# Reload Nginx to apply changes
sudo systemctl reload nginx
```

---

## SSL Certificate Setup

### Using Let's Encrypt (Certbot)

Let's Encrypt provides free SSL certificates that auto-renew.

#### 1. Obtain SSL Certificate

```bash
# Make sure your domain points to your VM's IP address
# Check with: dig your-domain.com +short

# Run Certbot with Nginx plugin
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# - Enter your email address
# - Agree to Terms of Service
# - Choose whether to share email with EFF (optional)
# - Certbot will automatically configure Nginx
```

**Certbot will:**

- Verify domain ownership
- Obtain SSL certificate
- Automatically configure Nginx with SSL
- Set up certificate auto-renewal

#### 2. Test SSL Configuration

```bash
# Visit your site in a browser
https://your-domain.com

# Should show a secure padlock icon
```

**Check SSL quality:**

- Visit: https://www.ssllabs.com/ssltest/
- Enter your domain
- Should achieve A or A+ rating

#### 3. Test Auto-Renewal

```bash
# Test renewal process (dry run)
sudo certbot renew --dry-run

# Should show: "Congratulations, all simulated renewals succeeded"
```

**Auto-renewal is automatic:**

- Certbot installs a cron job or systemd timer
- Checks for renewal twice daily
- Renews certificates 30 days before expiry
- Reloads Nginx automatically

#### 4. Check Renewal Timer

```bash
# Check systemd timer (Ubuntu 22.04+)
sudo systemctl status certbot.timer

# View renewal configuration
sudo cat /etc/letsencrypt/renewal/your-domain.com.conf
```

---

## PM2 Process Management

### 1. Configure PM2 Ecosystem

The project includes an `ecosystem.config.js` file for PM2:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "git-analyzer",
      script: "pnpm",
      args: "start",
      cwd: "/var/www/git-analyzer",

      // Cluster mode - one instance per CPU core
      instances: "max", // or specific number like 2, 4
      exec_mode: "cluster",

      // Environment variables
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Logging
      error_file: "/var/www/git-analyzer/logs/pm2-error.log",
      out_file: "/var/www/git-analyzer/logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // Restart behavior
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,

      // Resource limits
      max_memory_restart: "500M",

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
}
```

### 2. Create Logs Directory

```bash
# Create directory for PM2 logs
mkdir -p /var/www/git-analyzer/logs
```

### 3. Start Application with PM2

```bash
# Navigate to application directory
cd /var/www/git-analyzer

# Start application
pm2 start ecosystem.config.js

# Expected output:
# ┌─────┬──────────────┬─────────────┬─────────┬─────────┬──────────┐
# │ id  │ name         │ mode        │ ↺       │ status  │ cpu      │
# ├─────┼──────────────┼─────────────┼─────────┼─────────┼──────────┤
# │ 0   │ git-analyzer │ cluster     │ 0       │ online  │ 0%       │
# │ 1   │ git-analyzer │ cluster     │ 0       │ online  │ 0%       │
# └─────┴──────────────┴─────────────┴─────────┴─────────┴──────────┘

# Save PM2 configuration
pm2 save

# Verify it's running
pm2 status
```

### 4. Configure PM2 Startup

```bash
# Generate startup script
pm2 startup

# Follow the command shown in output, e.g.:
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

# This ensures PM2 starts on boot
```

### 5. Test Application

```bash
# Check if application is responding
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}

# Check via domain (if DNS configured)
curl https://your-domain.com/api/health
```

---

## Monitoring & Maintenance

### PM2 Monitoring

#### Real-Time Monitoring

```bash
# Real-time dashboard
pm2 monit

# Shows:
# - CPU usage per process
# - Memory usage
# - Logs in real-time
```

#### Process Status

```bash
# List all processes
pm2 list

# Detailed info about specific process
pm2 show git-analyzer

# CPU and memory usage
pm2 status
```

#### Logs

```bash
# View all logs
pm2 logs

# View only application logs
pm2 logs git-analyzer

# View last 100 lines
pm2 logs git-analyzer --lines 100

# View only errors
pm2 logs git-analyzer --err

# Stream new logs
pm2 logs git-analyzer --raw
```

### Nginx Monitoring

#### Access Logs

```bash
# View recent access logs
sudo tail -f /var/log/nginx/git-analyzer-access.log

# Count requests by status code
sudo cat /var/log/nginx/git-analyzer-access.log | cut -d '"' -f3 | cut -d ' ' -f2 | sort | uniq -c | sort -rn

# Count requests to /api/scan
sudo grep "POST /api/scan" /var/log/nginx/git-analyzer-access.log | wc -l

# Show slow requests (>1 second)
sudo awk '$NF > 1' /var/log/nginx/git-analyzer-access.log
```

#### Error Logs

```bash
# View error logs
sudo tail -f /var/log/nginx/git-analyzer-error.log

# Count errors by type
sudo grep -oP 'error.*?(?=,)' /var/log/nginx/git-analyzer-error.log | sort | uniq -c | sort -rn
```

### System Monitoring

#### Disk Usage

```bash
# Check disk usage
df -h

# Check directory sizes
du -sh /var/www/git-analyzer/*

# Find large files
sudo find /var/www/git-analyzer -type f -size +100M

# Clean up old cloned repositories (if any remain)
find /tmp -name "repo-*" -mtime +1 -exec rm -rf {} \;
```

#### Memory Usage

```bash
# Check memory usage
free -h

# Detailed memory info
cat /proc/meminfo

# Memory usage by process
ps aux --sort=-%mem | head -20
```

#### CPU Usage

```bash
# Real-time process monitor
htop

# CPU info
lscpu

# Load average
uptime
```

### Automated Monitoring Script

Create a monitoring script:

```bash
# Create monitoring script
nano /var/www/git-analyzer/scripts/monitor.sh
```

```bash
#!/bin/bash
# monitor.sh - System monitoring script

echo "=== Git Analyzer System Status ==="
echo "Time: $(date)"
echo ""

echo "--- PM2 Status ---"
pm2 status

echo ""
echo "--- Disk Usage ---"
df -h / | tail -1

echo ""
echo "--- Memory Usage ---"
free -h | grep Mem

echo ""
echo "--- CPU Load ---"
uptime

echo ""
echo "--- Recent Errors (last 10) ---"
sudo tail -10 /var/log/nginx/git-analyzer-error.log

echo ""
echo "--- Recent Scans (last 5 minutes) ---"
sudo grep "POST /api/scan" /var/log/nginx/git-analyzer-access.log | tail -10
```

```bash
# Make executable
chmod +x /var/www/git-analyzer/scripts/monitor.sh

# Run manually
./scripts/monitor.sh

# Or schedule with cron (every hour)
crontab -e
# Add: 0 * * * * /var/www/git-analyzer/scripts/monitor.sh >> /var/www/git-analyzer/logs/monitor.log 2>&1
```

---

## Deployment Updates

### Zero-Downtime Deployment Process

When you have new code to deploy:

#### 1. Pull Latest Changes

```bash
# Navigate to application directory
cd /var/www/git-analyzer

# Stash any local changes (if any)
git stash

# Pull latest from main branch
git pull origin main

# Check what changed
git log --oneline -5
```

#### 2. Install Dependencies (if needed)

```bash
# Check if package.json changed
git diff HEAD@{1} HEAD -- package.json

# If package.json changed, update dependencies
pnpm install --frozen-lockfile
```

#### 3. Rebuild Application

```bash
# Build new version
pnpm build

# Takes 2-5 minutes
```

#### 4. Reload PM2 (Zero Downtime)

```bash
# Reload with zero downtime
pm2 reload ecosystem.config.js

# PM2 will:
# 1. Start new instances
# 2. Wait for them to be ready
# 3. Gracefully shutdown old instances
# 4. All without downtime

# Verify reload was successful
pm2 status
pm2 logs git-analyzer --lines 50
```

#### 5. Test Deployment

```bash
# Test health endpoint
curl https://your-domain.com/api/health

# Test scanning (with a small test repo)
curl -X POST https://your-domain.com/api/scan \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"https://github.com/vercel/next.js"}'

# Check logs for any errors
pm2 logs git-analyzer --lines 100 --err
```

### Rollback Procedure

If something goes wrong:

```bash
# Check git log to find previous working commit
git log --oneline -10

# Rollback to previous commit
git checkout <commit-hash>

# Rebuild
pnpm build

# Reload PM2
pm2 reload ecosystem.config.js

# Verify
pm2 logs git-analyzer --lines 50
```

### Automated Deployment with Git Hooks

Create a post-receive hook for automatic deployment:

```bash
# On your local machine, add this as a git remote
git remote add production ssh://user@your-vm-ip/var/www/git-analyzer/.git

# On the server, create post-receive hook
cat > /var/www/git-analyzer/.git/hooks/post-receive << 'EOF'
#!/bin/bash
cd /var/www/git-analyzer
git --work-tree=/var/www/git-analyzer --git-dir=/var/www/git-analyzer/.git checkout -f
pnpm install --frozen-lockfile
pnpm build
pm2 reload ecosystem.config.js
EOF

chmod +x /var/www/git-analyzer/.git/hooks/post-receive

# Now you can deploy with:
git push production main
```

---

## Backup & Recovery

### Database Backup (Firestore)

Firestore automatically backs up your data, but you can also export manually:

```bash
# Install Firebase CLI if not already installed
pnpm install -g firebase-tools

# Login
firebase login --no-localhost

# Export Firestore to Cloud Storage
firebase firestore:export gs://your-bucket-name/backups/$(date +%Y%m%d)

# Schedule with cron (daily at 2 AM)
crontab -e
# Add: 0 2 * * * firebase firestore:export gs://your-bucket-name/backups/$(date +\%Y\%m\%d) >> /var/log/firestore-backup.log 2>&1
```

### Application Backup

```bash
# Create backup script
nano /var/www/git-analyzer/scripts/backup.sh
```

```bash
#!/bin/bash
# backup.sh - Backup critical files

BACKUP_DIR="/var/backups/git-analyzer"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup environment file
cp /var/www/git-analyzer/.env.local $BACKUP_DIR/.env.local.$DATE

# Backup service account
cp /var/www/git-analyzer/service-account-file.json $BACKUP_DIR/service-account-file.json.$DATE

# Backup PM2 configuration
cp /var/www/git-analyzer/ecosystem.config.js $BACKUP_DIR/ecosystem.config.js.$DATE

# Backup Nginx configuration
sudo cp /etc/nginx/sites-available/git-analyzer $BACKUP_DIR/nginx-git-analyzer.$DATE

# Create tarball
tar -czf $BACKUP_DIR/git-analyzer-backup-$DATE.tar.gz $BACKUP_DIR/*.$DATE

# Remove old backups (keep last 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/git-analyzer-backup-$DATE.tar.gz"
```

```bash
# Make executable
chmod +x /var/www/git-analyzer/scripts/backup.sh

# Run manually
sudo ./scripts/backup.sh

# Schedule with cron (daily at 3 AM)
sudo crontab -e
# Add: 0 3 * * * /var/www/git-analyzer/scripts/backup.sh >> /var/log/git-analyzer-backup.log 2>&1
```

### Recovery Process

```bash
# Restore from backup
tar -xzf /var/backups/git-analyzer/git-analyzer-backup-YYYYMMDD_HHMMSS.tar.gz

# Restore files
cp /var/backups/git-analyzer/.env.local.YYYYMMDD_HHMMSS /var/www/git-analyzer/.env.local
cp /var/backups/git-analyzer/service-account-file.json.YYYYMMDD_HHMMSS /var/www/git-analyzer/service-account-file.json

# Restart application
pm2 restart git-analyzer
```

---

## Troubleshooting

### Application Won't Start

**Check PM2 logs:**

```bash
pm2 logs git-analyzer --err
```

**Common issues:**

1. **Port 3000 already in use:**

   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   pm2 restart git-analyzer
   ```

2. **Missing environment variables:**

   ```bash
   # Check .env.local file
   cat .env.local | grep GEMINI_API_KEY
   ```

3. **Firebase service account issue:**
   ```bash
   # Verify file exists and has correct permissions
   ls -la service-account-file.json
   # Should be: -rw------- (600)
   ```

### Nginx 502 Bad Gateway

**Check if Next.js is running:**

```bash
pm2 status
curl http://localhost:3000/api/health
```

**Check Nginx error logs:**

```bash
sudo tail -f /var/log/nginx/git-analyzer-error.log
```

**Restart services:**

```bash
pm2 restart git-analyzer
sudo systemctl restart nginx
```

### High Memory Usage

**Check memory usage:**

```bash
pm2 status  # Check memory column
free -h
```

**Restart application:**

```bash
pm2 restart git-analyzer
```

**Adjust PM2 memory limit:**

```javascript
// ecosystem.config.js
max_memory_restart: "500M" // Restart if exceeds 500MB
```

### SSL Certificate Issues

**Check certificate expiry:**

```bash
sudo certbot certificates
```

**Force renewal:**

```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

**Check Certbot logs:**

```bash
sudo cat /var/log/letsencrypt/letsencrypt.log
```

### Slow Performance

**Check system resources:**

```bash
htop
iotop  # Disk I/O
nethogs  # Network usage
```

**Check PM2 cluster mode:**

```bash
pm2 status
# Ensure you're running multiple instances
# instances: should match CPU cores
```

**Clear old repository clones:**

```bash
# Check /tmp directory
du -sh /tmp/*

# Remove old clones
find /tmp -name "repo-*" -mtime +1 -exec rm -rf {} \;
```

### Firestore Connection Issues

**Test Firestore access:**

```bash
# In application directory
node -e "
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account-file.json'));
initializeApp({ credential: cert(serviceAccount) });

getFirestore().collection('scans').limit(1).get()
  .then(() => console.log('✅ Firestore connection successful'))
  .catch(err => console.error('❌ Firestore connection failed:', err));
"
```

---

## Security Checklist

Before going to production, verify:

- [ ] SSH key authentication enabled (password auth disabled)
- [ ] Firewall (UFW) configured and enabled
- [ ] SSL certificate installed and auto-renewal working
- [ ] Service account file has 600 permissions
- [ ] `.env.local` has 600 permissions
- [ ] Nginx security headers configured
- [ ] PM2 running as non-root user
- [ ] Automatic security updates enabled
- [ ] fail2ban installed and configured
- [ ] Firebase security rules deployed
- [ ] Rate limiting configured in application
- [ ] Monitoring and alerting set up

---

## Next Steps

After deployment:

1. **Monitor Performance**: Check PM2 and Nginx logs regularly
2. **Set Up Alerts**: Configure monitoring tools (e.g., UptimeRobot, Datadog)
3. **Test Thoroughly**: Submit test scans and verify results
4. **Document Custom Changes**: Note any configuration specific to your setup
5. **Plan for Scale**: Monitor usage and plan for additional resources if needed

For more information:

- [Architecture Documentation](./ARCHITECTURE.md)
- [Configuration Guide](./CONFIGURATION.md)
- [Getting Started](./GETTING_STARTED.md)

---

**Deployment Complete! 🎉**

Your Git Repository Analysis System should now be running in production at `https://your-domain.com`.
