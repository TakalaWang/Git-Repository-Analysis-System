/**
 * Shared Type Definitions
 *
 * This file contains type definitions shared between frontend and backend.
 * All types are exported for use across the application.
 *
 * @module lib/types
 */

/**
 * Scan status enum
 */
export type ScanStatus = "queued" | "running" | "succeeded" | "failed"

/**
 * Scan progress stages
 */
export interface ScanProgress {
  stage: "queued" | "cloning" | "analyzing" | "generating" | "completed"
  message: string
  percentage: number
}

/**
 * Categorized tech stack
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
 * Enhanced repository information for HR
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
 * Detailed assessment with reasoning
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

/**
 * Scan document structure in Firestore
 */
export interface Scan {
  id: string
  repoUrl: string
  repoName?: string
  userId: string | null
  userEmail: string | null
  ip: string
  status: ScanStatus
  progress?: ScanProgress
  isPublic: boolean
  provider: string | null
  owner: string | null
  repo: string | null
  createdAt: Date | string
  updatedAt: Date | string
  startedAt: Date | string | null
  completedAt: Date | string | null
  description: string | null
  techStack: string[] | null
  categorizedTechStack?: CategorizedTechStack
  skillLevel: string | null
  repositoryInfo?: RepositoryInfo
  detailedAssessment?: DetailedAssessment
  error: string | null
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number
  remaining: number
  resetAt: Date
  used: number
}

/**
 * User quota information
 */
export interface UserQuota {
  maxScans: number
  usedScans: number
  remainingScans: number
  resetAt: Date
  isAuthenticated: boolean
}

/**
 * Skill level type
 */
export type SkillLevel = "Beginner" | "Junior" | "Mid-level" | "Senior"

/**
 * Skill level color mapping
 */
export const SKILL_LEVEL_COLORS: Record<SkillLevel, string> = {
  Beginner: "bg-green-100 text-green-800",
  Junior: "bg-blue-100 text-blue-800",
  "Mid-level": "bg-yellow-100 text-yellow-800",
  Senior: "bg-red-100 text-red-800",
}

/**
 * Scan status badge configuration
 */
export interface StatusBadgeConfig {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
}

export const SCAN_STATUS_CONFIG: Record<ScanStatus, StatusBadgeConfig> = {
  queued: { label: "Queued", variant: "secondary" },
  running: { label: "Running", variant: "default" },
  succeeded: { label: "Completed", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
}
