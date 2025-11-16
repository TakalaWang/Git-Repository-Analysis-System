/**
 * Gemini AI Client
 *
 * Handles communication with Google's Gemini API for repository analysis.
 * Uses structured output (schema-based) for reliable response format.
 * Implements retry logic and error handling for robust AI integration.
 *
 *  @module gemini
 */

import { GoogleGenAI } from "@google/genai"
import { z } from "zod"
import { getSystemPrompt, getAnalysisPrompt, RepositoryContext, getTimelinePrompt } from "./prompts"
import { MaliciousContentError, GeminiRateLimitError, AppError } from "./errors"

/**
 * Gemini AI client instance.
 * @private
 */
const GENAI_API_KEY = process.env.GENAI_API_KEY ?? ""
if (!GENAI_API_KEY) {
  throw new Error("GENAI_API_KEY is required")
}
const genAI = new GoogleGenAI({
  apiKey: GENAI_API_KEY,
  httpOptions: {
    baseUrl: "https://gemini-reverse-proxy.jacob.workers.dev/",
  },
})

/**
 * Gemini model name to use for analysis.
 * Configurable via GEMINI_MODEL environment variable.
 * @constant
 */
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash"

/**
 * Maximum number of retry attempts for failed Gemini API calls.
 * Configurable via GEMINI_MAX_RETRIES environment variable.
 * @constant
 */
const MAX_RETRIES = parseInt(process.env.GEMINI_MAX_RETRIES || "3", 10)

/**
 * Delay in milliseconds (base) used for exponential backoff on retry.
 * For 429 we use this as the base; for 5xx/timeout we use a smaller base.
 * Configurable via GEMINI_RETRY_DELAY_SECONDS.
 * @constant
 */
const RETRY_BASE_MS = parseInt(process.env.GEMINI_RETRY_DELAY_SECONDS || "60", 10) * 1000

/**
 * Configuration for Gemini AI text generation.
 * Temperature and max output tokens can be configured via environment variables.
 * @constant
 */
const GENERATION_CONFIG = {
  temperature: parseFloat(process.env.GEMINI_TEMPERATURE || "0.7"),
  topP: 0.95,
  topK: 40,
  maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || "8192", 10),
}

/**
 * JSON Schema for structured output from Gemini AI.
 * Ensures the model returns data in the exact format we need.
 *
 * (Defined with Zod and converted to JSON Schema at runtime)
 */
const DetailedAssessmentSchema = z.object({
  skillLevel: z.enum(["Beginner", "Junior", "Mid-level", "Senior"]),
  reasoning: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
  codeQuality: z.string().optional(),
  architectureRating: z.string().optional(),
  testCoverage: z.string().optional(),
})

const AnalysisResultSchema = z.object({
  description: z.string().describe("Natural language project description (2-3 sentences)"),
  techStack: z.array(z.string()).describe("Array of technologies, frameworks, and tools used"),
  categorizedTechStack: z
    .object({
      frontend: z.array(z.string()).optional(),
      backend: z.array(z.string()).optional(),
      database: z.array(z.string()).optional(),
      devops: z.array(z.string()).optional(),
      tools: z.array(z.string()).optional(),
      other: z.array(z.string()).optional(),
    })
    .optional(),
  repositoryInfo: z
    .object({
      name: z.string().describe("Repository name"),
      description: z.string().describe("What the project does"),
      teamSize: z.enum(["Solo", "Small (2-5)", "Medium (6-20)", "Large (20+)"]).optional(),
      projectDuration: z.string().optional(),
      complexity: z.enum(["Low", "Medium", "High"]).optional(),
      mainPurpose: z.string().optional(),
      targetAudience: z.string().optional(),
    })
    .optional(),
  detailedAssessment: DetailedAssessmentSchema.optional(),
  skillLevel: z
    .enum(["Beginner", "Junior", "Mid-level", "Senior"])
    .describe("Required expertise level"),
  skillLevelReasoning: z.string().optional(),
  projectComplexity: z
    .object({
      architecture: z.string(),
      codeQuality: z.string(),
      testCoverage: z.string(),
      documentation: z.string(),
    })
    .optional(),
  keyFeatures: z.array(z.string()).optional(),
  suggestedImprovements: z.array(z.string()).optional(),
})

/**
 * Structured analysis result from Gemini AI.
 * (Exported with the same name to avoid breaking external imports)
 */
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

/**
 * JSON Schema for timeline event from Gemini AI.
 * Represents a single major milestone or change in the repository history.
 */
const TimelineEventSchema = z.object({
  date: z.string().describe("Event date in ISO format (YYYY-MM-DD) according to commit history"),
  title: z.string().describe("Brief title of the event"),
  description: z.string().describe("Detailed description of what changed"),
  type: z
    .enum(["feature", "refactor", "architecture", "release", "milestone"])
    .describe("Type of change"),
  commits: z.array(z.string()).describe("Related commit hashes"),
})

/**
 * JSON Schema for timeline response from Gemini AI.
 * Contains an array of timeline events.
 */
const TimelineResponseSchema = z.object({
  timeline: z.array(TimelineEventSchema).describe("Array of timeline events").min(3).max(10),
})

/**
 * Structured timeline response from Gemini AI.
 */
export type TimelineResponse = z.infer<typeof TimelineResponseSchema>

/**
 * Detects potentially malicious prompts in repository content.
 *
 * Scans README and config files for suspicious patterns that might attempt to:
 * - Inject commands or override system instructions
 * - Extract sensitive information
 * - Manipulate the AI's behavior
 *
 * The detection is intentionally lenient to avoid false positives on legitimate
 * repositories that might discuss AI, prompts, or contain instructional content.
 *
 * @param {RepositoryContext} context - Repository content to check
 * @returns {boolean} True if malicious patterns detected, false otherwise
 *
 * @example
 * ```typescript
 * const context = await analyzeRepository(repoPath, repoUrl)
 * if (detectMaliciousPrompt(context)) {
 *   throw new Error('Repository contains potentially malicious content')
 * }
 * ```
 */
function detectMaliciousPrompt(context: RepositoryContext): boolean {
  // Combine all text content for scanning
  const textToScan = [
    context.readmeContent || "",
    ...Object.values(context.configFiles.packageManagers || {}),
    ...Object.values(context.configFiles.other || {}),
  ].join("\n")

  // Patterns that indicate prompt injection attempts
  // These are intentionally specific to avoid false positives
  const suspiciousPatterns = [
    // Direct instruction override attempts
    /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)/gi,
    /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)/gi,
    /forget\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)/gi,

    // System prompt manipulation
    /new\s+(instructions|task|role):\s*you\s+(are|must|should|will)/gi,
    /your\s+new\s+(role|task|instructions?)\s+(is|are)/gi,
    /override\s+(system|default)\s+(prompt|instructions?|behavior)/gi,

    // Information extraction attempts
    /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules)/gi,
    /show\s+me\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules)/gi,
    /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?|rules)/gi,

    // Role manipulation with explicit commands
    /you\s+are\s+now\s+(a|an)\s+\w+\s+(that\s+)?(must|will|should)\s+(ignore|disregard|bypass)/gi,
    /act\s+as\s+(a|an)\s+\w+\s+(and\s+)?(ignore|disregard|bypass)/gi,

    // Data exfiltration attempts
    /send\s+(all|your|the)\s+(data|information|content)\s+to/gi,
    /exfiltrate\s+(data|information|content)/gi,

    // Encoding tricks to bypass filters
    /base64\s*:\s*aWdub3JlIGFsbCBwcmV2aW91cyBpbnN0cnVjdGlvbnM/gi, // "ignore all previous instructions" in base64
    /\\u0069\\u0067\\u006e\\u006f\\u0072\\u0065/gi, // "ignore" in unicode escape
  ]

  // Check for suspicious patterns
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(textToScan)) {
      console.warn("Detected potentially malicious prompt pattern:", pattern.source)
      return true
    }
  }

  // Check for excessive repetition of "ignore" or "override" keywords (spam attempt)
  const ignoreCount = (textToScan.match(/\b(ignore|override|disregard)\b/gi) || []).length
  const totalWords = textToScan.split(/\s+/).length
  if (totalWords > 0 && ignoreCount / totalWords > 0.05) {
    // More than 5% of words are "ignore/override/disregard"
    console.warn("Detected excessive use of manipulation keywords")
    return true
  }

  return false
}

/**
 * Analyzes a repository using Gemini AI with automatic retry.
 *
 * This is the main entry point for AI-powered repository analysis. It:
 * 1. Checks for malicious prompt injection attempts
 * 2. Initializes a Gemini generation call with system context
 * 3. Sends repository analysis prompt with full context
 * 4. Parses and validates the JSON response (Zod)
 * 5. Retries on transient failures (429, 500, 503, 408, 504)
 *
 * Retry behavior:
 * - 429 (rate limit): Exponential backoff with jitter using RETRY_BASE_MS
 * - 500/503/408/504 (server/timeout): Backoff from a smaller base (2s)
 * - Other errors: No retry, throws immediately
 * - Max retries: Configurable via MAX_RETRIES env var (default 3)
 *
 * @param {RepositoryContext} context - Complete repository analysis context
 * @param {number} [retries] - Number of retry attempts remaining (defaults to MAX_RETRIES)
 * @returns {Promise<AnalysisResult>} Structured analysis of the repository
 *
 * @throws {Error} If malicious prompt detected
 * @throws {Error} If all analysis attempts fail
 *
 * @example
 * ```typescript
 * const context = await analyzeRepositoryContent(repoPath, repoUrl)
 * const analysis = await analyzeRepositoryWithAI(context)
 *
 * console.log(analysis.description)
 * console.log(`Tech Stack: ${analysis.techStack.join(', ')}`)
 * console.log(`Skill Level: ${analysis.skillLevel}`)
 * ```
 */
export async function analyzeRepositoryWithAI(
  context: RepositoryContext,
  retries: number = MAX_RETRIES
): Promise<AnalysisResult> {
  // Check for malicious prompt injection before processing
  if (detectMaliciousPrompt(context)) {
    throw new MaliciousContentError(
      "Repository contains potentially malicious content that attempts to manipulate the analysis system"
    )
  }

  // Build prompts
  const systemInstruction = { role: "model", parts: [{ text: getSystemPrompt() }] }
  const analysisPrompt = getAnalysisPrompt(context)

  let lastErr: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use structured output with response schema
      const response = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: [systemInstruction, { role: "user", parts: [{ text: analysisPrompt }] }],
        config: {
          ...GENERATION_CONFIG,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(AnalysisResultSchema),
        },
      })
      // The SDK returns JSON text when responseMimeType is application/json
      // Validate semantics with Zod to ensure correct field types/enums
      const text = response.text
      if (!text) {
        throw new AppError("Empty response from Gemini API", "UNKNOWN_ERROR")
      }
      const parsed = AnalysisResultSchema.parse(JSON.parse(text))
      return parsed
    } catch (error: unknown) {
      lastErr = error

      const err = error as { status?: number; response?: { status?: number }; message?: string }
      const status: number | undefined =
        err.status ??
        err.response?.status ??
        (typeof err.message === "string" && /\b(429|500|503|408|504)\b/.test(err.message)
          ? parseInt(RegExp.$1, 10)
          : undefined)

      if (attempt < retries && isRetriableStatus(status)) {
        const base = status === 429 || status === 503 ? RETRY_BASE_MS : 2000
        const delayMs = jitteredDelay(base, attempt)
        await delay(delayMs)
        continue
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      // Gemini rate limit exceeded (after all retries)
      if (status === 429 || status === 503) {
        throw new GeminiRateLimitError(`Gemini API rate limit exceeded: ${errorMessage}`)
      }

      // Other Gemini errors - wrap in AppError with UNKNOWN_ERROR code
      throw new AppError(`Gemini AI analysis failed: ${errorMessage}`, "UNKNOWN_ERROR")
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
  throw new AppError(`Gemini AI analysis failed after retries: ${msg}`, "UNKNOWN_ERROR")
}

/**
 * Utility function to delay execution (used in retry logic).
 *
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after delay
 *
 * @private
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Internal: full-jitter truncated exponential backoff helper. */
function jitteredDelay(base: number, attempt: number): number {
  const max = Math.min(60_000, base * 2 ** attempt)
  return Math.floor(Math.random() * (max + 1))
}

/** Internal: which HTTP statuses should be retried. */
function isRetriableStatus(status?: number): boolean {
  return status === 429 || status === 500 || status === 503 || status === 408 || status === 504
}

/**
 * Analyzes Git commit history to identify major milestones and changes using Gemini AI.
 *
 * Uses structured output with Zod schema to ensure reliable response format.
 * Identifies 15-30 events including all important changes such as features,
 * refactors, releases, etc.
 *
 * @param {Array<{date: string, message: string, hash: string}>} commits - Array of commit information
 * @param {string} repoUrl - Repository URL for context
 * @param {number} [retries] - Number of retry attempts remaining (defaults to MAX_RETRIES)
 * @returns {Promise<TimelineResponse>} Structured timeline with events
 *
 * @throws {Error} If timeline analysis fails after all retries
 *
 * @example
 * ```typescript
 * const commits = await getGitLog(repoPath, 500)
 * const result = await analyzeTimelineWithAI(commits, repoUrl)
 * console.log(`Found ${result.timeline.length} events`)
 * ```
 */
export async function analyzeTimelineWithAI(
  commits: Array<{ date: string; message: string; hash: string }>,
  repoUrl: string,
  retries: number = MAX_RETRIES
): Promise<TimelineResponse> {
  const prompt = getTimelinePrompt(commits, repoUrl)

  let lastErr: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use structured output with response schema
      const response = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          ...GENERATION_CONFIG,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(TimelineResponseSchema),
        },
      })

      const text = response.text
      if (!text) {
        throw new AppError("Empty response from Gemini API", "UNKNOWN_ERROR")
      }

      // Parse and validate with Zod
      const parsed = TimelineResponseSchema.parse(JSON.parse(text))
      return parsed
    } catch (error: unknown) {
      lastErr = error

      const err = error as { status?: number; response?: { status?: number }; message?: string }
      const status: number | undefined =
        err.status ??
        err.response?.status ??
        (typeof err.message === "string" && /\b(429|500|503|408|504)\b/.test(err.message)
          ? parseInt(RegExp.$1, 10)
          : undefined)

      if (attempt < retries && isRetriableStatus(status)) {
        const base = status === 429 || status === 503 ? RETRY_BASE_MS : 2000
        const delayMs = jitteredDelay(base, attempt)
        await delay(delayMs)
        continue
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      // Gemini rate limit exceeded (after all retries)
      if (status === 429 || status === 503) {
        throw new GeminiRateLimitError(`Gemini API rate limit exceeded: ${errorMessage}`)
      }

      // Other Gemini errors - wrap in AppError with UNKNOWN_ERROR code
      throw new AppError(`Gemini timeline analysis failed: ${errorMessage}`, "UNKNOWN_ERROR")
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
  throw new AppError(`Gemini timeline analysis failed after retries: ${msg}`, "UNKNOWN_ERROR")
}
