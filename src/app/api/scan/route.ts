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
 * - Always creates a scan record (even if rate limit exceeded)
 * - Immediate response with scan ID
 *
 * Flow:
 * 1. Validate repository URL format
 * 2. Verify repository is accessible
 * 3. Check rate limits (IP-based or UID-based)
 * 4. Create Firestore scan document:
 *    - If rate limit exceeded: status='failed', no analysis
 *    - If cache exists: status='succeeded', copy cached analysis
 *    - Otherwise: status='queued', add to processing queue
 * 5. Return scan ID immediately
 *
 * The actual scanning happens asynchronously in the background.
 * Clients should subscribe to Firestore 'scans' collection to get real-time updates.
 *
 * @module api/scan
 */

import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/server/firebase-admin"
import { checkRateLimit, RATE_LIMITS } from "@/lib/server/rate-limiter"
import { parseGitUrl } from "@/lib/server/git-handler"
import { enqueueScan } from "@/lib/server/scan-queue"
import { getClientIp, hashIp, isValidIp } from "@/lib/server/ip-utils"

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
 * Success response (202 Accepted) - New scan queued:
 * ```json
 * {
 *   "success": true,
 *   "scanId": "abc123",
 *   "status": "queued",
 *   "message": "Repository scan has been queued for analysis",
 *   "estimatedTime": "2-5 minutes",
 *   "resultUrl": "/scan/abc123"
 * }
 * ```
 *
 * Success response (200 OK) - Cached result:
 * ```json
 * {
 *   "success": true,
 *   "scanId": "abc123",
 *   "status": "succeeded",
 *   "message": "Repository scan completed (using cached results)",
 *   "estimatedTime": "0 seconds",
 *   "cached": true,
 *   "resultUrl": "/scan/abc123"
 * }
 * ```
 *
 * Rate limit exceeded response (429) - Scan created but failed:
 * ```json
 * {
 *   "success": false,
 *   "scanId": "abc123",
 *   "status": "failed",
 *   "error": "Rate limit exceeded",
 *   "message": "You have reached the limit of 3 scans per hour. Sign in to get more scans (20 per hour).",
 *   "resetAt": "2025-01-12T11:00:00.000Z",
 *   "resultUrl": "/scan/abc123"
 * }
 * ```
 *
 * Error responses:
 * - 400: Invalid URL, missing repoUrl, or repository not accessible
 * - 429: Rate limit exceeded (scan record created with failed status)
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
    console.log(`Received scan request for ${repoUrl} from ${userId || "anonymous user"}`)

    // Parse repository info
    const repoInfo = parseGitUrl(repoUrl)

    // Prepare client IP information
    const clientIp = getClientIp(request)
    const ipToStore = clientIp && isValidIp(clientIp) ? clientIp : "unknown"
    const ipHash = userId ? null : hashIp(ipToStore)

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, userId)
    const config = userId ? RATE_LIMITS.authenticated : RATE_LIMITS.anonymous
    const rateLimitExceeded = !rateLimitResult.allowed

    // Create scan document in Firestore (ALWAYS create, even if rate limit exceeded)
    const scanRef = adminDb.collection("scans").doc()
    const scanId = scanRef.id

    // Determine initial scan status
    const scanStatus: string = rateLimitExceeded ? "failed" : "queued"
    const scanError: string | null = rateLimitExceeded
      ? `Rate limit exceeded. You have reached the limit of ${config.maxRequests} scans per ${config.windowLabel}. ${userId ? "Please try again later." : "Sign in to get more scans (20 per hour)."}`
      : null
    const errorType = rateLimitExceeded ? "client" : null
    const errorCode = rateLimitExceeded ? "RATE_LIMIT_EXCEEDED" : null

    // Build scan data
    const scanData: Record<string, unknown> = {
      id: scanId,
      repoUrl,
      userId: userId || null,
      userEmail: userEmail || null,
      ip: ipToStore,
      ipHash,
      status: scanStatus,
      provider: repoInfo.provider,
      owner: repoInfo.owner || null,
      repo: repoInfo.repo || null,
      commitHash: null, // Will be set by queue processor
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: rateLimitExceeded ? new Date() : null,
      completedAt: rateLimitExceeded ? new Date() : null,
      error: scanError,
      errorType,
      errorCode,
      description: null,
      techStack: null,
      skillLevel: null,
    }

    await scanRef.set(scanData)
    console.log(`Scan ${scanId} created with status: ${scanStatus}`)

    // If rate limit exceeded, return error response (but scan is recorded)
    if (rateLimitExceeded) {
      console.log(`Scan ${scanId} rejected due to rate limit for ${userId || clientIp}`)
      return NextResponse.json(
        {
          success: false,
          scanId,
          status: "failed",
          error: "Rate limit exceeded",
          message: scanError,
          resetAt: rateLimitResult.resetAt,
          resultUrl: `/scan/${scanId}`,
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

    // Add to scan queue for async processing
    await enqueueScan(scanId)
    console.log(`Scan ${scanId} queued for processing by ${userId || clientIp}`)

    // Return response with scan ID
    return NextResponse.json(
      {
        success: true,
        scanId,
        status: "queued",
        message: "Repository scan has been queued for analysis",
        estimatedTime: "2-5 minutes",
        resultUrl: `/scan/${scanId}`,
      },
      {
        status: 202, // 202 Accepted
        headers: {
          "X-RateLimit-Limit": config.maxRequests.toString(),
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
