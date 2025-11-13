# Technology Stack

Comprehensive documentation of **technology choices**, **technical rationale**, and **alternatives considered** for the **Git Repository Analysis System**.

## Table of Contents

- [Overview](#overview)
- [Frontend Technologies](#frontend-technologies)
- [Backend Technologies](#backend-technologies)
- [Database & Authentication](#database--authentication)
- [AI & Analysis](#ai--analysis)
- [Infrastructure & Deployment](#infrastructure--deployment)
- [Development Tools](#development-tools)
- [Alternative Considerations](#alternative-considerations)

---

## Overview

The Git Repository Analysis System is built on a **modern, production-ready technology stack** carefully selected for:

- **Developer Experience:** TypeScript, hot reload, comprehensive tooling
- **Performance:** Server Components, code splitting, efficient caching
- **Scalability:** Serverless architecture with horizontal scaling
- **Cost Efficiency:** Pay-per-use model with generous free tiers
- **Security:** Built-in authentication, database rules, typed error handling
- **Maintainability:** Strong typing, comprehensive tests, clear architecture

### Technology Summary

```
┌──────────────────────────────────────────────────────────────┐
│                        TECH STACK                            │
├──────────────────────────────────────────────────────────────┤
│ Frontend     Next.js 15 + React 19 + TypeScript 5           │
│ UI           Tailwind CSS 4 + shadcn/ui + Radix UI          │
│ Backend      Next.js API Routes + Firebase Admin SDK        │
│ Database     Firestore (NoSQL, real-time)                   │
│ Auth         Firebase Authentication (Google OAuth)          │
│ AI           Google Gemini 2.0 Flash + Zod Schema           │
│ Testing      Jest + React Testing Library                   │
│ Deploy       Ubuntu + Nginx + PM2 (VM-based)                │
│ DevOps       GitHub Actions + pnpm + ESLint + Prettier      │
└──────────────────────────────────────────────────────────────┘
```

---

## Frontend Technologies

### Next.js 15 (App Router)

**Description:** React meta-framework for production web applications

**Rationale:**

Next.js 15 with App Router provides a modern development experience while delivering excellent performance:

1. **Server Components** - Revolutionary architecture change:
   - Drastically reduces client-side JavaScript bundle
   - Only interactive components hydrated on client
   - Improved Core Web Vitals (LCP, FCP, TTI)
   - SEO-friendly by default
2. **App Router** - Modern routing system:
   - File-based routing with intuitive folder structure
   - Layouts for shared UI across routes
   - Built-in loading and error states
   - Parallel routes and intercepting routes
3. **API Routes** - Backend without separate server:
   - Co-located with frontend code
   - Share types between client and server
   - Automatic hot reload during development
   - Easy deployment (same as frontend)
4. **Built-in Optimizations:**
   - Automatic code splitting per route
   - Image optimization (`next/image`)
   - Font optimization (`next/font`)
   - Static asset caching
5. **Production Ready:**
   - Used by Vercel, Nike, Twitch, Hulu, McDonald's
   - Battle-tested at massive scale
   - Active development and strong community

**Configuration:**

```typescript
// next.config.ts
const config: NextConfig = {
  reactStrictMode: true,
  swcMinify: true, // Fast Rust-based minifier
  experimental: {
    serverActions: true,
  },
}
```

**Alternatives Considered:**

| Framework               | Pros                         | Cons                       | Decision                     |
| ----------------------- | ---------------------------- | -------------------------- | ---------------------------- |
| **Create React App**    | Simple setup                 | No SSR, deprecated         | ❌ Lacks server features     |
| **Vite + React Router** | Fast HMR, lightweight        | More config, no API routes | ❌ Requires separate backend |
| **Remix**               | Great DX, nested routes      | Smaller ecosystem          | ❌ Less mature               |
| **Gatsby**              | Excellent for static sites   | Slow builds, complex       | ❌ Not for dynamic apps      |
| **Next.js**             | All-in-one, production-ready | Learning curve             | ✅ **CHOSEN**                |

---

### TypeScript 5

**Description:** Typed superset of JavaScript

**Rationale:**

TypeScript provides critical safety and developer experience improvements:

1. **Compile-Time Safety:**
   - Catch errors before runtime
   - Prevent `undefined` and `null` issues
   - Validate function arguments and return types
2. **Enhanced IDE Support:**
   - Intelligent autocomplete
   - Inline documentation
   - Instant error detection
   - Safe refactoring
3. **Self-Documenting Code:**
   - Types serve as documentation
   - Clear function contracts
   - Easy onboarding for new developers
4. **Better Team Collaboration:**
   - Clearer interfaces between modules
   - Prevents breaking changes
   - Standardized coding patterns

**Configuration Highlights:**

```json
{
  "compilerOptions": {
    "strict": true, // Maximum type safety
    "noUncheckedIndexedAccess": true, // Safe array/object access
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"] // Clean imports
    }
  }
}
```

**Real-World Benefits:**

```typescript
// ❌ Without TypeScript - Runtime error
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}
calculateTotal(null) // Runtime error!

// ✅ With TypeScript - Compile error
function calculateTotal(items: Array<{ price: number }>): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}
calculateTotal(null) // TS Error: Argument of type 'null' is not assignable
```

---

### React 19

**Description:** JavaScript library for building user interfaces

**Rationale:**

React 19 brings powerful features for modern web apps:

1. **Server Components:**
   - Render on server without sending JS to client
   - Access backend resources directly
   - Automatic code splitting
2. **Concurrent Features:**
   - Suspense for data fetching
   - Automatic batching
   - Transition API for smooth UX
3. **Ecosystem:**
   - Vast library of components and tools
   - Firebase React SDK
   - Excellent TypeScript support
4. **Industry Standard:**
   - Most popular UI library (used by Meta, Netflix, Airbnb)
   - Large talent pool
   - Extensive learning resources

**Key Features Used:**

```typescript
// Context for global state (authentication)
const AuthContext = createContext<AuthContextValue>(null)

// Hooks for component logic
const [user, setUser] = useState<User | null>(null)
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, setUser)
  return unsubscribe
}, [])

// Server Components for static content
export default async function DashboardPage() {
  // Direct Firestore access on server
  const scans = await getScans()
  return <ScansList scans={scans} />
}
```

---

### Tailwind CSS 4

**Description:** Utility-first CSS framework

**Rationale:**

Tailwind CSS revolutionizes how we write styles:

1. **Rapid Development:**
   - Build UI quickly with utility classes
   - No context switching between files
   - Consistent spacing and sizing
2. **Design System:**
   - Predefined color palette
   - Consistent spacing scale
   - Typography system
3. **Performance:**
   - Only ships CSS that's actually used
   - Tiny production bundles (~10KB gzipped)
   - No unused CSS
4. **Responsive Design:**
   - Mobile-first approach
   - Simple responsive utilities
   - Consistent breakpoints
5. **Developer Experience:**
   - IntelliSense with official VS Code extension
   - No naming conventions to remember
   - Easy to customize

**Example:**

```tsx
// Traditional CSS: Multiple files, naming conventions, specificity
<button className="submit-button">Submit</button>
/* submit-button.css */
.submit-button { padding: 1rem 2rem; background: blue; /* ... */ }

// Tailwind: Co-located, obvious, reusable
<button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
  Submit
</button>
```

**Configuration:**

```typescript
// tailwind.config.ts
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",
        secondary: "#10B981",
      },
    },
  },
}
```

---

### shadcn/ui + Radix UI

**Description:** Beautifully designed, accessible UI components

**Rationale:**

shadcn/ui provides a unique approach to component libraries:

1. **Not a Package - Copy-Paste:**
   - Components copied into your codebase
   - Full control over implementation
   - No version lock-in
   - Customize without overrides
2. **Accessibility First:**
   - Built on Radix UI primitives
   - WCAG 2.1 compliant
   - Keyboard navigation
   - Screen reader support
3. **Tailwind Styled:**
   - Consistent with our design system
   - Easy to customize colors and spacing
   - No CSS-in-JS overhead
4. **Modern Design:**
   - Beautiful default styling
   - Professional appearance
   - Consistent design language
5. **TypeScript Support:**
   - Full type safety
   - IntelliSense support
   - Compile-time validation

**Components Used:**

- `Button`: Primary actions, navigation
- `Card`: Content containers, scan results
- `Dialog`: Modals for confirmations
- `Input`: Form fields
- `Alert`: Error and success messages
- `Badge`: Status indicators
- `Progress`: Scan progress bars
- `Skeleton`: Loading states

**Alternatives Considered:**

| Library         | Pros                  | Cons                       | Decision        |
| --------------- | --------------------- | -------------------------- | --------------- |
| **Material-UI** | Mature, comprehensive | Heavy, opinionated styling | ❌ Too heavy    |
| **Ant Design**  | Great for admin       | Chinese-first docs         | ❌ Overkill     |
| **Chakra UI**   | Good DX, themed       | Different styling approach | ❌ Not Tailwind |
| **Headless UI** | Minimal, accessible   | No default styling         | ❌ Too bare     |
| **shadcn/ui**   | Perfect balance       | Newer library              | ✅ **CHOSEN**   |

---

## Backend Technologies

### Next.js API Routes

**Description:** Built-in serverless API endpoints

**Rationale:**

Next.js API Routes provide a full backend without additional setup:

1. **Full-Stack in One Repo:**
   - Share types between frontend and API
   - Single deployment process
   - Unified development experience
2. **Serverless Architecture:**
   - Auto-scaling based on traffic
   - Pay only for actual usage
   - No server management
3. **TypeScript Integration:**

   ```typescript
   // Shared types work seamlessly
   import type { ScanRequest, ScanResponse } from "@/lib/types"

   export async function POST(request: Request): Promise<Response> {
     const body: ScanRequest = await request.json()
     const result: ScanResponse = await processScan(body)
     return Response.json(result)
   }
   ```

4. **Middleware Support:**
   - Authentication checks
   - Rate limiting
   - CORS handling
   - Logging

**API Structure:**

```
/api
  /scan              → POST: Submit repository for analysis
  /auth
    /sync-user       → POST: Sync user authentication state
  /health            → GET: Health check endpoint
```

**Example Route:**

```typescript
// /api/scan/route.ts
export async function POST(request: NextRequest) {
  // 1. Extract client IP for rate limiting
  const clientIp = getClientIp(request)

  // 2. Check authentication
  const user = await getUserFromRequest(request)

  // 3. Rate limiting
  await checkRateLimit(clientIp, user?.uid)

  // 4. Validate request
  const { repoUrl } = await request.json()

  // 5. Create scan in Firestore
  const scanId = await createScan({ repoUrl, userId: user?.uid, ip: clientIp })

  // 6. Queue for background processing
  await addToScanQueue(scanId)

  return Response.json({ scanId })
}
```

---

### Firebase Admin SDK

**Description:** Server-side Firebase SDK with privileged access

**Rationale:**

Firebase Admin SDK provides secure backend operations:

1. **Privileged Access:**
   - Bypass Firestore security rules
   - Admin-level authentication
   - Full database control
2. **Server-Side Only:**
   - Never exposed to client
   - Service account authentication
   - Secure token verification
3. **Type-Safe Operations:**

   ```typescript
   import { getFirestore } from "firebase-admin/firestore"

   const db = getFirestore()
   const scanRef = db.collection("scans").doc(scanId)
   await scanRef.update({
     status: "completed",
     result: analysisResult,
     completedAt: FieldValue.serverTimestamp(),
   })
   ```

4. **Built-in Features:**
   - Server timestamps
   - Batch operations
   - Transaction support
   - Field value helpers

**Configuration:**

```typescript
// lib/server/firebase-admin.ts
import { initializeApp, cert } from "firebase-admin/app"

const serviceAccount = JSON.parse(readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH!, "utf8"))

export const adminApp = initializeApp({
  credential: cert(serviceAccount),
})

export const adminDb = getFirestore(adminApp)
export const adminAuth = getAuth(adminApp)
```

---

### Node.js Runtime

**Description:** JavaScript runtime for backend operations

**Rationale:**

Node.js provides the foundation for server-side operations:

1. **JavaScript Everywhere:**
   - Same language for frontend and backend
   - Share code and types
   - Unified tooling
2. **Rich Ecosystem:**
   - npm packages for everything
   - Mature libraries
   - Active community
3. **Performance:**
   - V8 engine optimization
   - Non-blocking I/O
   - Efficient for I/O-heavy tasks
4. **Git Operations:**

   ```typescript
   import { exec } from "child_process"
   import { promisify } from "util"

   const execPromise = promisify(exec)

   async function cloneRepository(url: string, destination: string) {
     await execPromise(`git clone --depth 1 ${url} ${destination}`, {
       timeout: 300000, // 5 minutes
     })
   }
   ```

---

## Database & Authentication

### Firestore

**Description:** NoSQL cloud database with real-time capabilities

**Rationale:**

Firestore is the perfect database for this application:

1. **Real-Time Updates:**
   - Live scan status updates
   - No polling required
   - WebSocket-based
   - Automatic reconnection
2. **Serverless:**
   - No server to manage
   - Automatic scaling
   - Pay-per-use pricing
   - Generous free tier (50K reads/day)
3. **Security Rules:**
   ```javascript
   // Client can only read own scans
   match /scans/{scanId} {
     allow read: if request.auth != null &&
                    resource.data.userId == request.auth.uid;
     allow write: if false;  // Only server can write
   }
   ```
4. **Flexible Schema:**
   - NoSQL document model
   - Easy to evolve data structure
   - Nested objects supported
   - Arrays and references
5. **Developer Experience:**
   - Excellent TypeScript support
   - Clear documentation
   - Firebase Console for debugging
   - Local emulator for testing

**Data Model:**

```typescript
// users collection
interface User {
  uid: string
  email: string
  displayName: string
  photoURL: string
  createdAt: Timestamp
  lastLoginAt: Timestamp
  scanCount: number
}

// scans collection
interface Scan {
  id: string
  userId?: string
  ip: string
  repoUrl: string
  status: "queued" | "processing" | "completed" | "failed"
  result?: AnalysisResult
  errorCode?: ErrorCode
  createdAt: Timestamp
  completedAt?: Timestamp
}
```

**Alternatives Considered:**

| Database                 | Pros                 | Cons                       | Decision            |
| ------------------------ | -------------------- | -------------------------- | ------------------- |
| **PostgreSQL**           | Relational, powerful | Needs server, no real-time | ❌ Too complex      |
| **MongoDB**              | Flexible schema      | No built-in real-time      | ❌ Missing features |
| **Supabase**             | Postgres + real-time | Newer, less mature         | ❌ Less integrated  |
| **Firebase Realtime DB** | Simple, fast         | Limited queries            | ❌ Less flexible    |
| **Firestore**            | Real-time + flexible | NoSQL learning curve       | ✅ **CHOSEN**       |

---

### Firebase Authentication

**Description:** User authentication and identity platform

**Rationale:**

Firebase Auth provides enterprise-grade authentication with minimal setup:

1. **Built-in Providers:**
   - Google OAuth (one-click setup)
   - Email/password
   - Anonymous auth
   - Custom providers
2. **Security:**
   - Secure token-based authentication
   - Automatic token refresh
   - Revocation support
   - Multi-factor authentication
3. **Integration:**
   - Seamless Firestore security rules
   - Admin SDK for server-side
   - React SDK for client-side
   - Automatic state management
4. **Developer Experience:**

   ```typescript
   // Client-side authentication
   import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"

   async function signIn() {
     const provider = new GoogleAuthProvider()
     const result = await signInWithPopup(auth, provider)
     return result.user
   }

   // Server-side token verification
   import { getAuth } from "firebase-admin/auth"

   async function verifyUser(idToken: string) {
     const decodedToken = await getAuth().verifyIdToken(idToken)
     return decodedToken.uid
   }
   ```

5. **Scalability:**
   - Handles millions of users
   - Global infrastructure
   - High availability
   - No rate limits

**Alternatives Considered:**

| Solution          | Pros                     | Cons              | Decision      |
| ----------------- | ------------------------ | ----------------- | ------------- |
| **NextAuth.js**   | Flexible, many providers | Requires database | ❌ More setup |
| **Auth0**         | Feature-rich             | Expensive         | ❌ Cost       |
| **Clerk**         | Modern UX                | Paid tiers        | ❌ Cost       |
| **Supabase Auth** | Good integration         | Less mature       | ❌ Newer      |
| **Firebase Auth** | Easy, integrated         | Vendor lock-in    | ✅ **CHOSEN** |

---

## AI & Analysis

### Google Gemini 2.0 Flash

**Description:** Multimodal AI model for code analysis

**Rationale:**

Gemini 2.0 Flash is the optimal choice for code analysis:

1. **Latest Technology:**
   - State-of-the-art code understanding
   - Better reasoning than GPT-3.5
   - Multimodal capabilities
2. **Performance:**
   - Flash variant optimized for speed
   - Low latency responses (~2-3 seconds)
   - Suitable for real-time applications
3. **Large Context Window:**
   - 1 million tokens in dev (128K in production)
   - Analyze entire repositories
   - Understand complex codebases
4. **Structured Output:**

   ```typescript
   import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"
   import { z } from "zod"

   // Define response schema with Zod
   const analysisSchema = z.object({
     summary: z.string(),
     technologies: z.array(z.string()),
     architecture: z.string(),
     suggestions: z.array(z.string()),
   })

   // Gemini returns validated JSON
   const result = await model.generateContent({
     contents: [{ role: "user", parts: [{ text: prompt }] }],
     generationConfig: {
       responseSchema: zodToGeminiSchema(analysisSchema),
       responseMimeType: "application/json",
     },
   })
   ```

5. **Cost Effective:**
   - Generous free tier
   - Lower cost than GPT-4
   - No cold starts
6. **Reliability:**
   - Built-in retry logic
   - Error handling
   - Rate limit detection

**Configuration:**

```typescript
// lib/server/gemini.ts
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  },
})
```

**Alternatives Considered:**

| Model                | Pros                       | Cons                    | Decision      |
| -------------------- | -------------------------- | ----------------------- | ------------- |
| **GPT-4**            | Most capable               | Expensive, slow         | ❌ Cost       |
| **GPT-3.5 Turbo**    | Fast, cheap                | Less accurate           | ❌ Quality    |
| **Claude 3**         | Great reasoning            | Limited free tier       | ❌ Cost       |
| **Llama 3**          | Open source                | Requires infrastructure | ❌ Complexity |
| **Gemini 2.0 Flash** | Fast, accurate, affordable | Newer                   | ✅ **CHOSEN** |

---

### Zod Schema Validation

**Description:** TypeScript-first schema validation library

**Rationale:**

Zod ensures data integrity and type safety:

1. **TypeScript Integration:**

   ```typescript
   import { z } from "zod"

   const ScanRequestSchema = z.object({
     repoUrl: z.string().url(),
     userId: z.string().optional(),
   })

   type ScanRequest = z.infer<typeof ScanRequestSchema> // TypeScript type
   ```

2. **Runtime Validation:**
   - Validate API requests
   - Validate Gemini responses
   - Catch bad data early
3. **Error Messages:**
   - Clear error messages
   - Path to invalid field
   - Expected vs. actual values
4. **Composable:**
   - Build complex schemas from simple ones
   - Reusable validators
   - Transform and refine data

---

## Infrastructure & Deployment

### PM2 Process Manager

**Description:** Production process manager for Node.js

**Rationale:**

PM2 provides production-grade process management:

1. **Zero-Downtime Deployments:**
   ```bash
   pm2 reload ecosystem.config.js  # Graceful reload
   ```
2. **Cluster Mode:**
   - Utilize all CPU cores
   - Automatic load balancing
   - Process restart on crash
3. **Monitoring:**
   - CPU and memory usage
   - Real-time logs
   - Uptime tracking
   - `pm2 monit` for live dashboard
4. **Auto-Restart:**
   - Crash recovery
   - Memory limit enforcement
   - Watch mode for development
5. **Log Management:**
   - Centralized logs
   - Log rotation
   - Error logs separate from output

**Configuration:**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "git-analyzer",
      script: "pnpm",
      args: "start",
      instances: 2, // Number of CPU cores
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      autorestart: true,
      max_restarts: 10,
    },
  ],
}
```

**Alternatives Considered:**

| Tool             | Pros                 | Cons                   | Decision       |
| ---------------- | -------------------- | ---------------------- | -------------- |
| **systemd**      | Built-in to Linux    | Less features          | ❌ Limited     |
| **Docker + K8s** | Industry standard    | Overkill for single VM | ❌ Too complex |
| **Forever**      | Simple               | No clustering          | ❌ Too basic   |
| **PM2**          | Feature-rich, proven | Learning curve         | ✅ **CHOSEN**  |

---

### Nginx

**Description:** High-performance HTTP server and reverse proxy

**Rationale:**

Nginx is the industry standard for production web servers:

1. **Reverse Proxy:**
   - Forward requests to Next.js
   - SSL termination
   - Load balancing
2. **Performance:**
   - Efficient static file serving
   - Caching
   - Compression (gzip, Brotli)
3. **Security:**
   - DDoS protection
   - Rate limiting
   - Security headers
4. **SSL/TLS:**
   - HTTPS support
   - Certbot integration
   - Automatic certificate renewal

**Configuration Highlights:**

```nginx
upstream git_analyzer {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Proxy to Next.js
    location / {
        proxy_pass http://git_analyzer;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

### Ubuntu Server LTS

**Description:** Long-term support Linux distribution

**Rationale:**

Ubuntu is the optimal choice for production servers:

1. **Stability:**
   - 5 years of security updates
   - Well-tested releases
   - Enterprise-grade reliability
2. **Package Management:**
   - apt for software installation
   - PPA for newer packages
   - Snap for containerized apps
3. **Documentation:**
   - Extensive official docs
   - Large community
   - Many tutorials and guides
4. **Performance:**
   - Optimized for server workloads
   - Kernel tuning for network I/O
   - Efficient resource usage

**Alternatives Considered:**

| OS         | Pros          | Cons                    | Decision            |
| ---------- | ------------- | ----------------------- | ------------------- |
| **Debian** | Very stable   | Older packages          | ❌ Less up-to-date  |
| **CentOS** | Enterprise    | Discontinued by Red Hat | ❌ Uncertain future |
| **Alpine** | Minimal       | Harder to debug         | ❌ Less familiar    |
| **Ubuntu** | Great balance | Slightly more bloat     | ✅ **CHOSEN**       |

---

## Development Tools

### Jest + React Testing Library

**Description:** Testing framework and utilities

**Rationale:**

1. **Jest:**
   - Fast test runner
   - Built-in mocking
   - Code coverage
   - Snapshot testing
2. **React Testing Library:**
   - Test user behavior, not implementation
   - Accessibility-focused
   - Simple API

**Example:**

```typescript
describe("Scan API", () => {
  it("should create scan successfully", async () => {
    const response = await fetch("/api/scan", {
      method: "POST",
      body: JSON.stringify({ repoUrl: "https://github.com/user/repo" }),
    })

    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.scanId).toBeDefined()
  })
})
```

---

### ESLint + Prettier

**Description:** Linting and code formatting

**Rationale:**

1. **ESLint:**
   - Catch bugs and bad patterns
   - Enforce code style
   - TypeScript rules
2. **Prettier:**
   - Consistent formatting
   - No debates about style
   - Auto-format on save

---

### pnpm

**Description:** Fast, disk-efficient package manager

**Rationale:**

1. **Speed:**
   - Faster installs than npm/yarn
   - Content-addressable storage
   - Parallel downloads
2. **Disk Efficiency:**
   - Shared dependencies across projects
   - Symlinks instead of copies
   - Saves gigabytes of disk space
3. **Strictness:**
   - No phantom dependencies
   - Deterministic installs
   - Better monorepo support

---

## Alternative Considerations

### Why Not Serverless (Vercel/AWS Lambda)?

**Considered:** Deploying to Vercel or AWS Lambda

**Why VM Instead:**

1. **Long-Running Tasks:**
   - Git cloning can take 2-5 minutes
   - Serverless has 10-15 second timeouts
   - Repository analysis needs sustained CPU
2. **File System Access:**
   - Need to clone repositories to disk
   - Serverless has limited disk space
   - Ephemeral storage not suitable
3. **Cost Predictability:**
   - VM has fixed monthly cost
   - Serverless charges per invocation
   - Better for sustained workloads
4. **Control:**
   - Full control over environment
   - Install system dependencies (git)
   - Configure process manager (PM2)

**Verdict:** VM-based deployment is more suitable for this workload.

---

### Why Not Microservices?

**Considered:** Splitting into multiple services

**Why Monolith:**

1. **Simplicity:**
   - Easier to develop and debug
   - Single deployment
   - Less operational overhead
2. **Performance:**
   - No network latency between services
   - Shared memory and database connections
   - Faster development iteration
3. **Team Size:**
   - Suitable for small teams
   - Less coordination overhead
4. **Future Flexibility:**
   - Can extract services later if needed
   - Start simple, scale when necessary

**Verdict:** Monolith is appropriate for current scale.

---

### Why Not GraphQL?

**Considered:** Using GraphQL instead of REST

**Why REST:**

1. **Simplicity:**
   - Simple API with few endpoints
   - No complex query requirements
   - Easy to understand and document
2. **Firestore Direct Access:**
   - Client reads directly from Firestore
   - No need for GraphQL layer
   - Real-time updates built-in
3. **Tooling:**
   - Next.js API Routes are REST-friendly
   - Less boilerplate

**Verdict:** REST is sufficient for this application.

---

## Summary

The Git Repository Analysis System uses a **modern, production-ready stack** that balances:

✅ **Developer Experience** - TypeScript, hot reload, great tooling
✅ **Performance** - Server Components, optimized bundles, caching
✅ **Scalability** - Serverless database, PM2 clustering, Nginx
✅ **Cost** - Free tiers, pay-per-use, efficient resource usage
✅ **Security** - Firebase Auth, Firestore rules, typed errors
✅ **Maintainability** - Strong typing, tests, clear architecture

Each technology choice is **deliberate** and **justified** based on project requirements, team capabilities, and production readiness.

For more details, see:

- [Architecture Documentation](./ARCHITECTURE.md)
- [Configuration Guide](./CONFIGURATION.md)
- [Deployment Guide](./DEPLOYMENT.md)
