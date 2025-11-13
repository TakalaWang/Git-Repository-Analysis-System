# Git Repository Analysis System# Git Repository Analysis System

An AI-powered platform for automated Git repository analysis, providing intelligent insights into code structure, technology stack, and developer skill requirements. Built with Next.js 15, Firebase, and Google Gemini AI.A Next.js 15 TypeScript application for analyzing Git repositories with Firebase integration and AI-powered insights.

![License](https://img.shields.io/badge/license-MIT-blue.svg)## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-15-black)

![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)- **Framework**: Next.js 15 (App Router)

![Firebase](https://img.shields.io/badge/Firebase-10-orange)- **Language**: TypeScript

- **Styling**: TailwindCSS v4 + Shadcn/UI

## 🌟 Features- **Backend**: Firebase (Auth, Firestore, Hosting)

- **AI Integration**: Gemini API

- **🤖 AI-Powered Analysis**: Leverages Google Gemini AI for intelligent code comprehension- **Code Quality**: ESLint + Prettier

- **📊 Comprehensive Reports**: - **CI/CD**: GitHub Actions
  - Technology stack detection and categorization

  - Code quality assessment## Getting Started

  - Architecture evaluation

  - Developer skill level estimation### Prerequisites

- **⚡ Smart Caching**: Commit-hash based caching prevents redundant analysis

- **🔐 Authentication**: GitHub OAuth integration with anonymous user support- Node.js 20 or higher

- **📈 Rate Limiting**: Tiered rate limits (3/hour anonymous, 20/hour authenticated)- pnpm or yarn

- **💾 Real-time Updates**: Firestore-powered live status tracking- Firebase project

- **🎨 Modern UI**: Responsive design with shadcn/ui components- Gemini API key

- **📱 Mobile-First**: Fully responsive across all devices

### Installation

## 📋 Table of Contents

1. Clone the repository:

- [Quick Start](#-quick-start)

- [System Architecture](#-system-architecture)```bash

- [Technology Stack](#-technology-stack)git clone https://github.com/TakalaWang/Git-Repository-Analysis-System.git

- [Installation](#-installation)cd Git-Repository-Analysis-System

- [Configuration](#-configuration)```

- [Development](#-development)

- [Deployment](#-deployment)2. Install dependencies:

- [API Reference](#-api-reference)

- [Project Structure](#-project-structure)```bash

- [Contributing](#-contributing)pnpm install

````

## 🚀 Quick Start

3. Set up environment variables:

```bash

# Clone the repository```bash

git clone https://github.com/TakalaWang/Git-Repository-Analysis-System.gitcp .env.example .env.local

cd Git-Repository-Analysis-System```



# Install dependenciesEdit `.env.local` with your Firebase and Gemini API credentials.

pnpm install

4. Set up Firebase Admin SDK:

# Set up environment variables

cp .env.example .env.local```bash

cp service-account-file.example.json service-account-file.json

# Run development server```

pnpm dev

```Fill in `service-account-file.json` with your Firebase service account credentials or paste file to root directory.



Visit `http://localhost:3000` to see the application.### Firebase Configuration



## 🏗 System Architecture1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

2. Enable Authentication with GitHub provider

### High-Level Architecture3. Create a Firestore database

4. Get your Firebase config and add to `.env.local`

````

┌─────────────────────────────────────────────────────────────────┐### Development

│ Client Layer │

│ Next.js 15 (App Router) + React 18 + TypeScript + Tailwind │Run the development server:

└─────────────────────────────────────────────────────────────────┘

                              │```bash

                              ▼pnpm dev

┌─────────────────────────────────────────────────────────────────┐```

│ API Layer (Next.js) │

│ /api/scan - Scan submission & queue management │Open [http://localhost:3000](http://localhost:3000) in your browser.

│ /api/scan/[id] - Scan status & results retrieval │

│ /api/auth/\* - Authentication handlers │### Building

└─────────────────────────────────────────────────────────────────┘

                              │Build the application for production:

                ┌─────────────┴─────────────┐

                ▼                           ▼```bash

┌───────────────────────────┐ ┌──────────────────────────┐pnpm build

│ Firebase Services │ │ Processing Queue │```

│ • Firestore (Database) │ │ • In-memory FIFO queue │

│ • Authentication │ │ • Sequential processing│## Available Scripts

│ • Real-time listeners │ │ • Status updates │

└───────────────────────────┘ └──────────────────────────┘- `pnpm  dev` - Start development server

                                            │- `pnpm build` - Build for production

                                            ▼- `pnpm start` - Start production server

                              ┌─────────────────────────┐- `pnpm lint` - Run ESLint

                              │  Analysis Pipeline      │- `pnpm format` - Format code with Prettier

                              │  1. Git clone (shallow) │- `pnpm format:check` - Check code formatting

                              │  2. File scanning       │

                              │  3. Dependency parsing  │## Environment Variables

                              │  4. Gemini AI analysis  │

                              │  5. Result storage      │The application is highly configurable through environment variables. See `.env.example` for all available options.

                              └─────────────────────────┘

````### Required Variables



### Data Flow- `NEXT_PUBLIC_FIREBASE_*` - Firebase client configuration (public)

- `GOOGLE_APPLICATION_CREDENTIALS` - Path to Firebase service account JSON

1. **Scan Submission**- `GEMINI_API_KEY` - Google Gemini API key for AI analysis

   - User submits repository URL via frontend

   - API validates URL and checks rate limits### Optional Configuration

   - Checks for cached results (repo URL + commit hash)

   - Creates Firestore document with "queued" statusAll optional variables have sensible defaults but can be customized:

   - Enqueues scan ID for processing

#### Rate Limiting

2. **Asynchronous Processing**

   - Queue processes one scan at a time- `RATE_LIMIT_ANONYMOUS_MAX_REQUESTS` - Max scans for anonymous users (default: 3)

   - Updates Firestore in real-time (queued → running → succeeded/failed)- `RATE_LIMIT_ANONYMOUS_WINDOW_HOURS` - Time window for anonymous users (default: 1)

   - Frontend subscribes to Firestore for live updates- `RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS` - Max scans for authenticated users (default: 20)

- `RATE_LIMIT_AUTHENTICATED_WINDOW_HOURS` - Time window for authenticated users (default: 1)

3. **Analysis Pipeline**

   ```#### Git Operations

   Clone Repo → Analyze Files → Parse Dependencies → AI Analysis → Store Results

   ```- `GIT_CLONE_TIMEOUT_SECONDS` - Timeout for git clone operations (default: 300)

- `GIT_MAX_REPO_SIZE_MB` - Maximum repository size to clone (default: 500)

4. **Caching Strategy**

   - Cache key: `repoUrl + commitHash + status=succeeded`#### AI Analysis (Gemini)

   - On cache hit: Copy analysis data to new scan document

   - On cache miss: Full analysis pipeline- `GEMINI_MODEL` - AI model to use (default: gemini-2.5-pro)

- `GEMINI_MAX_RETRIES` - Retry attempts on failure (default: 3)

## 🛠 Technology Stack- `GEMINI_RETRY_DELAY_SECONDS` - Delay between retries (default: 60)

- `GEMINI_TEMPERATURE` - AI response creativity (default: 0.7)

### Frontend- `GEMINI_MAX_OUTPUT_TOKENS` - Maximum response length (default: 8192)

- **Next.js 15**: React framework with App Router and Server Components

- **TypeScript**: Type-safe development### Firestore Indexes

- **Tailwind CSS**: Utility-first styling

- **shadcn/ui**: High-quality React component libraryThis application requires a composite index for efficient queries. Create it using:

- **Lucide Icons**: Icon system

```bash

### Backendfirebase deploy --only firestore:indexes

- **Next.js API Routes**: Serverless functions```

- **Firebase Admin SDK**: Server-side Firebase operations

- **Google Gemini AI**: Repository analysis and insightsOr manually create in Firebase Console:

- **Simple Git**: Git operations (clone, ls-remote)

- Collection: `scans`

### Database & Auth- Fields: `userId` (Ascending), `createdAt` (Descending)

- **Firestore**: NoSQL document database with real-time capabilities

- **Firebase Authentication**: GitHub OAuth integration## License



### InfrastructureThis project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

- **Vercel**: Hosting and deployment (recommended)
- **pnpm**: Fast, disk space efficient package manager

### Why These Technologies?

**Next.js 15**:
- Server and Client Components for optimal performance
- Built-in API routes eliminate need for separate backend
- Excellent TypeScript support and developer experience
- Automatic code splitting and optimization

**Firebase**:
- Real-time database updates perfect for live status tracking
- Generous free tier suitable for MVP
- Built-in authentication with OAuth providers
- Automatic scaling and serverless architecture

**Google Gemini AI**:
- Large context window handles entire repositories
- Structured output with JSON schema support
- Competitive pricing compared to OpenAI
- Excellent code understanding capabilities

**TypeScript**:
- Catches errors at compile time
- Excellent IDE support and autocomplete
- Self-documenting code through types
- Easier refactoring and maintenance

## 📦 Installation

### Prerequisites

- Node.js 18+
- pnpm 8+ (install via `npm install -g pnpm`)
- Firebase account
- Google Cloud account (for Gemini API)
- GitHub OAuth App (for authentication)

### Step-by-Step Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/TakalaWang/Git-Repository-Analysis-System.git
   cd Git-Repository-Analysis-System
   pnpm install
````

2. **Firebase Setup**

   a. Create a new Firebase project at https://console.firebase.google.com

   b. Enable Firestore Database:
   - Go to Firestore Database
   - Create database in production mode
   - Choose a location

   c. Enable Authentication:
   - Go to Authentication
   - Enable GitHub provider
   - Note the callback URL: `https://YOUR_PROJECT.firebaseapp.com/__/auth/handler`

   d. Get Firebase credentials:
   - Go to Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy the config object

   e. Generate service account:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `service-account-file.json` in project root

3. **GitHub OAuth Setup**

   a. Go to GitHub Settings → Developer settings → OAuth Apps

   b. Create new OAuth App:
   - Application name: Git Repository Analysis System
   - Homepage URL: `http://localhost:3000` (for development)
   - Authorization callback URL: `https://YOUR_PROJECT.firebaseapp.com/__/auth/handler`

   c. Note the Client ID and generate a Client Secret

   d. Add to Firebase:
   - Go to Firebase Console → Authentication → Sign-in method
   - Click GitHub → Enable
   - Paste Client ID and Client Secret

4. **Gemini AI Setup**

   a. Go to https://makersuite.google.com/app/apikey

   b. Create API key

   c. Note the API key for environment variables

5. **Environment Variables**

   Create `.env.local` in project root:

   ```env
   # Firebase Client (Web App Config)
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Firebase Admin (Service Account - path to JSON file)
   FIREBASE_SERVICE_ACCOUNT_PATH=./service-account-file.json

   # Google Gemini AI
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.0-flash-exp
   GEMINI_MAX_RETRIES=3
   GEMINI_RETRY_DELAY_SECONDS=60
   GEMINI_TEMPERATURE=0.7
   GEMINI_MAX_OUTPUT_TOKENS=8192

   # Rate Limiting
   RATE_LIMIT_ANONYMOUS_MAX=3
   RATE_LIMIT_ANONYMOUS_WINDOW_HOURS=1
   RATE_LIMIT_AUTHENTICATED_MAX=20
   RATE_LIMIT_AUTHENTICATED_WINDOW_HOURS=1

   # Git Configuration
   GIT_CLONE_TIMEOUT_SECONDS=300
   ```

6. **Firestore Security Rules**

   Deploy security rules:

   ```bash
   firebase deploy --only firestore:rules
   ```

7. **Firestore Indexes**

   Deploy composite indexes:

   ```bash
   firebase deploy --only firestore:indexes
   ```

## ⚙️ Configuration

### Rate Limiting

Adjust rate limits via environment variables:

```env
# Anonymous users (IP-based)
RATE_LIMIT_ANONYMOUS_MAX=3
RATE_LIMIT_ANONYMOUS_WINDOW_HOURS=1

# Authenticated users (UID-based)
RATE_LIMIT_AUTHENTICATED_MAX=20
RATE_LIMIT_AUTHENTICATED_WINDOW_HOURS=1
```

### Gemini AI Configuration

Fine-tune AI behavior:

```env
# Model selection (flash for speed, pro for quality)
GEMINI_MODEL=gemini-2.0-flash-exp

# Retry configuration for rate limit handling
GEMINI_MAX_RETRIES=3
GEMINI_RETRY_DELAY_SECONDS=60

# Generation parameters
GEMINI_TEMPERATURE=0.7  # 0.0-1.0, higher = more creative
GEMINI_MAX_OUTPUT_TOKENS=8192
```

### Git Operations

Configure Git clone behavior:

```env
# Maximum time for git clone (large repos)
GIT_CLONE_TIMEOUT_SECONDS=300

# Shallow clone depth (1 = latest commit only)
GIT_CLONE_DEPTH=1
```

## 💻 Development

### Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
pnpm build
pnpm start
```

### Type Checking

```bash
pnpm type-check
```

### Linting

```bash
pnpm lint
```

### Formatting

```bash
pnpm format
```

## 🚢 Deployment

### Vercel (Recommended)

1. **Push to GitHub**

   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables (copy from `.env.local`)
   - Deploy

3. **Update OAuth Callback**
   - Note your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
   - Update GitHub OAuth App callback URL
   - Update Firebase authorized domains

### Environment Variables on Vercel

Add all environment variables from `.env.local` to Vercel:

- Go to Project Settings → Environment Variables
- Add each variable individually
- **Important**: For `FIREBASE_SERVICE_ACCOUNT_PATH`, upload the JSON file or paste the JSON content directly

### Firebase Hosting (Alternative)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize hosting
firebase init hosting

# Build and deploy
pnpm build
firebase deploy --only hosting
```

## 📚 API Reference

### POST /api/scan

Submit a repository for analysis.

**Request Body:**

```json
{
  "repoUrl": "https://github.com/owner/repo"
}
```

**Headers:**

```
Authorization: Bearer <firebase_id_token>  // Optional
Content-Type: application/json
```

**Response (202 Accepted):**

```json
{
  "success": true,
  "scanId": "abc123",
  "status": "queued",
  "message": "Repository scan has been queued for analysis",
  "estimatedTime": "2-5 minutes"
}
```

**Error Response (429):**

```json
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded the limit of 3 scans per hour",
  "resetAt": "2024-01-01T12:00:00.000Z",
  "remaining": 0
}
```

### GET /api/scan/[id]

Retrieve scan status and results.

**Response (200 OK):**

```json
{
  "id": "abc123",
  "repoUrl": "https://github.com/owner/repo",
  "status": "succeeded",
  "description": "A modern web application...",
  "techStack": ["React", "TypeScript", "Node.js"],
  "skillLevel": "Mid-level",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "completedAt": "2024-01-01T12:03:00.000Z"
}
```

## 📁 Project Structure

```
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── api/                  # API routes
│   │   │   ├── scan/            # Scan submission & retrieval
│   │   │   └── auth/            # Authentication endpoints
│   │   ├── dashboard/           # User dashboard (authenticated)
│   │   ├── login/               # Login page
│   │   ├── scan/[id]/          # Scan result page
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # Global styles
│   ├── components/              # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   └── Header.tsx          # Navigation header
│   ├── contexts/               # React contexts
│   │   └── AuthContext.tsx    # Authentication state
│   ├── lib/                    # Shared utilities
│   │   ├── server/            # Server-side modules
│   │   │   ├── firebase-admin.ts      # Firebase Admin SDK
│   │   │   ├── gemini.ts             # Gemini AI client
│   │   │   ├── git-handler.ts        # Git operations
│   │   │   ├── rate-limiter.ts       # Rate limiting
│   │   │   ├── repository-analyzer.ts # File analysis
│   │   │   ├── scan-queue.ts         # Async queue
│   │   │   └── prompts.ts            # AI prompts
│   │   ├── client/            # Client-side modules
│   │   │   └── firebase.ts    # Firebase client SDK
│   │   ├── types.ts           # TypeScript type definitions
│   │   └── utils.ts           # Utility functions
│   └── firebase/              # Firebase configuration
│       ├── firestore.rules    # Security rules
│       └── firestore.indexes.json  # Composite indexes
├── public/                    # Static assets
├── .env.local                # Environment variables (gitignored)
├── service-account-file.json # Firebase Admin credentials (gitignored)
├── package.json              # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── next.config.ts           # Next.js configuration
└── README.md                # This file
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Firebase](https://firebase.google.com/) - Backend infrastructure
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI analysis
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework

## 📞 Support

For issues and questions:

- Open an issue on GitHub
- Contact: [your-email@example.com]

---

Built with ❤️ by [TakalaWang](https://github.com/TakalaWang)
