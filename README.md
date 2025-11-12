# Git Repository Analysis System

A Next.js 15 TypeScript application for analyzing Git repositories with Firebase integration and AI-powered insights.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS v4 + Shadcn/UI
- **Backend**: Firebase (Auth, Firestore, Hosting)
- **AI Integration**: Gemini API
- **Code Quality**: ESLint + Prettier
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 20 or higher
- pnpm or yarn
- Firebase project
- Gemini API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/TakalaWang/Git-Repository-Analysis-System.git
cd Git-Repository-Analysis-System
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Firebase and Gemini API credentials.

4. Set up Firebase Admin SDK:

```bash
cp service-account-file.example.json service-account-file.json
```

Fill in `service-account-file.json` with your Firebase service account credentials or paste file to root directory.

### Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with GitHub provider
3. Create a Firestore database
4. Get your Firebase config and add to `.env.local`

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building

Build the application for production:

```bash
pnpm build
```

## Available Scripts

- `pnpm  dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting

## Environment Variables

The application is highly configurable through environment variables. See `.env.example` for all available options.

### Required Variables

- `NEXT_PUBLIC_FIREBASE_*` - Firebase client configuration (public)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to Firebase service account JSON
- `GEMINI_API_KEY` - Google Gemini API key for AI analysis

### Optional Configuration

All optional variables have sensible defaults but can be customized:

#### Rate Limiting

- `RATE_LIMIT_ANONYMOUS_MAX_REQUESTS` - Max scans for anonymous users (default: 3)
- `RATE_LIMIT_ANONYMOUS_WINDOW_HOURS` - Time window for anonymous users (default: 1)
- `RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS` - Max scans for authenticated users (default: 20)
- `RATE_LIMIT_AUTHENTICATED_WINDOW_HOURS` - Time window for authenticated users (default: 1)

#### Git Operations

- `GIT_CLONE_TIMEOUT_SECONDS` - Timeout for git clone operations (default: 300)
- `GIT_MAX_REPO_SIZE_MB` - Maximum repository size to clone (default: 500)

#### AI Analysis (Gemini)

- `GEMINI_MODEL` - AI model to use (default: gemini-2.5-pro)
- `GEMINI_MAX_RETRIES` - Retry attempts on failure (default: 3)
- `GEMINI_RETRY_DELAY_SECONDS` - Delay between retries (default: 60)
- `GEMINI_TEMPERATURE` - AI response creativity (default: 0.7)
- `GEMINI_MAX_OUTPUT_TOKENS` - Maximum response length (default: 8192)

### Firestore Indexes

This application requires a composite index for efficient queries. Create it using:

```bash
firebase deploy --only firestore:indexes
```

Or manually create in Firebase Console:

- Collection: `scans`
- Fields: `userId` (Ascending), `createdAt` (Descending)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
