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

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── scan/          # API route for repository scanning
│   │   ├── login/             # Authentication page
│   │   ├── dashboard/         # Main dashboard
│   │   ├── submit/            # Repository submission form
│   │   └── ...
│   ├── components/
│   │   └── ui/                # Shadcn UI components
│   └── lib/
│       ├── firebase.ts        # Firebase client config
│       └── firebase/
│           └── admin.ts       # Firebase Admin SDK
├── .github/
│   └── workflows/
│       └── firebase-deploy.yml # CI/CD pipeline
└── ...
```

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
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
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Firebase and Gemini API credentials.

### Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with GitHub provider
3. Create a Firestore database
4. Get your Firebase config and add to `.env.local`
5. Update `.firebaserc` with your project ID

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building

Build the application for production:

```bash
npm run build
```

### Deployment

The application is automatically deployed to Firebase Hosting via GitHub Actions when pushing to the `main` branch.

#### Manual Deployment

1. Install Firebase CLI:

```bash
npm install -g firebase-tools
```

2. Login to Firebase:

```bash
firebase login
```

3. Build and deploy:

```bash
npm run build
firebase deploy
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Features (To Be Implemented)

- GitHub OAuth authentication
- Repository URL submission
- Repository analysis using Gemini AI
- Dashboard with analysis results
- User data persistence in Firestore

## Environment Variables

See `.env.example` for required environment variables.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
