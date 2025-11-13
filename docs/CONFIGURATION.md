# Configuration Guide

Comprehensive reference for all **environment variables** and **configuration options** in the **Git Repository Analysis System**.

## Overview

This document provides a detailed explanation of all configuration variables and options required to run the Git Repository Analysis System in both development and production environments.

It includes:

- Firebase client and server setup
- Gemini API configuration
- Application rate limits and Git operation parameters
- PM2 runtime configuration

---

## Environment Variables

All environment variables are defined in `.env.local` for local development or in your server environment for production.

---

### Firebase Configuration

Firebase is used for **authentication**, **data storage**, and **user management**.

---

#### Client (Public)

These variables are embedded in the client-side bundle and are **safe to expose**:

```bash
# Firebase Web App Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

**How to obtain:**

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Select your project → ⚙️ **Project settings**.
3. Under **Your apps**, select or create a Web App.
4. Copy the configuration snippet.

---

#### Admin (Server-side)

Used by backend services for secure access to Firestore and authentication.
**Do not expose these values publicly.**

```bash
# Path to the Firebase service account JSON file
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account-file.json

# OR (less secure, for testing only)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

**Generate a service account key:**

1. Go to **Project settings → Service accounts** in Firebase Console.
2. Click **Generate new private key**.
3. Save it as `service-account-file.json`.
4. Store it securely and **never commit it to version control**.

---

### 🤖 Gemini API Configuration

Used for AI-powered repository analysis.

```bash
# API Key (Required)
GEMINI_API_KEY=AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
```

**Get your Gemini API key:**

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey).
2. Sign in → **Get API Key** → copy and store securely.

---

#### Model and Behavior Settings

```bash
# Model selection
GEMINI_MODEL=gemini-2.5-flash
# Options:
# - gemini-2.5-flash  (recommended)
# - gemini-2.5-pro    (higher quality, more expensive)
# - gemini-1.5-flash  (fast, balanced)
# - gemini-1.5-pro    (best quality, slower)

# Generation settings
GEMINI_TEMPERATURE=0.7            # Creativity level (0.0–1.0)
GEMINI_MAX_OUTPUT_TOKENS=8192     # Max tokens per response

# Retry policy
GEMINI_MAX_RETRIES=3
GEMINI_RETRY_DELAY_SECONDS=60
```

**Guidelines for `GEMINI_TEMPERATURE`:**

| Mode          | Range   | Description                        |
| ------------- | ------- | ---------------------------------- |
| Deterministic | 0.0–0.3 | For factual and structured outputs |
| Balanced      | 0.4–0.7 | Recommended default                |
| Creative      | 0.8–1.0 | For varied or descriptive results  |

---

### ⏱Rate Limiting

Control API access frequency to prevent abuse.

```bash
# Anonymous users
NEXT_PUBLIC_RATE_LIMIT_ANONYMOUS_MAX_REQUESTS=3
NEXT_PUBLIC_RATE_LIMIT_ANONYMOUS_WINDOW_HOURS=1

# Authenticated users
NEXT_PUBLIC_RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS=20
NEXT_PUBLIC_RATE_LIMIT_AUTHENTICATED_WINDOW_HOURS=1
```

---

### Git Operations

Configure repository cloning and analysis limits.

```bash
# Timeout for Git clone (seconds)
GIT_CLONE_TIMEOUT=300

# Maximum repository size (MB)
MAX_REPO_SIZE_MB=500

# Shallow clone depth
GIT_CLONE_DEPTH=1
```

---

## PM2 Configuration

**File:** `ecosystem.config.js`

PM2 manages process scaling and uptime for production deployments.

```javascript
module.exports = {
  apps: [
    {
      name: "git-repo-analyzer",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./",
      instances: 2,
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
}
```

**Notes:**

- Runs in **cluster mode** for multi-core performance.
- Logs are stored in `./logs`.
- Auto-restart ensures resilience and uptime.

---

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Google AI Documentation](https://ai.google.dev/docs)
- [PM2 Documentation](https://pm2.keymetrics.io/docs)
