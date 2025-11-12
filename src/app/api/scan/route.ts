/**
 * Repository Scan API Endpoint
 *
 * POST /api/scan - Submit a repository for automated analysis
 *
 * This endpoint handles repository scan requests with comprehensive features:
 * - Authentication support (optional - works for both anonymous and logged-in users)
 * - Rate limiting (3/hour for anonymous, 20/hour for authenticated)
 * - URL validation and accessibility checks
 * - Asynchronous processing via queue
 * - Immediate response with scan ID for status polling
 *
 * Flow:
 * 1. Validate repository URL format
 * 2. Check rate limits (IP-based or UID-based)
 * 3. Verify repository is accessible
 * 4. Create Firestore document with 'queued' status
 * 5. Add to processing queue
 * 6. Return scan ID immediately (202 Accepted)
 *
 * The actual scanning happens asynchronously in the background.
 * Clients should poll GET /api/scan/[id] to check status.
 *
 * @module api/scan
 */

import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/server/firebase-admin"
import { checkRateLimit, RATE_LIMITS } from "@/lib/server/rate-limiter"
import { isValidGitUrl, isRepositoryAccessible, parseGitUrl } from "@/lib/server/git-handler"
import { enqueueScan } from "@/lib/server/scan-queue"
import { getClientIp } from "@/lib/server/ip-utils"

/**
 * POST handler for repository scan requests.
 *
 * Request body:
 * ```json
 * {
 *   "repoUrl": "https://github.com/owner/repo"
 * }
 * ```
 *
 * Optional authentication header:
 * ```
 * Authorization: Bearer <FIREBASE_ID_TOKEN>
 * ```
 *
 * Success response (202 Accepted):
 * ```json
 * {
 *   "success": true,
 *   "scanId": "abc123",
 *   "status": "queued",
 *   "message": "Repository scan has been queued for analysis",
 *   "estimatedTime": "2-5 minutes",
 *   "statusUrl": "/api/scan/abc123",
 *   "resultUrl": "/results/abc123"
 * }
 * ```
 *
 * Error responses:
 * - 400: Invalid URL, missing repoUrl, or repository not accessible
 * - 429: Rate limit exceeded
 * - 500: Internal server error
 *
 * @param {NextRequest} request - Next.js request object
 * @returns {Promise<NextResponse>} JSON response with scan ID or error
 */
export async function POST(request: NextRequest) {
  try {
    // Extract and validate request body
    const body = await request.json()
    const { repoUrl } = body

    if (!repoUrl || typeof repoUrl !== "string") {
      return NextResponse.json({ error: "Repository URL is required" }, { status: 400 })
    }

    // Validate Git URL format
    if (!isValidGitUrl(repoUrl)) {
      return NextResponse.json(
        {
          error: "Invalid repository URL. Please provide a valid GitHub, GitLab, or Bitbucket URL.",
          example: "https://github.com/owner/repo",
        },
        { status: 400 }
      )
    }

    // Get user authentication status
    const authHeader = request.headers.get("authorization")
    let userId: string | undefined
    let userEmail: string | undefined

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7)
        const decodedToken = await adminAuth.verifyIdToken(token)
        userId = decodedToken.uid
        userEmail = decodedToken.email
      } catch (error) {
        console.error("Token verification failed:", error)
        // Continue as anonymous user
      }
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, userId)

    if (!rateLimitResult.allowed) {
      const config = userId ? RATE_LIMITS.authenticated : RATE_LIMITS.anonymous
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `You have exceeded the limit of ${config.maxRequests} scans per ${config.windowLabel}. ${userId ? "Please try again later." : "Sign in to get more scans."}`,
          resetAt: rateLimitResult.resetAt,
          remaining: rateLimitResult.remaining,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.resetAt.toISOString(),
          },
        }
      )
    }

    // Check repository accessibility (quick check without cloning)
    console.log(`Checking repository accessibility: ${repoUrl}`)
    const isAccessible = await isRepositoryAccessible(repoUrl)

    if (!isAccessible) {
      return NextResponse.json(
        {
          error: "Repository not accessible",
          message:
            "Unable to access repository. Please ensure the repository is public and the URL is correct.",
        },
        { status: 400 }
      )
    }

    // Parse repository info
    const repoInfo = parseGitUrl(repoUrl)

    // Create scan document in Firestore
    const scanRef = adminDb.collection("scans").doc()
    const scanId = scanRef.id
    const clientIp = getClientIp(request)

    const scanData = {
      id: scanId,
      repoUrl,
      userId: userId || null,
      userEmail: userEmail || null,
      ip: clientIp,
      status: "queued",
      isPublic: !userId,
      provider: repoInfo.provider,
      owner: repoInfo.owner || null,
      repo: repoInfo.repo || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      completedAt: null,
      description: null,
      techStack: null,
      skillLevel: null,
      error: null,
    }

    await scanRef.set(scanData)

    // Add to scan queue for async processing
    await enqueueScan(scanId)

    console.log(`Scan created: ${scanId} for ${repoUrl} by ${userId || clientIp}`)

    // Return response with scan ID
    return NextResponse.json(
      {
        success: true,
        scanId,
        status: "queued",
        message: "Repository scan has been queued for analysis",
        estimatedTime: "2-5 minutes",
        statusUrl: `/api/scan/${scanId}`,
        resultUrl: `/results/${scanId}`,
      },
      {
        status: 202, // Accepted
        headers: {
          "X-RateLimit-Limit": (userId
            ? RATE_LIMITS.authenticated
            : RATE_LIMITS.anonymous
          ).maxRequests.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": rateLimitResult.resetAt.toISOString(),
        },
      }
    )
  } catch (error) {
    console.error("Scan API error:", error)

    const errorMessage = error instanceof Error ? error.message : "Internal server error"

    return NextResponse.json(
      {
        error: "Internal server error",
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}
