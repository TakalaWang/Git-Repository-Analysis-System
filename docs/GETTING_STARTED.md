# Getting Started

Quick start guide for **local development** of the **Git Repository Analysis System**.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, ensure you have the following installed on your development machine:

### Required Software

| Software    | Version        | Download Link                           | Purpose            |
| ----------- | -------------- | --------------------------------------- | ------------------ |
| **Node.js** | 20.x or higher | [nodejs.org](https://nodejs.org/)       | JavaScript runtime |
| **pnpm**    | 9.x or higher  | [pnpm.io](https://pnpm.io/installation) | Package manager    |
| **Git**     | 2.30+          | [git-scm.com](https://git-scm.com/)     | Version control    |

**Installation Commands:**

```bash
# Check if installed and verify versions
node --version   # Should show v20.x.x or higher
pnpm --version   # Should show v9.x.x or higher
git --version    # Should show v2.30.x or higher

# Install Node.js (if needed)
# macOS with Homebrew:
brew install node@20

# Install pnpm (if needed)
npm install -g pnpm

# Install Git (if needed)
# macOS with Homebrew:
brew install git
```

### Required Accounts

You'll need accounts and API keys for:

1. **Firebase Account**
   - Sign up at [console.firebase.google.com](https://console.firebase.google.com/)
   - Create a new project for development
   - Enable Authentication (GitHub provider)
   - Enable Firestore Database
2. **Google Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Create a new API key
   - Copy and save securely

---

## Installation

### 1. Clone the Repository

```bash
# Clone via HTTPS
git clone https://github.com/yourusername/Git-Repository-Analysis-System.git

# Or clone via SSH (recommended if you have SSH keys set up)
git clone git@github.com:yourusername/Git-Repository-Analysis-System.git

# Navigate into the directory
cd Git-Repository-Analysis-System

# Check branch
git branch
# Should show: * main
```

### 2. Install Dependencies

```bash
# Install all dependencies
pnpm install

# This will:
# - Install Next.js, React, and all required packages
# - Set up TypeScript
# - Install development tools (ESLint, Prettier, Jest)
# - Takes about 2-5 minutes depending on your network speed
```

**Expected output:**

```
 WARN  deprecated inflight@1.0.6
 WARN  deprecated @humanwhocodes/config-array@0.13.0
...
Packages: +xxx
++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved xxx, reused xxx, downloaded xxx, added xxx, done
```

### 3. Verify Installation

```bash
# Check that node_modules was created
ls node_modules

# Verify key dependencies
pnpm list next react firebase
```

---

## Configuration

### 1. Firebase Setup

#### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name (e.g., "git-analyzer-dev")
4. Disable Google Analytics (optional for development)
5. Click **"Create project"**

#### Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Click **"GitHub"**
5. Toggle **"Enable"**
6. Enter support email
7. Click **"Save"**

#### Enable Firestore

1. In Firebase Console, go to **Firestore Database**
2. Click **"Create database"**
3. Select **"Start in test mode"** (we'll deploy rules later)
4. Choose a location (closest to you)
5. Click **"Enable"**

#### Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **"Your apps"**
3. Click web icon (</>) to add a web app
4. Register app name (e.g., "Git Analyzer Web")
5. Copy the configuration object

```javascript
// Example configuration (yours will be different)
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456",
}
```

#### Get Service Account Key

1. In Firebase Console, go to **Project Settings → Service accounts**
2. Click **"Generate new private key"**
3. Click **"Generate key"**
4. Save the JSON file as `service-account-file.json` in the project root

**⚠️ IMPORTANT:** Never commit this file to Git! It's already in `.gitignore`.

### 2. Environment Variables

Create a `.env.local` file in the project root:

```bash
# Copy the example file
cp .env.local.example .env.local

# Edit the file
nano .env.local  # or use your preferred editor
```

**Paste your configuration:**

```bash
# ============================================================
# Firebase Client Configuration (from Firebase Console)
# ============================================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# ============================================================
# Firebase Admin SDK (from service account JSON)
# ============================================================
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account-file.json

# ============================================================
# Google Gemini API (from Google AI Studio)
# ============================================================
GEMINI_API_KEY=AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY

# Optional: Model configuration
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_MAX_TOKENS=8192
GEMINI_TEMPERATURE=0.7

# ============================================================
# Rate Limiting (Development defaults)
# ============================================================
# Anonymous users (by IP)
RATE_LIMIT_ANONYMOUS_MAX=5
RATE_LIMIT_ANONYMOUS_WINDOW=3600000  # 1 hour in milliseconds

# Authenticated users
RATE_LIMIT_AUTHENTICATED_MAX=20
RATE_LIMIT_AUTHENTICATED_WINDOW=3600000  # 1 hour in milliseconds

# ============================================================
# Git Operations (Development defaults)
# ============================================================
GIT_CLONE_TIMEOUT=300000      # 5 minutes in milliseconds
GIT_MAX_REPO_SIZE=524288000   # 500MB in bytes
```

**Save and close** the file.

### 3. Deploy Firestore Rules

```bash
# Install Firebase CLI globally
pnpm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in the project (if not already done)
firebase init

# Select:
# - Firestore: Configure security rules and indexes files
# - Use existing project
# - Select your project

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

**What this does:**

- Sets up security rules so clients can only read data (not write)
- Creates indexes for efficient queries
- Ensures production-like security in development

### 4. Verify Configuration

```bash
# Check that all files exist
ls -la .env.local service-account-file.json

# Both files should exist
# .env.local should have your environment variables
# service-account-file.json should have your Firebase credentials
```

---

## Running the Application

### Development Server

Start the development server with hot reload:

```bash
# Start Next.js development server
pnpm dev

# Expected output:
#   ▲ Next.js 15.x.x
#   - Local:        http://localhost:3000
#   - Environments: .env.local
#   - Experiments (use with caution):
#     · serverActions
#
#  ✓ Ready in 2.5s
```

**Open your browser:**

Navigate to [http://localhost:3000](http://localhost:3000)

You should see the Git Repository Analysis System home page!

### Development Features

The development server provides:

- **Hot Module Replacement (HMR)**: Changes update instantly
- **Fast Refresh**: React components update without full reload
- **Error Overlay**: Compilation errors shown in browser
- **Source Maps**: Debug original TypeScript code
- **API Routes**: Backend endpoints available at `/api/*`

### First Time Setup

1. **Sign In**: Click "Sign In" button
2. **Authorize**: Sign in with your GitHub account
3. **Test Scan**: Submit a small repository for analysis
   - Example: `https://github.com/vercel/next.js`
4. **View Results**: Watch real-time progress updates

---

## Development Workflow

### Code Organization

```
Git-Repository-Analysis-System/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── api/                # API routes
│   │   │   ├── scan/           # POST /api/scan
│   │   │   ├── auth/           # POST /api/auth/sync-user
│   │   │   └── health/         # GET /api/health
│   │   ├── dashboard/          # Dashboard page
│   │   ├── login/              # Login page
│   │   └── scan/[id]/          # Dynamic scan detail page
│   ├── components/             # React components
│   │   ├── Header.tsx          # Navigation header
│   │   ├── QuotaDisplay.tsx    # User quota display
│   │   └── ui/                 # shadcn/ui components
│   ├── contexts/               # React contexts
│   │   └── AuthContext.tsx     # Authentication state
│   └── lib/                    # Utilities and services
│       ├── types.ts            # TypeScript types
│       ├── firebase-client.ts  # Firebase client SDK
│       ├── firestore-client.ts # Firestore client helpers
│       └── server/             # Server-side only code
│           ├── firebase-admin.ts     # Firebase Admin SDK
│           ├── gemini.ts             # Gemini AI service
│           ├── git-handler.ts        # Git operations
│           ├── repository-analyzer.ts # Code analysis
│           ├── scan-queue.ts         # Background job queue
│           ├── rate-limiter.ts       # Rate limiting
│           └── errors.ts             # Custom error classes
├── firebase/                   # Firebase configuration
│   ├── firestore.rules         # Security rules
│   └── firestore.indexes.json  # Database indexes
├── docs/                       # Documentation
├── public/                     # Static assets
└── tests/                      # Test files
```

### Making Changes

#### 1. Create a New Branch

```bash
# Create and checkout a new feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

#### 2. Make Your Changes

Edit files with your preferred editor:

- **VS Code** (recommended): Excellent TypeScript support
- **WebStorm**: Great for full-stack development
- **Cursor**: AI-assisted coding

#### 3. Test Your Changes

```bash
# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Fix linting issues automatically
pnpm lint --fix

# Format code
pnpm format

# Run tests
pnpm test
```

#### 4. Commit Your Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature description"

# Or for bug fixes
git commit -m "fix: resolve issue with X"
```

#### 5. Push Changes

```bash
# Push to your branch
git push origin feature/your-feature-name

# Create pull request on GitHub
```

### Hot Reload

The development server automatically reloads when you save files:

- **Frontend changes** (pages, components): Instant hot reload
- **API routes**: Require manual page refresh
- **Environment variables**: Require server restart
- **Configuration files**: Require server restart

**Restart server:**

```bash
# Stop server: Ctrl+C
# Start again: pnpm dev
```

---

## Testing

### Run All Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (re-run on changes)
pnpm test --watch

# Run tests with coverage
pnpm test --coverage

# Run specific test file
pnpm test src/lib/__tests__/types.unit.test.ts
```

### Test Structure

```
src/
├── app/api/__tests__/           # API route tests
│   └── scan.api.test.ts         # Test /api/scan endpoint
├── lib/__tests__/               # Library tests
│   ├── types.unit.test.ts       # Type utilities tests
│   └── error-messages.test.ts   # Error message tests
└── lib/server/__tests__/        # Server-side tests
    ├── errors.test.ts           # Error class tests
    ├── git-handler.test.ts      # Git operations tests
    ├── rate-limiter.unit.test.ts # Rate limiter tests
    └── repository-analyzer.test.ts # Analyzer tests
```

---

## Project Structure

### Key Files

| File                  | Purpose                       |
| --------------------- | ----------------------------- |
| `next.config.ts`      | Next.js configuration         |
| `tsconfig.json`       | TypeScript configuration      |
| `tailwind.config.ts`  | Tailwind CSS configuration    |
| `jest.config.ts`      | Jest testing configuration    |
| `eslint.config.mjs`   | ESLint linting rules          |
| `ecosystem.config.js` | PM2 process manager config    |
| `firebase.json`       | Firebase configuration        |
| `.env.local`          | Environment variables (local) |
| `.env.local.example`  | Environment template          |

### Important Directories

| Directory         | Purpose                      | Notes                      |
| ----------------- | ---------------------------- | -------------------------- |
| `src/app/`        | Next.js pages and API routes | App Router structure       |
| `src/components/` | Reusable React components    | Client-side UI             |
| `src/lib/`        | Utilities and services       | Shared code                |
| `src/lib/server/` | Server-side only code        | Not bundled for client     |
| `firebase/`       | Firestore rules and indexes  | Deployed to Firebase       |
| `docs/`           | Documentation                | Architecture, guides, etc. |
| `public/`         | Static assets                | Served directly            |

---

## Common Tasks

### Add a New Page

```bash
# Create new page file
mkdir -p src/app/new-page
touch src/app/new-page/page.tsx
```

```tsx
// src/app/new-page/page.tsx
export default function NewPage() {
  return (
    <div>
      <h1>New Page</h1>
      <p>This is a new page!</p>
    </div>
  )
}
```

Access at: `http://localhost:3000/new-page`

### Add a New API Route

```bash
# Create new API route
mkdir -p src/app/api/my-endpoint
touch src/app/api/my-endpoint/route.ts
```

```typescript
// src/app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Hello from API!" })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ received: body })
}
```

Access at: `http://localhost:3000/api/my-endpoint`

### Add a New Component

```bash
# Create new component
touch src/components/MyComponent.tsx
```

```tsx
// src/components/MyComponent.tsx
interface MyComponentProps {
  title: string
  children?: React.ReactNode
}

export default function MyComponent({ title, children }: MyComponentProps) {
  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </div>
  )
}
```

Use in pages:

```tsx
import MyComponent from "@/components/MyComponent"

export default function Page() {
  return <MyComponent title="Hello">Content here</MyComponent>
}
```

### Update Firestore Rules

```bash
# Edit rules
nano firebase/firestore.rules

# Deploy updated rules
firebase deploy --only firestore:rules
```

### Add Environment Variable

1. Add to `.env.local`:

   ```bash
   MY_NEW_VAR=value
   ```

2. Add to `.env.local.example` (without value):

   ```bash
   MY_NEW_VAR=
   ```

3. Use in code:

   ```typescript
   // Client-side (must start with NEXT_PUBLIC_)
   const publicVar = process.env.NEXT_PUBLIC_MY_VAR

   // Server-side only
   const serverVar = process.env.MY_NEW_VAR
   ```

4. Restart dev server

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
pnpm dev -- -p 3001
```

### Firebase Authentication Not Working

**Check:**

1. Firebase project ID matches in `.env.local`
2. GitHub auth provider is enabled in Firebase Console
3. Authorized domains include `localhost` (should be by default)

**Test Firebase connection:**

```bash
# In browser console (on your site)
firebase.auth().currentUser
# Should show user object or null
```

### Firestore Permission Denied

**Possible causes:**

1. Firestore rules not deployed: `firebase deploy --only firestore:rules`
2. User not authenticated: Check if signed in
3. Wrong project: Verify `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

**Check Firestore rules:**

```javascript
// firebase/firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read for authenticated users
    match /scans/{scanId} {
      allow read: if request.auth != null;
      allow write: if false;  // Only server can write
    }
  }
}
```

### Gemini API Errors

**Check:**

1. API key is correct in `.env.local`
2. API key has quota remaining
3. Check [Google AI Studio](https://makersuite.google.com/app/apikey) for usage

**Test API key:**

```bash
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_API_KEY"
```

### TypeScript Errors

```bash
# Rebuild TypeScript
pnpm type-check

# Check for common issues
pnpm lint

# Restart VS Code TypeScript server
# In VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
pnpm dev
```

### Hot Reload Not Working

```bash
# Restart dev server
# Ctrl+C to stop
pnpm dev

# If still not working, clear cache
rm -rf .next
pnpm dev
```

---

## Next Steps

Now that you have the application running locally:

1. **Explore the Code**: Familiarize yourself with the project structure
2. **Read Documentation**:
   - [Architecture](./ARCHITECTURE.md) - System design
   - [Configuration](./CONFIGURATION.md) - Detailed config guide
   - [Technology Stack](./TECHNOLOGY_STACK.md) - Tech choices
3. **Make Changes**: Try adding a feature or fixing a bug
4. **Run Tests**: Ensure your changes don't break existing functionality
5. **Deploy**: When ready, see [Deployment Guide](./DEPLOYMENT.md)

---

## Useful Commands Reference

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm lint --fix       # Fix linting issues
pnpm format           # Format code with Prettier
pnpm type-check       # Check TypeScript types

# Testing
pnpm test             # Run all tests
pnpm test --watch     # Run tests in watch mode
pnpm test --coverage  # Run tests with coverage

# Firebase
firebase login        # Login to Firebase
firebase deploy       # Deploy all
firebase deploy --only firestore:rules  # Deploy rules only
firebase deploy --only firestore:indexes  # Deploy indexes only

# Git
git status            # Check status
git add .             # Stage all changes
git commit -m "msg"   # Commit changes
git push              # Push to remote
git pull              # Pull latest changes

# Package Management
pnpm install          # Install dependencies
pnpm add <package>    # Add dependency
pnpm remove <package> # Remove dependency
pnpm update           # Update dependencies
```

---

## Getting Help

If you encounter issues:

1. **Check Documentation**: Review relevant docs in `/docs` directory
2. **Search Issues**: Check if someone else had the same problem
3. **Ask Questions**: Create a discussion or issue on GitHub
4. **Read Logs**: Check browser console and terminal output for errors

---

**Happy Coding! 🚀**

You're now ready to start developing the Git Repository Analysis System locally.
