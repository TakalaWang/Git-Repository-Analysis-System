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

See `.env.example` for required environment variables.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
