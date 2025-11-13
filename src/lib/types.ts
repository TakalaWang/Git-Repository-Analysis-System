/**
 * Shared Type Definitions
 *
 * Centralized type definitions used across the entire application.
 * This module provides consistent type safety for both frontend and backend.
 *
 * @module types
 */

// ============================================================================
// SCAN TYPES
// ============================================================================

/**
 * Possible states of a scan job throughout its lifecycle.
 *
 * @typedef {'queued' | 'running' | 'succeeded' | 'failed'} ScanStatus
 */
export type ScanStatus = "queued" | "running" | "succeeded" | "failed"

/**
 * Real-time progress information for a running scan.
 * Only used during the 'running' status to show intermediate steps.
 *
 * @interface ScanProgress
 * @property {string} stage - Current processing stage (only during running)
 * @property {string} message - Human-readable status message
 * @property {number} percentage - Completion percentage (0-100)
 */
export interface ScanProgress {
  stage: "cloning" | "analyzing" | "generating"
  message: string
  percentage: number
}

/**
 * Specific error codes that can occur during scanning.
 * Each code maps to a specific user-facing error message.
 *
 * @typedef ErrorCode
 */
export type ErrorCode =
  | "RATE_LIMIT_EXCEEDED" // User has exceeded their scan quota
  | "REPO_TOO_LARGE" // Repository is too large or took too long to clone
  | "REPO_NOT_ACCESSIBLE" // Repository is private, deleted, or invalid URL
  | "GEMINI_RATE_LIMIT" // Gemini API rate limit exceeded
  | "MALICIOUS_CONTENT" // Repository contains potentially malicious content
  | "UNKNOWN_ERROR" // Any other unhandled error

/**
 * Types of errors that can occur during scanning.
 * Used to determine appropriate user messaging.
 *
 * @typedef {'client' | 'server' | 'malicious'} ErrorType
 */
export type ErrorType = "client" | "server" | "malicious"

/**
 * User-friendly error information for displaying to end users.
 * Hides technical details and provides actionable guidance.
 *
 * @interface UserFriendlyError
 * @property {string} title - Short error title
 * @property {string} message - User-friendly explanation
 * @property {string[]} actions - Suggested actions for the user
 */
export interface UserFriendlyError {
  title: string
  message: string
  actions: string[]
}

/**
 * Complete scan document as stored in Firestore.
 * Represents a single repository analysis request and its results.
 *
 * @interface Scan
 * @property {string} id - Unique scan identifier (Firestore document ID)
 * @property {string} repoUrl - Git repository URL
 * @property {string | null} repoName - Repository display name
 * @property {string | null} userId - User ID if authenticated, null if anonymous
 * @property {string | null} userEmail - User email if authenticated
 * @property {string} ip - Client IP address (for rate limiting)
 * @property {string | null} ipHash - Hashed IP for anonymous users
 * @property {ScanStatus} status - Current scan status
 * @property {ScanProgress} [progress] - Real-time progress updates
 * @property {string | null} provider - Git hosting provider (github/gitlab/bitbucket)
 * @property {string | null} owner - Repository owner/organization
 * @property {string | null} repo - Repository name
 * @property {string | null} commitHash - Git commit SHA at scan time (for caching)
 * @property {Date | string} createdAt - Timestamp when scan was created
 * @property {Date | string} updatedAt - Timestamp of last update
 * @property {Date | string | null} startedAt - When processing started
 * @property {Date | string | null} completedAt - When processing finished
 * @property {string | null} error - Error message if scan failed
 * @property {ErrorType | null} errorType - Type of error (client/server/malicious) for appropriate messaging
 * @property {string | null} description - AI-generated project description
 * @property {string[] | null} techStack - List of detected technologies
 * @property {CategorizedTechStack} [categorizedTechStack] - Technologies grouped by category
 * @property {string | null} skillLevel - Required developer skill level
 * @property {RepositoryInfo} [repositoryInfo] - Enhanced repository metadata
 * @property {DetailedAssessment} [detailedAssessment] - Comprehensive code assessment
 */
export interface Scan {
  id: string
  repoUrl: string
  repoName?: string
  userId: string | null
  userEmail: string | null
  ip: string
  ipHash?: string | null
  status: ScanStatus
  progress?: ScanProgress
  provider: string | null
  owner: string | null
  repo: string | null
  commitHash: string | null
  createdAt: Date | string
  updatedAt: Date | string
  startedAt: Date | string | null
  completedAt: Date | string | null
  error: string | null
  errorType?: ErrorType | null
  errorCode?: ErrorCode | null
  description: string | null
  techStack: string[] | null
  categorizedTechStack?: CategorizedTechStack
  skillLevel: string | null
  repositoryInfo?: RepositoryInfo
  detailedAssessment?: DetailedAssessment
}

// ============================================================================
// ANALYSIS RESULT TYPES
// ============================================================================

/**
 * Technologies grouped by their primary function.
 *
 * @interface CategorizedTechStack
 * @property {string[]} [frontend] - Frontend frameworks and libraries
 * @property {string[]} [backend] - Backend frameworks and runtimes
 * @property {string[]} [database] - Database systems and ORMs
 * @property {string[]} [devops] - CI/CD, containerization, cloud services
 * @property {string[]} [tools] - Development tools and utilities
 * @property {string[]} [other] - Uncategorized technologies
 */
export interface CategorizedTechStack {
  frontend?: string[]
  backend?: string[]
  database?: string[]
  devops?: string[]
  tools?: string[]
  other?: string[]
}

/**
 * Enhanced repository information optimized for non-technical understanding.
 * Provides context about project scope, complexity, and purpose.
 *
 * @interface RepositoryInfo
 * @property {string} name - Repository name
 * @property {string} description - Project description
 * @property {string} [teamSize] - Estimated team size (e.g., "1-2 developers")
 * @property {string} [projectDuration] - Estimated development time (e.g., "2-3 months")
 * @property {string} complexity - Overall complexity rating (Low/Medium/High/Very High)
 * @property {number} [linesOfCode] - Total lines of code
 * @property {number} [filesCount] - Total number of files
 * @property {string[]} [languages] - Programming languages used
 * @property {string} [mainPurpose] - Primary purpose of the project
 * @property {string} [targetAudience] - Intended users of the project
 */
export interface RepositoryInfo {
  name: string
  description: string
  teamSize?: string
  projectDuration?: string
  complexity: string
  linesOfCode?: number
  filesCount?: number
  languages?: string[]
  mainPurpose?: string
  targetAudience?: string
}

/**
 * Comprehensive code quality and skill assessment with detailed reasoning.
 *
 * @interface DetailedAssessment
 * @property {string} skillLevel - Required developer expertise level
 * @property {string} reasoning - Explanation for the skill level assessment
 * @property {string[]} strengths - Key strengths and positive aspects
 * @property {string[]} weaknesses - Areas needing improvement
 * @property {string[]} recommendations - Specific improvement suggestions
 * @property {string} [codeQuality] - Code quality rating and explanation
 * @property {string} [architectureRating] - Architecture quality assessment
 * @property {string} [testCoverage] - Testing coverage evaluation
 */
export interface DetailedAssessment {
  skillLevel: string
  reasoning: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  codeQuality?: string
  architectureRating?: string
  testCoverage?: string
}

// ============================================================================
// RATE LIMITING TYPES
// ============================================================================

/**
 * Rate limit check result.
 *
 * @interface RateLimitInfo
 * @property {number} limit - Maximum requests allowed in the time window
 * @property {number} remaining - Number of requests remaining
 * @property {Date} resetAt - When the rate limit window resets
 * @property {number} used - Number of requests already used
 */
export interface RateLimitInfo {
  limit: number
  remaining: number
  resetAt: Date
  used: number
}

/**
 * User quota information for authenticated users.
 *
 * @interface UserQuota
 * @property {number} maxScans - Maximum scans allowed in the time period
 * @property {number} usedScans - Number of scans already used
 * @property {number} remainingScans - Number of scans remaining
 * @property {Date} resetAt - When the quota resets
 * @property {boolean} isAuthenticated - Whether user is authenticated
 */
export interface UserQuota {
  maxScans: number
  usedScans: number
  remainingScans: number
  resetAt: Date
  isAuthenticated: boolean
}

// ============================================================================
// UI CONFIGURATION TYPES
// ============================================================================

/**
 * Developer skill level categories.
 *
 * @typedef {'Beginner' | 'Junior' | 'Mid-level' | 'Senior'} SkillLevel
 */
export type SkillLevel = "Beginner" | "Junior" | "Mid-level" | "Senior"

/**
 * Configuration for scan status badges.
 *
 * @interface StatusBadgeConfig
 * @property {string} label - Display label
 * @property {string} variant - Badge variant style
 */
export interface StatusBadgeConfig {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
}

/**
 * Badge configuration for each scan status.
 * Determines the visual appearance of status indicators in the UI.
 */
export const SCAN_STATUS_CONFIG: Record<ScanStatus, StatusBadgeConfig> = {
  queued: { label: "Queued", variant: "secondary" },
  running: { label: "Running", variant: "default" },
  succeeded: { label: "Completed", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
}
