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

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

// Model configuration
const MODEL_NAME = "gemini-2.5-pro"
const GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
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
 *
 * @interface AnalysisResult
 * @property {string} description - Natural language project description (2-3 sentences)
 * @property {string[]} techStack - Array of technologies, frameworks, and tools used
 * @property {'Beginner'|'Junior'|'Mid-level'|'Senior'} skillLevel - Required expertise level
 * @property {string} [skillLevelReasoning] - Explanation for skill level assessment
 * @property {Object} [projectComplexity] - Detailed complexity breakdown
 * @property {string} [projectComplexity.architecture] - Architecture complexity rating
 * @property {string} [projectComplexity.codeQuality] - Code quality assessment
 * @property {string} [projectComplexity.testCoverage] - Testing coverage level
 * @property {string} [projectComplexity.documentation] - Documentation quality
 * @property {string[]} [keyFeatures] - Notable features of the project
 * @property {string[]} [suggestedImprovements] - Recommendations for improvement
 */
export interface AnalysisResult {
  description: string
  techStack: string[]
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
  } catch (error) {
    console.error("Quick analysis failed:", error)

    // Ultimate fallback - return generic result
    return {
      description: "Unable to analyze repository automatically. Please review manually.",
      techStack: ["Unknown"],
      skillLevel: "Mid-level",
      skillLevelReasoning: "Automatic analysis failed",
    }
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
