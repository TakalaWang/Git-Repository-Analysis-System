/**
 * Gemini AI Client
 *
 * Handles communication with Google's Gemini API for repository analysis.
 * Uses structured output (schema-based) for reliable response format.
 * Implements retry logic and error handling for robust AI integration.
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"
import { getSystemPrompt, getAnalysisPrompt, RepositoryContext } from "./prompts"
import { MaliciousContentError, GeminiRateLimitError, AppError } from "./errors"

/**
 * Gemini AI client instance.
 * @private
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

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
 * Delay in milliseconds between retry attempts for rate limit errors.
 * Configurable via GEMINI_RETRY_DELAY_SECONDS environment variable.
 * @constant
 */
const RETRY_DELAY_MS = parseInt(process.env.GEMINI_RETRY_DELAY_SECONDS || "60", 10) * 1000

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
 */
const ANALYSIS_SCHEMA = {
  type: SchemaType.OBJECT as const,
  properties: {
    description: {
      type: SchemaType.STRING as const,
      description: "Natural language project description (2-3 sentences)",
      nullable: false,
    },
    techStack: {
      type: SchemaType.ARRAY as const,
      description: "Array of technologies, frameworks, and tools used",
      items: {
        type: SchemaType.STRING as const,
      },
      nullable: false,
    },
    categorizedTechStack: {
      type: SchemaType.OBJECT as const,
      description: "Tech stack categorized by type",
      properties: {
        frontend: {
          type: SchemaType.ARRAY as const,
          items: { type: SchemaType.STRING as const },
          nullable: true,
        },
        backend: {
          type: SchemaType.ARRAY as const,
          items: { type: SchemaType.STRING as const },
          nullable: true,
        },
        database: {
          type: SchemaType.ARRAY as const,
          items: { type: SchemaType.STRING as const },
          nullable: true,
        },
        devops: {
          type: SchemaType.ARRAY as const,
          items: { type: SchemaType.STRING as const },
          nullable: true,
        },
        tools: {
          type: SchemaType.ARRAY as const,
          items: { type: SchemaType.STRING as const },
          nullable: true,
        },
        other: {
          type: SchemaType.ARRAY as const,
          items: { type: SchemaType.STRING as const },
          nullable: true,
        },
      },
      nullable: true,
    },
    repositoryInfo: {
      type: SchemaType.OBJECT as const,
      description: "Enhanced repository information for HR understanding",
      properties: {
        name: {
          type: SchemaType.STRING as const,
          description: "Repository name",
          nullable: false,
        },
        description: {
          type: SchemaType.STRING as const,
          description: "What the project does",
          nullable: false,
        },
        teamSize: {
          type: SchemaType.STRING as const,
          description: "Estimated team size (e.g., '1-2 developers', '5-10 person team')",
          nullable: true,
        },
        projectDuration: {
          type: SchemaType.STRING as const,
          description: "Estimated development time (e.g., '2-3 months', '6+ months')",
          nullable: true,
        },
        complexity: {
          type: SchemaType.STRING as const,
          description: "Overall complexity (Low/Medium/High/Very High)",
          nullable: false,
        },
        mainPurpose: {
          type: SchemaType.STRING as const,
          description: "Primary purpose of the project",
          nullable: true,
        },
        targetAudience: {
          type: SchemaType.STRING as const,
          description: "Who uses this project",
          nullable: true,
        },
      },
      nullable: true,
    },
    detailedAssessment: {
      type: SchemaType.OBJECT as const,
      description: "Detailed skill and quality assessment",
      properties: {
        skillLevel: {
          type: SchemaType.STRING as const,
          format: "enum" as const,
          enum: ["Beginner", "Junior", "Mid-level", "Senior"],
          nullable: false,
        },
        reasoning: {
          type: SchemaType.STRING as const,
          description: "Detailed explanation of skill level assessment",
          nullable: false,
        },
        strengths: {
          type: SchemaType.ARRAY as const,
          description: "Key strengths of the project",
          items: { type: SchemaType.STRING as const },
          nullable: false,
        },
        weaknesses: {
          type: SchemaType.ARRAY as const,
          description: "Areas needing improvement",
          items: { type: SchemaType.STRING as const },
          nullable: false,
        },
        recommendations: {
          type: SchemaType.ARRAY as const,
          description: "Specific recommendations for improvement",
          items: { type: SchemaType.STRING as const },
          nullable: false,
        },
        codeQuality: {
          type: SchemaType.STRING as const,
          description: "Code quality rating with explanation",
          nullable: true,
        },
        architectureRating: {
          type: SchemaType.STRING as const,
          description: "Architecture quality rating with explanation",
          nullable: true,
        },
        testCoverage: {
          type: SchemaType.STRING as const,
          description: "Testing coverage assessment",
          nullable: true,
        },
      },
      nullable: true,
    },
    skillLevel: {
      type: SchemaType.STRING as const,
      description: "Required expertise level",
      format: "enum" as const,
      enum: ["Beginner", "Junior", "Mid-level", "Senior"],
      nullable: false,
    },
    skillLevelReasoning: {
      type: SchemaType.STRING as const,
      description: "Explanation for skill level assessment",
      nullable: true,
    },
    projectComplexity: {
      type: SchemaType.OBJECT as const,
      description: "Detailed complexity breakdown",
      properties: {
        architecture: {
          type: SchemaType.STRING as const,
          description: "Architecture complexity rating",
          nullable: false,
        },
        codeQuality: {
          type: SchemaType.STRING as const,
          description: "Code quality assessment",
          nullable: false,
        },
        testCoverage: {
          type: SchemaType.STRING as const,
          description: "Testing coverage level",
          nullable: false,
        },
        documentation: {
          type: SchemaType.STRING as const,
          description: "Documentation quality",
          nullable: false,
        },
      },
      nullable: true,
    },
    keyFeatures: {
      type: SchemaType.ARRAY as const,
      description: "Notable features of the project",
      items: {
        type: SchemaType.STRING as const,
      },
      nullable: true,
    },
    suggestedImprovements: {
      type: SchemaType.ARRAY as const,
      description: "Recommendations for improvement",
      items: {
        type: SchemaType.STRING as const,
      },
      nullable: true,
    },
  },
  required: ["description", "techStack", "skillLevel"],
}

/**
 * Structured analysis result from Gemini AI.
 */
export interface AnalysisResult {
  description: string
  techStack: string[]
  categorizedTechStack?: {
    frontend?: string[]
    backend?: string[]
    database?: string[]
    devops?: string[]
    tools?: string[]
    other?: string[]
  }
  repositoryInfo?: {
    name: string
    description: string
    teamSize?: string
    projectDuration?: string
    complexity: string
    mainPurpose?: string
    targetAudience?: string
  }
  detailedAssessment?: {
    skillLevel: "Beginner" | "Junior" | "Mid-level" | "Senior"
    reasoning: string
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    codeQuality?: string
    architectureRating?: string
    testCoverage?: string
  }
  skillLevel: "Beginner" | "Junior" | "Mid-level" | "Senior"
  skillLevelReasoning?: string
  projectComplexity?: {
    architecture: string
    codeQuality: string
    testCoverage: string
    documentation: string
  }
  keyFeatures?: string[]
  suggestedImprovements?: string[]
}

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
 * 2. Initializes a Gemini chat session with system context
 * 3. Sends repository analysis prompt with full context
 * 4. Parses and validates the JSON response
 * 5. Retries on transient failures (429, 500, 503 errors)
 *
 * Retry behavior:
 * - 429 (rate limit): Waits RETRY_DELAY_MS (default 60s) before retry
 * - 500/503 (server error): Waits 2s before retry
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

  try {
    // Use structured output with response schema
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        ...GENERATION_CONFIG,
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
      },
    })

    // Build prompt with context (no need for JSON format instructions)
    const systemPrompt = getSystemPrompt()
    const analysisPrompt = getAnalysisPrompt(context)

    // Create chat session for better context handling
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [
            {
              text: "I understand. I will analyze repositories and provide accurate technical assessments.",
            },
          ],
        },
      ],
    })

    // Send analysis request - response will automatically conform to schema
    const result = await chat.sendMessage(analysisPrompt)
    const response = result.response
    const text = response.text()

    // Parse JSON response (no need for markdown cleanup - guaranteed JSON)
    const analysis: AnalysisResult = JSON.parse(text)

    // Validate required fields (should always be present with schema)
    if (!analysis.description || !analysis.techStack || !analysis.skillLevel) {
      throw new Error("Invalid analysis result: missing required fields")
    }

    return analysis
  } catch (error) {
    console.error("Gemini analysis failed:", error)

    // Retry logic for transient errors
    if (retries > 0) {
      const err = error as { status?: number; message?: string }

      // Retry on API errors (429 rate limit, 500 server errors, timeouts)
      if (err.status === 429 || err.status === 500 || err.status === 503) {
        const delayMs = err.status === 429 ? RETRY_DELAY_MS : 2000
        console.log(`Retrying analysis... (${retries} attempts left, waiting ${delayMs}ms)`)
        await delay(delayMs)
        return analyzeRepositoryWithAI(context, retries - 1)
      }
    }

    // Check for specific error types and throw appropriate errors
    const err = error as { status?: number; message?: string }
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    // Gemini rate limit exceeded (after all retries)
    if (
      err.status === 429 ||
      errorMessage.includes("429") ||
      errorMessage.includes("RESOURCE_EXHAUSTED")
    ) {
      throw new GeminiRateLimitError(`Gemini API rate limit exceeded: ${errorMessage}`)
    }

    // Other Gemini errors - wrap in AppError with UNKNOWN_ERROR code
    throw new AppError(`Gemini AI analysis failed: ${errorMessage}`, "UNKNOWN_ERROR")
  }
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
