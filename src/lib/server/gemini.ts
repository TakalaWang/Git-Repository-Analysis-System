/**
 * Gemini AI Client
 *
 * Handles communication with Google's Gemini API for repository analysis.
 * Uses structured output (schema-based) for reliable response format.
 * Implements retry logic and error handling for robust AI integration.
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"
import {
  getSystemPrompt,
  getAnalysisPrompt,
  getQuickSummaryPrompt,
  RepositoryContext,
} from "./prompts"

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
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-pro"

/**
 * Maximum number of retry attempts for failed Gemini API calls.
 * Configurable via GEMINI_MAX_RETRIES environment variable.
 * @constant
 */
const MAX_RETRIES = parseInt(process.env.GEMINI_MAX_RETRIES || "3", 10)

/**
 * Delay in milliseconds between retry attempts.
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
 * Analyzes a repository using Gemini AI with automatic retry and fallback.
 *
 * This is the main entry point for AI-powered repository analysis. It:
 * 1. Initializes a Gemini chat session with system context
 * 2. Sends repository analysis prompt with full context
 * 3. Parses and validates the JSON response
 * 4. Retries on failure (up to specified attempts)
 * 5. Falls back to quick summary if full analysis fails
 * 6. Returns generic result if all attempts fail
 *
 * The function implements a three-tier fallback strategy:
 * - Primary: Full analysis with complete context
 * - Secondary: Quick summary with README only (on failure)
 * - Tertiary: Generic fallback result (on complete failure)
 *
 * @param {RepositoryContext} context - Complete repository analysis context
 * @param {number} [retries=2] - Number of retry attempts on failure
 * @returns {Promise<AnalysisResult>} Structured analysis of the repository
 *
 * @throws Never throws - always returns a result (may be generic fallback)
 *
 * @example
 * ```typescript
 * const context = await analyzeRepository(repoPath, repoUrl)
 * const analysis = await analyzeRepository(context)
 *
 * console.log(analysis.description)
 * console.log(`Tech Stack: ${analysis.techStack.join(', ')}`)
 * console.log(`Skill Level: ${analysis.skillLevel}`)
 *
 * // With custom retry count
 * const analysis = await analyzeRepository(context, 3)
 * ```
 */
export async function analyzeRepository(
  context: RepositoryContext,
  retries: number = 2
): Promise<AnalysisResult> {
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

    // Retry logic
    if (retries > 0) {
      console.log(`Retrying analysis... (${retries} attempts left)`)
      await delay(2000) // Wait 2 seconds before retry
      return analyzeRepository(context, retries - 1)
    }

    // Fallback to quick summary
    console.log("Attempting quick summary as fallback...")
    return getQuickAnalysis(context.repoUrl, context.readmeContent)
  }
}

/**
 * Get quick analysis when full analysis fails (fallback).
 * Also uses structured output for consistent format.
 *
 * @param repoUrl - Repository URL
 * @param readmeContent - README content
 * @returns Simplified analysis result
 *
 * @private
 */
async function getQuickAnalysis(repoUrl: string, readmeContent?: string): Promise<AnalysisResult> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Use structured output for quick analysis too
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          ...GENERATION_CONFIG,
          responseMimeType: "application/json",
          responseSchema: ANALYSIS_SCHEMA,
        },
      })

      const prompt = getQuickSummaryPrompt(repoUrl, readmeContent)
      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      // Parse JSON response (guaranteed format)
      return JSON.parse(text) as AnalysisResult
    } catch (error: unknown) {
      lastError = error as Error
      const errorObj = error as { status?: number; errorDetails?: Array<Record<string, unknown>> }

      // Check if it's a quota/rate limit error (429)
      if (errorObj.status === 429) {
        // Extract retry delay from error if available
        let retryDelay = RETRY_DELAY_MS

        if (Array.isArray(errorObj.errorDetails)) {
          const retryInfo = errorObj.errorDetails.find(
            (detail) => detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
          ) as { retryDelay?: string } | undefined

          if (retryInfo?.retryDelay) {
            const seconds = parseInt(retryInfo.retryDelay.replace("s", ""))
            retryDelay = seconds * 1000
          }
        }

        if (attempt < MAX_RETRIES) {
          console.warn(
            `Gemini API quota exceeded (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${retryDelay / 1000}s...`
          )
          await delay(retryDelay)
          continue
        }
      }

      console.error(`Quick analysis failed (attempt ${attempt}/${MAX_RETRIES}):`, error)

      // If not a rate limit error or last attempt, break
      if (errorObj.status !== 429 || attempt === MAX_RETRIES) {
        break
      }
    }
  }

  console.error("All quick analysis attempts failed:", lastError)

  // Ultimate fallback - return generic result
  return {
    description:
      "Unable to analyze repository automatically due to API rate limits. Please try again later.",
    techStack: ["Unknown"],
    skillLevel: "Mid-level",
    skillLevelReasoning: "Automatic analysis unavailable - API quota exceeded",
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

/**
 * Tests connectivity and authentication with Gemini API.
 *
 * Sends a simple test message to verify:
 * - API key is valid
 * - Network connection is working
 * - Gemini service is accessible
 *
 * Useful for health checks and startup validation.
 *
 * @returns {Promise<boolean>} True if connection successful, false otherwise
 *
 * @example
 * ```typescript
 * // Check API status on startup
 * if (await testGeminiConnection()) {
 *   console.log('✓ Gemini API connected')
 * } else {
 *   console.error('✗ Gemini API unavailable')
 * }
 *
 * // Health check endpoint
 * export async function GET() {
 *   const geminiOk = await testGeminiConnection()
 *   return NextResponse.json({
 *     status: geminiOk ? 'healthy' : 'degraded',
 *     gemini: geminiOk
 *   })
 * }
 * ```
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME })
    const result = await model.generateContent('Hello, respond with "OK" if you can read this.')
    const response = result.response.text()
    return response.toLowerCase().includes("ok")
  } catch (error) {
    console.error("Gemini connection test failed:", error)
    return false
  }
}
