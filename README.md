# Git Repository Analysis System

> AI-powered Git repository analysis platform built with Next.js, Firebase, and Google Gemini.

A full-stack web application that analyzes Git repositories using AI to provide insights about code structure, architecture, technologies, and best practices.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin-orange)](https://firebase.google.com/)
[![Gemini](https://img.shields.io/badge/Google-Gemini-blue)](https://ai.google.dev/)

---

## 📋 Table of Contents

- [Features](#-features)
- [專案安裝與設定說明](#-專案安裝與設定說明)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
  - [Environment Variables](#environment-variables)
- [系統架構概述](#-系統架構概述)
  - [Architecture Overview](#architecture-overview)
  - [Key Components](#key-components)
  - [Data Flow](#data-flow)
- [技術選擇與理由](#-技術選擇與理由)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Infrastructure](#infrastructure)
- [部署指南](#-部署指南)
  - [VM Deployment (Ubuntu)](#vm-deployment-ubuntu)
  - [DNS & SSL Setup](#dns--ssl-setup)
  - [Monitoring](#monitoring)
- [Documentation](#-documentation)
- [License](#-license)

---

## ✨ Features

- 🤖 **AI-Powered Analysis**: Uses Google Gemini to analyze repository structure, architecture, and code quality
- 🔍 **Repository Insights**: Automatic detection of languages, frameworks, dependencies, and project structure
- 📊 **Real-time Progress**: Live scan status updates via Firestore listeners
- 🛡️ **Security**: Malicious content detection, rate limiting, and authenticated scanning
- 👥 **User Authentication**: Firebase Auth with Google sign-in
- 📈 **Quota Management**: Per-user and per-IP rate limiting with automatic quota refunds on errors
- ⚡ **Async Processing**: Background job queue for handling analysis tasks
- 🎨 **Modern UI**: Beautiful shadcn/ui components with Tailwind CSS

---

## 🚀 專案安裝與設定說明

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or higher)
- **pnpm** (v9 or higher)
- **Git** (v2.30 or higher)
- **Firebase Project** with Firestore and Authentication enabled
- **Google Gemini API Key**

### Quick Start

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/Git-Repository-Analysis-System.git
   cd Git-Repository-Analysis-System
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**

   Copy the example environment file and fill in your credentials:

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your configuration (see [Environment Variables](#environment-variables) section).

4. **Configure Firebase Service Account**

   Copy your Firebase service account JSON file:

   ```bash
   cp /path/to/your/service-account-file.json ./service-account-file.json
   ```

   ⚠️ **Important**: Never commit `service-account-file.json` to version control!

5. **Deploy Firestore Rules and Indexes**

   ```bash
   pnpm firebase:deploy
   ```

6. **Run Development Server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# ============================================================
# Firebase Client Configuration (Public - Safe to Expose)
# ============================================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# ============================================================
# Firebase Admin SDK (Server-side - KEEP SECRET)
# ============================================================
# Path to service account JSON file
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account-file.json

# ============================================================
# Google Gemini API Configuration
# ============================================================
GEMINI_API_KEY=AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_MAX_TOKENS=8192
GEMINI_TEMPERATURE=0.7

# ============================================================
# Rate Limiting Configuration
# ============================================================
# Anonymous users (by IP)
RATE_LIMIT_ANONYMOUS_MAX=5
RATE_LIMIT_ANONYMOUS_WINDOW=3600000  # 1 hour in milliseconds

# Authenticated users
RATE_LIMIT_AUTHENTICATED_MAX=20
RATE_LIMIT_AUTHENTICATED_WINDOW=3600000

# ============================================================
# Git Operations Configuration
# ============================================================
GIT_CLONE_TIMEOUT=300000  # 5 minutes
GIT_MAX_REPO_SIZE=524288000  # 500MB in bytes
```

**Getting your credentials:**

- **Firebase**: [Firebase Console](https://console.firebase.google.com/) → Project Settings
- **Gemini API Key**: [Google AI Studio](https://makersuite.google.com/app/apikey)

For complete configuration reference, see [docs/CONFIGURATION.md](./docs/CONFIGURATION.md).

---

## 🏗️ 系統架構概述

### Architecture Overview

The system follows a **serverless architecture** with clear separation between client and server layers:

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│                      (Browser - Read-Only)                       │
│                                                                  │
│  Next.js Pages → Firebase Auth → Firestore (Read-Only)          │
│                                        ↓                         │
│                              Real-time Updates                   │
│                                        ↓                         │
│                              API Calls (Write)                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│                          SERVER LAYER                            │
│                   (Next.js API Routes - VM)                      │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  POST /scan  │  │ POST /auth/  │  │ GET /health  │          │
│  │              │  │  sync-user   │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                  │
│         └─────────────────┴─────────────────┘                  │
│                           ↓                                     │
│         ┌──────────────────────────────────┐                    │
│         │    Server-side Services          │                    │
│         │  - Rate Limiter                  │                    │
│         │  - Firebase Admin SDK            │                    │
│         │  - Scan Queue Manager            │                    │
│         │  - Git Handler                   │                    │
│         │  - Repository Analyzer           │                    │
│         └──────────────┬───────────────────┘                    │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Firebase   │  │  Firestore   │  │    Gemini    │          │
│  │     Auth     │  │ (Database)   │  │  AI Service  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

### Key Components

#### Client Layer

- **Pages**: Next.js 15 App Router with Server Components
- **Authentication**: Firebase Auth with Google sign-in via AuthContext
- **Data Access**: Read-only Firestore queries with real-time listeners
- **UI**: shadcn/ui components with Tailwind CSS

#### Server Layer

- **API Routes**: Next.js API routes handling all write operations
  - `POST /api/scan`: Submit repository for analysis
  - `POST /api/auth/sync-user`: Synchronize user authentication state
  - `GET /api/health`: Health check endpoint
- **Services**:
  - **Rate Limiter**: IP and user-based quota enforcement
  - **Git Handler**: Repository cloning and file operations
  - **Repository Analyzer**: Code structure analysis and metadata extraction
  - **Scan Queue**: Asynchronous job processing with automatic cleanup
  - **Gemini Service**: AI-powered code analysis with retry logic

#### Data Layer

- **Firestore Collections**:
  - `users`: User profiles and quota information
  - `scans`: Scan requests and results
  - `rateLimits`: Rate limiting state per IP/user

### Data Flow

1. **User Submits Repository URL**:
   - Client sends POST to `/api/scan`
   - Server validates URL and checks rate limits
   - Creates scan document in Firestore with status `queued`

2. **Background Processing**:
   - Scan Queue picks up the job
   - Git Handler clones repository
   - Repository Analyzer extracts metadata
   - Gemini Service performs AI analysis
   - Updates scan document with status `completed` or `failed`

3. **Real-time Updates**:
   - Client subscribes to scan document via Firestore listener
   - Receives live status updates
   - Displays results when analysis completes

4. **Error Handling**:
   - Typed error codes (`ErrorCode`) for all failure scenarios
   - Automatic quota refund on errors
   - User-friendly error messages with actionable guidance

For detailed architecture documentation, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## 🛠️ 技術選擇與理由

### Frontend

#### Next.js 15 (App Router)

**Why:**

- **Server Components**: Reduces client-side JavaScript, improves performance
- **Built-in Routing**: File-based routing with dynamic routes
- **API Routes**: Co-located backend with frontend code
- **Optimizations**: Automatic code splitting, image optimization, and caching

**Alternatives Considered:**

- Create React App (too basic, no SSR)
- Remix (less mature ecosystem)
- Vite + React Router (requires more setup)

#### React 19

**Why:**

- **Latest Features**: Enhanced Server Components and Suspense
- **Performance**: Better hydration and rendering performance
- **Developer Experience**: Improved error handling and debugging

#### TypeScript 5

**Why:**

- **Type Safety**: Catches errors at compile time
- **IntelliSense**: Better IDE autocomplete and documentation
- **Refactoring**: Safer code changes with type checking
- **Team Collaboration**: Self-documenting code

#### Tailwind CSS + shadcn/ui

**Why:**

- **Utility-First**: Rapid UI development without CSS files
- **Consistency**: Design system with standardized spacing and colors
- **Components**: Pre-built, accessible UI components
- **Customization**: Easy theming and component variants

**Alternatives Considered:**

- Material-UI (heavier bundle, less flexible)
- Chakra UI (good but less customizable)
- Plain CSS Modules (too much boilerplate)

### Backend

#### Firebase Authentication

**Why:**

- **Built-in Providers**: Google OAuth with minimal setup
- **Security**: Token-based authentication with automatic refresh
- **Integration**: Seamless Firestore security rules integration
- **Scalability**: Handles millions of users out-of-the-box

**Alternatives Considered:**

- NextAuth.js (requires database setup)
- Auth0 (paid service, overkill)
- Custom JWT (too much maintenance)

#### Firestore Database

**Why:**

- **Real-time**: Live updates without polling or WebSockets
- **Serverless**: No database server to manage
- **Security**: Row-level access control with security rules
- **Scalability**: Automatic scaling with usage
- **Offline Support**: Client-side caching and offline mode

**Alternatives Considered:**

- PostgreSQL (requires server management)
- MongoDB (no built-in real-time updates)
- Supabase (good but less real-time features)

#### Google Gemini 2.0 Flash

**Why:**

- **Latest Model**: State-of-the-art code understanding
- **Speed**: Fast inference for real-time analysis
- **Context Window**: Large context for analyzing entire repositories
- **Structured Output**: JSON schema validation with Zod
- **Cost-Effective**: Generous free tier

**Alternatives Considered:**

- OpenAI GPT-4 (more expensive, slower)
- Anthropic Claude (limited free tier)
- Open-source models (requires GPU infrastructure)

#### Node.js Git Operations

**Why:**

- **Native Integration**: Direct git commands via child_process
- **Performance**: Faster than JS-based git implementations
- **Compatibility**: Works with any Git repository
- **Reliability**: Battle-tested git client

**Alternatives Considered:**

- isomorphic-git (slower, memory-intensive)
- GitHub API (requires authentication, rate limits)

### Infrastructure

#### PM2 Process Manager

**Why:**

- **Zero-Downtime Deploys**: Rolling updates with cluster mode
- **Auto-Restart**: Automatic recovery from crashes
- **Monitoring**: Built-in logs and metrics
- **Clustering**: Multi-core CPU utilization
- **Easy Setup**: Simple configuration file

**Alternatives Considered:**

- Docker + Kubernetes (overkill for single VM)
- systemd (less features, harder to debug)
- Vercel (serverless, cold starts, cost)

#### Nginx Reverse Proxy

**Why:**

- **Performance**: Efficient static file serving and caching
- **Security**: SSL termination, DDoS protection
- **Flexibility**: Advanced routing and load balancing
- **Battle-Tested**: Industry standard for production

**Alternatives Considered:**

- Caddy (automatic SSL but less mature)
- Apache (slower, more complex config)
- Traefik (overkill for single VM)

#### Ubuntu Server LTS

**Why:**

- **Stability**: Long-term support with security updates
- **Documentation**: Extensive community resources
- **Package Management**: apt for easy software installation
- **Performance**: Optimized for server workloads

**Alternatives Considered:**

- Debian (less up-to-date packages)
- CentOS (Red Hat discontinued it)
- Alpine (minimal but harder to debug)

For complete technology documentation, see [docs/TECHNOLOGY_STACK.md](./docs/TECHNOLOGY_STACK.md).

---

## 🚀 部署指南

This guide covers deploying the application on a **single VM** with Ubuntu, Nginx, and PM2.

### VM Deployment (Ubuntu)

#### 1. Provision VM

**Recommended Specifications:**

- **OS**: Ubuntu 22.04 LTS or 24.04 LTS
- **CPU**: 2+ cores
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 50GB SSD
- **Network**: Public IP with SSH access

**Cloud Providers:**

- Google Cloud Platform (Compute Engine)
- AWS (EC2)
- DigitalOcean (Droplets)
- Linode
- Hetzner

#### 2. Initial Server Setup

SSH into your VM and run the automated setup script:

```bash
# Download setup script
curl -fsSL https://raw.githubusercontent.com/yourusername/Git-Repository-Analysis-System/main/scripts/setup-vm.sh -o setup-vm.sh

# Make executable
chmod +x setup-vm.sh

# Run as root
sudo ./setup-vm.sh
```

**Or manually:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
sudo npm install -g pnpm

# Install Git
sudo apt install -y git

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo pnpm install -g pm2

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

#### 3. Clone and Build Application

```bash
# Create app directory
sudo mkdir -p /var/www/git-analyzer
sudo chown $USER:$USER /var/www/git-analyzer

# Clone repository
cd /var/www/git-analyzer
git clone https://github.com/yourusername/Git-Repository-Analysis-System.git .

# Install dependencies
pnpm install

# Copy environment file
cp .env.production .env.local

# Edit environment variables
nano .env.local
```

**Production Environment Variables:**

```bash
# Set production URLs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Use production Firebase project
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-prod-project

# Same Gemini and rate limit settings
```

```bash
# Copy service account file
sudo nano service-account-file.json
# Paste your production service account JSON

# Set correct permissions
chmod 600 service-account-file.json

# Build application
pnpm build
```

#### 4. Configure PM2

The project includes an `ecosystem.config.js` for PM2:

```javascript
module.exports = {
  apps: [
    {
      name: "git-analyzer",
      script: "pnpm",
      args: "start",
      cwd: "/var/www/git-analyzer",
      instances: 2, // Number of CPU cores
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
}
```

**Start the application:**

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status

# View logs
pm2 logs git-analyzer

# Monitor
pm2 monit
```

#### 5. Configure Nginx

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/git-analyzer
```

**Configuration:**

```nginx
upstream git_analyzer {
    server localhost:3000;
    keepalive 64;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL certificates (will be configured with Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/your-domain.com/chain.pem;

    # SSL optimization
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Next.js
    location / {
        proxy_pass http://git_analyzer;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # Cache static assets
    location /_next/static {
        proxy_pass http://git_analyzer;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    # Disable cache for API routes
    location /api {
        proxy_pass http://git_analyzer;
        proxy_cache_bypass 1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Logs
    access_log /var/log/nginx/git-analyzer-access.log;
    error_log /var/log/nginx/git-analyzer-error.log;
}
```

**Enable site:**

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/git-analyzer /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### DNS & SSL Setup

#### 1. Configure DNS

Point your domain to your VM's public IP:

```
A Record:     your-domain.com     →  YOUR_VM_IP
A Record:     www.your-domain.com →  YOUR_VM_IP
```

#### 2. Install SSL Certificate with Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

Certbot will automatically:

- Obtain SSL certificate from Let's Encrypt
- Configure Nginx with SSL
- Set up automatic renewal (runs twice daily)

#### 3. Update Firebase Configuration

In Firebase Console:

1. **Authentication** → **Settings** → **Authorized domains**
   - Add `your-domain.com`

2. **Firestore** → **Rules**
   - Update if you have domain-specific rules

### Monitoring

#### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# CPU and memory usage
pm2 status

# Logs
pm2 logs git-analyzer --lines 100

# Restart on high memory
pm2 restart git-analyzer
```

#### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/git-analyzer-access.log

# Error logs
sudo tail -f /var/log/nginx/git-analyzer-error.log

# Analyze traffic
sudo cat /var/log/nginx/git-analyzer-access.log | grep "POST /api/scan" | wc -l
```

#### System Monitoring

```bash
# Disk usage
df -h

# Memory usage
free -h

# CPU and processes
htop

# Check for updates
sudo apt update && sudo apt list --upgradable
```

### Deployment Updates

When you push changes to the repository:

```bash
cd /var/www/git-analyzer

# Pull latest changes
git pull origin main

# Install new dependencies (if any)
pnpm install

# Rebuild application
pnpm build

# Reload PM2 (zero downtime)
pm2 reload ecosystem.config.js

# Verify
pm2 logs git-analyzer --lines 50
```

### Backup Strategy

**Database**: Firestore automatically backs up your data. You can also export:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Export Firestore
firebase firestore:export gs://your-bucket/backups/$(date +%Y%m%d)
```

**Application Code**: Regularly commit and push to Git.

**Environment Files**: Store securely (not in Git):

```bash
# Backup .env.local
cp .env.local .env.local.backup.$(date +%Y%m%d)

# Backup service account
cp service-account-file.json service-account-file.json.backup.$(date +%Y%m%d)
```

For complete deployment documentation, see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

---

## 📚 Documentation

- **[Getting Started](./docs/GETTING_STARTED.md)** - Quick start guide for local development
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and data flow
- **[Configuration](./docs/CONFIGURATION.md)** - Environment variables and settings
- **[Technology Stack](./docs/TECHNOLOGY_STACK.md)** - Technologies and rationale
- **[Deployment](./docs/DEPLOYMENT.md)** - Production deployment guide
- **[Contributing](./docs/CONTRIBUTING.md)** - How to contribute to the project

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🤝 Support

If you have any questions or need help:

- **Issues**: [GitHub Issues](https://github.com/yourusername/Git-Repository-Analysis-System/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/Git-Repository-Analysis-System/discussions)

---

**Built with ❤️ using Next.js, Firebase, and Google Gemini**
