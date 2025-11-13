# System Architecture

This document provides a comprehensive overview of the Git Repository Analysis System's architecture, design principles, and data flow.

## Overview

The Git Repository Analysis System is a full-stack application built with Next.js that analyzes Git repositories using AI. The architecture follows a modern serverless approach with clear separation between client-side and server-side operations.

### Key Characteristics

- **Serverless Architecture:** Leverages Next.js API routes and Firebase services
- **Asynchronous Processing:** Queue-based background job processing
- **Real-time Updates:** Live progress tracking via Firestore
- **AI-Powered Analysis:** Integration with Google Gemini for intelligent insights
- **Security-First:** Client-side read-only, server-side privileged operations

## Architecture Diagram

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
│               │                               │                  │
┌───────────────▼───────────────────────────────▼──────────────────┐
│                           EXTERNAL SERVICES                      │
│  ┌────────────┐ ┌────────────┐  ┌───────────┐   ┌───────────┐    │
│  │ Firebase   │ │ Firestore  │  │   Gemini  │   │    Git    │    │
│  │   Auth     │ │ READ/WRITE │  │           │   │           │    │
│  └────────────┘ └────────────┘  └───────────┘   └───────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Design Principles

### 1. Client-Side Read-Only Pattern

**Principle:** The client (browser) can only read data from Firestore, never write.

**Rationale:**

- **Security:** Prevents malicious clients from tampering with data
- **Data Integrity:** Ensures all writes go through validated backend logic
- **Auditability:** Single point of control for all data modifications
- **Rate Limiting:** Server-side enforcement of usage limits
- **Automatic Reloads:** Real-time updates via Firestore listeners

**Implementation:**

```typescript
// ❌ Client-side (NOT ALLOWED)
await addDoc(collection(db, "scans"), scanData)

// ✅ Client-side (CORRECT)
const response = await fetch("/api/scan", {
  method: "POST",
  body: JSON.stringify({ repoUrl }),
})

// ✅ Server-side API route
export async function POST(request: NextRequest) {
  // Validation and authorization
  await adminDb.collection("scans").add(scanData)
}
```

### 2. Asynchronous Queue Processing

**Principle:** Long-running tasks are queued and processed in the background.

**Rationale:**

- **Responsiveness:** Immediate response to user requests
- **Reliability:** Job persistence and retry mechanisms
- **Resource Management:** Control over concurrent processing
- **User Experience:** Real-time progress updates

**Flow:**

1. User submits scan request
2. API validates and creates scan document with `status: 'queued'`
3. Returns scan ID immediately
4. Background worker picks up queued scans
5. Updates progress in real-time via Firestore
6. Client subscribes to scan document for live updates

### 3. Progressive Enhancement

**Principle:** Core functionality works without authentication, enhanced features for logged-in users.

**Capabilities:**

| Feature      | Anonymous   | Authenticated |
| ------------ | ----------- | ------------- |
| Submit Scans | ✅ (3/hour) | ✅ (20/hour)  |
| View Results | ✅          | ✅            |
| Dashboard    | ❌          | ✅            |
| Scan History | ❌          | ✅            |

### 4. Smart Caching

**Principle:** Reuse previous analysis for unchanged repositories.

**Strategy:**

- Store Git commit hash with each scan
- Before analyzing, check for existing scan with same URL and commit hash
- If found and successful, copy results to new scan document
- Reduces API costs and improves response time

## Components

### Frontend Components

#### 1. Pages (App Router)

**Home Page (`/`)**

- Repository URL submission form
- Feature highlights
- Anonymous and authenticated access

**Dashboard Page (`/dashboard`)**

- Authenticated users only
- List of user's scan history
- Status filtering and sorting
- Quick access to results

**Login Page (`/login`)**

- GitHub OAuth authentication
- Sign in/out functionality

**Scan Result Page (`/scan/[id]`)**

- Real-time scan progress
- Analysis results display
- Technology stack visualization
- Shareable permanent links

#### 2. React Components

**Header Component**

- Navigation menu
- User authentication status
- Quota display for authenticated users

**QuotaDisplay Component**

- Real-time rate limit information
- Usage statistics
- Upgrade prompts

**LoadingSpinner Component**

- Scan progress visualization
- Status messages
- Percentage completion

#### 3. Context Providers

**AuthContext**

- User authentication state
- Sign in/out methods
- Token management
- Backend synchronization

### Backend Components

#### 1. API Routes

**POST /api/scan**

- Validates repository URL
- Checks rate limits
- Creates scan document
- Enqueues processing job
- Returns scan ID

**POST /api/auth/sync-user**

- Syncs authenticated user data
- Creates/updates user document
- Manages user quotas

**GET /api/health**

- Health check endpoint
- Service status
- System diagnostics

#### 2. Server-Side Services

**Firebase Admin (`firebase-admin.ts`)**

- Server-side Firebase SDK initialization
- Privileged database operations
- User authentication verification

**Git Handler (`git-handler.ts`)**

- Repository URL validation
- Git clone operations
- Remote commit hash retrieval
- Accessibility checks

**Repository Analyzer (`repository-analyzer.ts`)**

- Code structure analysis
- Technology stack detection
- Language distribution calculation
- File statistics gathering

**Gemini Client (`gemini.ts`)**

- AI API communication
- Structured output parsing
- Retry logic

**Scan Queue (`scan-queue.ts`)**

- Background job processing
- Queue management
- Progress tracking

**Rate Limiter (`rate-limiter.ts`)**

- IP-based rate limiting
- User-based quota management
- Sliding window algorithm
- Redis-compatible (for scaling)

**IP Utils (`ip-utils.ts`)**

- Client IP extraction
- IP hashing for privacy
- Proxy header handling

## Security Model

### Authentication

**Method:** Firebase Authentication with GitHub OAuth

**Token Verification:**

```typescript
// Client-side: Get ID token
const idToken = await user.getIdToken()

// Server-side: Verify token
const decodedToken = await adminAuth.verifyIdToken(idToken)
const uid = decodedToken.uid
```

### Firestore Security Rules

**Principle:** Defense in depth - Rules enforce access control even though client is read-only.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function: Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function: Check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      // Users can read their own profile
      allow read: if isOwner(userId);

      // Only backend (Admin SDK) can write
      allow write: if false;
    }

    // Scans collection
    match /scans/{scanId} {
      // Users can read their own scans
      // Anonymous scans (userId == null) are readable by anyone
      allow read: if isOwner(resource.data.userId)
                  || resource.data.userId == null;

      // Only backend (Admin SDK) can write
      allow write: if false;
    }

    // Rate limits collection
    match /rate_limits/{limitId} {
      // Only backend can read/write
      allow read, write: if false;
    }
  }
}
```

### API Security

**Rate Limiting:**

- IP-based for anonymous users (3 scans/hour)
- UID-based for authenticated users (20 scans/hour)
- Sliding window algorithm for accurate counting

**Input Validation:**

- URL format validation
- Repository accessibility check
- Sanitization of user inputs

**Error Handling:**

- Generic error messages to prevent information leakage
- Detailed logs for debugging (server-side only)
- Safe error responses

## Performance Considerations

### Optimization Strategies

1. **Smart Caching**
   - Cache successful scans by commit hash
   - Instant results for unchanged repositories
   - Reduces Gemini API calls

2. **Lazy Loading**
   - Load dashboard scans on demand
   - Paginate long scan lists
   - Virtual scrolling for large datasets

3. **Code Splitting**
   - Route-based code splitting (Next.js automatic)
   - Dynamic imports for heavy components
   - Reduced initial bundle size

4. **API Optimization**
   - Firestore compound indexes
   - Efficient query patterns
   - Minimal document reads

5. **Git Operations**
   - Shallow clone (`--depth=1`)
   - Sparse checkout for large repos
   - Timeout protection (5 minutes)

6. **Gemini API Usage**
   - Structured output to minimize parsing
   - Retry logic prevents network overload
   -
