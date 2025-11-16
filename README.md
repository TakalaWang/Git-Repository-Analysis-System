# Git Repository Analysis System

> AI-powered Git repository analysis platform built with Next.js, Firebase, and Google Gemini.

A full-stack web application that analyzes Git repositories using AI to provide insights about code structure, architecture, technologies, and best practices.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin-orange)](https://firebase.google.com/)
[![Gemini](https://img.shields.io/badge/Google-Gemini-blue)](https://ai.google.dev/)

---

## 📋 Table of Contents

- [Features](#-features)
- [Setup instructions](#-setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
  - [Environment Variables](#environment-variables)
- [Architecture Overview](#-architecture-overview)
  - [Architecture Diagram](#architecture-diagram)
  - [Key Components](#key-components)
  - [Data Flow](#data-flow)
- [Technology choices and rationale](#-technology-choices-and-rationale)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [CI/CD](#ci-cd)
- [Deployment Guide](#deployment-guide)
  - [Server Setup](#server-setup)
  - [CI/CD GitHub Action Setup](#cicd-github-action-setup)
- [License](#-license)
- [Acknowledgement](#-acknowledgement)

---

## ✨ Features

- 🤖 **AI-Powered Analysis**: Uses Google Gemini to analyze repository structure, architecture, and code quality
- 🔍 **Repository Insights**: Automatic detection of languages, frameworks, dependencies, and project structure
- 📊 **Real-time Progress**: Live scan status updates via Firestore listeners
- 🗓️ **Project Timeline**: AI-driven analysis of Git history to identify major milestones and changes with interactive ECharts visualization
- 🛡️ **Security**: Malicious content detection, rate limiting, and authenticated scanning
- 👥 **User Authentication**: Firebase Auth with Google sign-in
- ⚡ **Async Processing**: Background job queue for handling analysis tasks
- 🎨 **Modern UI**: Beautiful shadcn/ui components with Tailwind CSS, EChart gives you wonderful visualization.

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

   s

5. **Run Development Server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# ============================================================
# Firebase Client Configuration
# ============================================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Path to Firebase Admin SDK Service Account Key (Server-side only)
FIREBASE_SERVICE_ACCOUNT_JSON_PATH=service-account-file.json

# GENAI API Key (Server-side only)
GENAI_API_KEY=eyJH...
```

For more details on each variable, refer to the [.env.example](.env.example) file.

**Getting your credentials:**

- **Firebase**: [Firebase Console](https://console.firebase.google.com/) → Project Settings
- **Gemini API Key**: [Google AI Studio](https://makersuite.google.com/app/apikey)

---

## 🏗️ Architecture Overview

### Architecture Diagram

The system follows a **serverless architecture** with clear separation between client and server layers:

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │    Login   │  │    Home    │  │ Dashboard  │  │ Scan/[id]  │  │
│  │    Page    │  │    Page    │  │    Page    │  │    Page    │  │
│  └─────┬────┬─┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  │
│        │    │          │               │               │         │
│        │    └──────────┴───────┬───────┴────────┬──────┘         │
│        │                   READ│                │                │
│┌───────▼───────┐     ┌─────────▼────────┐       │                │
││  AuthContext  │     │Firestore Database│       │                │
││(React Context)│     │   (READ-ONLY)    │       │                │
│└───────┬───────┘     └──────────────────┘       │                │
│        │               REAL-TIME UPDATES        │                │
│   Auth │                                        │                │
│        │                                        │                │
│   ┌────▼─────┐                             ┌────▼─────┐          │
│   │ Firebase │                             |   API    │          │
│   │   Auth   │                             │  Calls   │          │
│   └──────────┘                             └────┬─────┘          │
│                                                 │ WRITE          │
└─────────────────────────────────────────────────┼────────────────┘
                                                  │
                                                  │
┌─────────────────────────────────────────────────▼────────────────┐
│                          SERVER LAYER                            │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │                    Next.js API Routes                   │    │
│   │  ┌────────────┐  ┌──────────────────┐  ┌────────────┐   │    │
│   │  │ POST /scan │  │ POST /auth/sync- │  │ GET /health│   │    │
│   │  │            │  │ user             │  │            │   │    │
│   │  └─────┬──────┘  └─────────┬────────┘  └─────┬──────┘   │    │
│   └────────┼───────────────────┼─────────────────┼──────────┘    │
│            │                   │                 │               │
│   ┌────────▼───────────────────▼─────────────────▼──────────┐    │
│   │                  Server-side Services                   │    │
│   │    ┌────────────┐   ┌────────────┐   ┌────────────┐     │    │
│   │    │  Firebase  │   │    Rate    │   │    IP      │     │    │
│   │    │   Admin    │   │  Limiter   │   │   Utils    │     │    │
│   │    └─────┬──────┘   └─────┬──────┘   └─────┬──────┘     │    │
│   │          │                │                │            │    │
│   │    ┌─────▼────────────────▼────────────────▼───────┐    │    │
│   │    │              Scan Queue Manager               │    │    │
│   │    │  - Queue processing                           │    │    │
│   │    │  - Job scheduling                             │    │    │
│   │    │  - Error handling                             │    │    │
│   │    └──────┬───────────────────────────────┬────────┘    │    │
│   └───────────┼───────────────────────────────┼─────────────┘    │
│               │                               │                  │
└───────────────┼───────────────────────────────┼──────────────────┘
┌───────────────▼───────────────────────────────▼──────────────────┐
│                        EXTERNAL SERVICES                         │
│  ┌────────────┐ ┌────────────┐  ┌───────────┐   ┌───────────┐    │
│  │ Firebase   │ │ Firestore  │  │   Gemini  │   │    Git    │    │
│  │   Auth     │ │ READ/WRITE │  │           │   │           │    │
│  └────────────┘ └────────────┘  └───────────┘   └───────────┘    │
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
  - **Repository Analyzer**: Code structure analysis and metadata extraction
  - **Scan Queue**: Asynchronous job processing with automatic cleanup
  - **Gemini Service**: AI analysis using Google Gemini API
  - **Timeline Generator**: Git history analysis for project timeline

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

## Technology Choices and Rationale

### Frontend

#### Next.js 15 (App Router)

- **Server Components**: Reduces client-side JavaScript, improves performance
- **Built-in Routing**: File-based routing with dynamic routes
- **API Routes**: Co-located backend with frontend code
- **Optimizations**: Automatic code splitting, image optimization, and caching

#### React

- **Latest Features**: Enhanced Server Components and Suspense
- **Performance**: Better hydration and rendering performance
- **Developer Experience**: Improved error handling and debugging

#### TypeScript

- **Type Safety**: Catches errors at compile time
- **IntelliSense**: Better IDE autocomplete and documentation
- **Refactoring**: Safer code changes with type checking
- **Team Collaboration**: Self-documenting code

#### Tailwind CSS + shadcn/ui

- **Utility-First**: Rapid UI development without CSS files
- **Consistency**: Design system with standardized spacing and colors
- **Components**: Pre-built, accessible UI components

#### ECharts

- **Powerful Visualization**: Rich chart types and interactivity
- **Customization**: Highly customizable with extensive options

###

### Backend

#### Firebase Authentication

- **Built-in Providers**: Google/GitHub OAuth with minimal setup
- **Security**: Token-based authentication with automatic refresh
- **Integration**: Seamless Firestore security rules integration
- **Scalability**: Handles millions of users out-of-the-box

#### Firestore Database

- **Real-time**: Live updates without polling or WebSockets
- **Serverless**: No database server to manage
- **Security**: Row-level access control with security rules
- **Offline Support**: Client-side caching and offline mode

#### Google Gemini

- **Developer Friendly**: Easy API integration with REST
- **Speed**: Fast inference for real-time analysis
- **Context Window**: Large context for analyzing entire repositories
- **Structured Output**: JSON schema validation with Zod

### CI/CD

#### GitHub Actions with SSH

- **Automation**: Automated testing and deployment on push
- **Flexibility**: Custom workflows with community actions
- **Security**: SSH deployment to private servers
- **Ease of Use**: Integrated with GitHub repositories

---

## Deployment Guide

**Recommended Specifications:**

- **OS**: Ubuntu 22.04 LTS or 24.04 LTS
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 50GB SSD
- **Network**: Public IP with SSH access

### Server Setup

- Git clone this repository:

```bash
git clone https://github.com/yourusername/Git-Repository-Analysis-System.git
cd Git-Repository-Analysis-System
```

- Create .env.local and service account file as described in [Environment Variables](#environment-variables), and fill in your production credentials:

```bash
cp .env.local.example .env.local
cp ./service-account-file.json.example ./service-account-file.json
```

- Install dependencies (Remember to install pnpm):

```bash
pnpm install
```

- Build the application:

```bash
pnpm build
```

- Start the application:

```bash
pnpm start
```

The application will be available at `http://your-server-ip:3000`.

### CI/CD GitHub Action Setup

Configure the following secrets in your GitHub repository settings:

```bash
DEPLOY_PORT # Port number for deployment
SSH_HOST    # Hostname or IP address of the server
SSH_KEY     # Private SSH key for authentication
SSH_USER    # SSH username
VM_APP_DIR  # Directory on the server where the app is deployed
```

Setting up these secrets allows the GitHub Actions workflow to deploy the application automatically on push to the main branch.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🤝 Acknowledgement

- [GitRoll](https://gitroll.io/) Provide Machine for Development and Testing
