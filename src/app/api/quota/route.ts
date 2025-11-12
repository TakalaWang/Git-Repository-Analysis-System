/**
 * Quota API Endpoint
 *
 * GET /api/quota - Fetch user's remaining scan quota
 *
 * Returns quota information including:
 * - Maximum scans allowed per hour
 * - Number of scans used in current window
 * - Number of scans remaining
 * - Time when quota resets
 *
 * Works for both authenticated (UID-based) and anonymous (IP-based) users.
 *
 * @module api/quota
 */

import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/server/firebase-admin"
import { getClientIp, hashIp } from "@/lib/server/ip-utils"
import { RATE_LIMITS } from "@/lib/server/rate-limiter"

/**
 * GET handler for quota information retrieval.
 *
 * This endpoint provides real-time quota information for the current user,
 * allowing frontends to display remaining scans and warn users before
 * they hit rate limits.
 *
 * Optional authentication header:
 * ```
 * Authorization: Bearer <FIREBASE_ID_TOKEN>
 * ```
 *
 * Success response (200 OK) - Authenticated user:
 * ```json
 * {
 *   "maxScans": 20,
 *   "usedScans": 5,
 *   "remainingScans": 15,
 *   "resetAt": "2025-01-12T13:00:00.000Z",
 *   "isAuthenticated": true
 * }
 * ```
 *
 * Success response (200 OK) - Anonymous user:
 * ```json
 * {
 *   "maxScans": 3,
 *   "usedScans": 2,
 *   "remainingScans": 1,
 *   "resetAt": "2025-01-12T11:30:00.000Z",
 *   "isAuthenticated": false
 * }
 * ```
 *
 * Error responses:
 * - 500: Internal server error
 *
 * Notes:
 * - Anonymous users are tracked by IP address (hashed for privacy)
 * - Authenticated users are tracked by UID
 * - Quota limits are configurable via environment variables
 *
 * @param {NextRequest} request - Next.js request object
 * @returns {Promise<NextResponse>} JSON response with quota information
 */
export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null
    let identifier: string
    let config: typeof RATE_LIMITS.anonymous | typeof RATE_LIMITS.authenticated

    // Check for authentication token
    const authHeader = request.headers.get("authorization")

    if (authHeader?.startsWith("Bearer ")) {
      const idToken = authHeader.substring(7)
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        userId = decodedToken.uid
        identifier = userId
        config = RATE_LIMITS.authenticated
      } catch (error) {
        console.error("Token verification failed:", error)
        // Fall back to anonymous
        const clientIp = getClientIp(request)
        identifier = await hashIp(clientIp)
        config = RATE_LIMITS.anonymous
      }
    } else {
      // Anonymous user - use IP-based tracking
      const clientIp = getClientIp(request)
      identifier = await hashIp(clientIp)
      config = RATE_LIMITS.anonymous
    }

    // Fetch rate limit document from Firestore
    const rateLimitRef = adminDb.collection("rateLimits").doc(identifier)
    const rateLimitDoc = await rateLimitRef.get()

    let usedScans = 0
    const now = new Date()
    const windowStart = new Date(now.getTime() - config.windowMs)

    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data()

      if (data && data.requests && Array.isArray(data.requests)) {
        // Filter requests within the current window
        const validRequests = data.requests.filter((timestamp: unknown) => {
          const requestTime =
            timestamp && typeof timestamp === "object" && "toDate" in timestamp
              ? (timestamp as { toDate: () => Date }).toDate()
              : new Date(timestamp as string)
          return requestTime > windowStart
        })

        usedScans = validRequests.length
      }
    }

    const remainingScans = Math.max(0, config.maxRequests - usedScans)
    const resetAt = new Date(now.getTime() + config.windowMs)

    return NextResponse.json({
      maxScans: config.maxRequests,
      usedScans,
      remainingScans,
      resetAt: resetAt.toISOString(),
      isAuthenticated: !!userId,
    })
  } catch (error) {
    console.error("Quota API error:", error)

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
