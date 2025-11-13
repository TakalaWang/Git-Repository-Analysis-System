/**
 * Rate Limiter Module
 *
 * Implements sophisticated rate limiting for both anonymous (IP-based) and
 * authenticated (UID-based) users. Uses Firestore as a persistent store to
 * track request counts within sliding time windows.
 *
 * Features:
 * - Separate limits for anonymous and authenticated users
 * - Sliding window algorithm for accurate rate limiting
 * - Automatic cleanup of expired timestamps
 * - Graceful failure handling (fail-open on errors)
 *
 * @module rate-limiter
 */

import { adminDb } from "./firebase-admin"
import { getClientIp, hashIp } from "./ip-utils"
import { NextRequest } from "next/server"

/**
 * Gets rate limit configuration from environment variables with fallback defaults.
 * Uses NEXT_PUBLIC_ prefix so the same config is available to both server and client.
 *
 * @private
 * @returns {Object} Rate limit configuration object
 */
function getRateLimitConfig() {
  const anonymousMaxRequests = parseInt(
    process.env.NEXT_PUBLIC_RATE_LIMIT_ANONYMOUS_MAX_REQUESTS || "3",
    10
  )
  const anonymousWindowHours = parseInt(
    process.env.NEXT_PUBLIC_RATE_LIMIT_ANONYMOUS_WINDOW_HOURS || "1",
    10
  )
  const authenticatedMaxRequests = parseInt(
    process.env.NEXT_PUBLIC_RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS || "20",
    10
  )
  const authenticatedWindowHours = parseInt(
    process.env.NEXT_PUBLIC_RATE_LIMIT_AUTHENTICATED_WINDOW_HOURS || "1",
    10
  )

  const anonymousWindowMs = anonymousWindowHours * 60 * 60 * 1000
  const authenticatedWindowMs = authenticatedWindowHours * 60 * 60 * 1000

  return {
    anonymous: {
      maxRequests: anonymousMaxRequests,
      windowMs: anonymousWindowMs,
      windowLabel: anonymousWindowHours === 1 ? "1 hour" : `${anonymousWindowHours} hours`,
    },
    authenticated: {
      maxRequests: authenticatedMaxRequests,
      windowMs: authenticatedWindowMs,
      windowLabel: authenticatedWindowHours === 1 ? "1 hour" : `${authenticatedWindowHours} hours`,
    },
  }
}

/**
 * Rate limit configuration for different user types.
 *
 * Configuration is loaded from environment variables with sensible defaults.
 * Uses NEXT_PUBLIC_ prefix so the same values are available to both server and client:
 * - NEXT_PUBLIC_RATE_LIMIT_ANONYMOUS_MAX_REQUESTS (default: 3)
 * - NEXT_PUBLIC_RATE_LIMIT_ANONYMOUS_WINDOW_HOURS (default: 1)
 * - NEXT_PUBLIC_RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS (default: 20)
 * - NEXT_PUBLIC_RATE_LIMIT_AUTHENTICATED_WINDOW_HOURS (default: 1)
 *
 * @constant
 * @type {Object}
 * @property {Object} anonymous - Rate limits for unauthenticated users
 * @property {number} anonymous.maxRequests - Maximum requests allowed per window
 * @property {number} anonymous.windowMs - Time window in milliseconds
 * @property {string} anonymous.windowLabel - Human-readable window duration
 * @property {Object} authenticated - Rate limits for authenticated users
 * @property {number} authenticated.maxRequests - Maximum requests allowed per window
 * @property {number} authenticated.windowMs - Time window in milliseconds
 * @property {string} authenticated.windowLabel - Human-readable window duration
 */
export const RATE_LIMITS = getRateLimitConfig()

/**
 * Result object returned by rate limit checks.
 *
 * @interface RateLimitResult
 * @property {boolean} allowed - Whether the request is allowed (under limit)
 * @property {number} remaining - Number of requests remaining in current window
 * @property {Date} resetAt - Timestamp when the rate limit will reset
 * @property {string} identifier - The identifier used for tracking (UID or hashed IP)
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  identifier: string
}

/**
 * Checks the rate limit for a request and updates the request count if allowed.
 *
 * This function implements a sliding window rate limiter that:
 * 1. Identifies the user by UID (authenticated) or hashed IP (anonymous)
 * 2. Retrieves existing requests from Firestore
 * 3. Filters out requests outside the time window
 * 4. Checks if under the limit
 * 5. Records the new request if allowed
 *
 * The function uses a "fail-open" strategy: if Firestore is unavailable,
 * it allows the request to proceed rather than blocking legitimate users.
 *
 * @param {NextRequest} request - The Next.js request object
 * @param {string} [userId] - Optional authenticated user ID. If provided,
 *                           uses authenticated limits; otherwise uses anonymous limits
 * @returns {Promise<RateLimitResult>} Object containing limit check results
 *
 * @throws {Error} Only logs errors, never throws (fail-open design)
 *
 * @example
 * ```typescript
 * // Check rate limit for authenticated user
 * const result = await checkRateLimit(request, 'user123')
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: 'Rate limit exceeded', resetAt: result.resetAt },
 *     { status: 429 }
 *   )
 * }
 *
 * // Check rate limit for anonymous user
 * const anonResult = await checkRateLimit(request)
 * console.log(`Remaining requests: ${anonResult.remaining}`)
 * ```
 */
export async function checkRateLimit(
  request: NextRequest,
  userId?: string
): Promise<RateLimitResult> {
  const isAuthenticated = !!userId
  const config = isAuthenticated ? RATE_LIMITS.authenticated : RATE_LIMITS.anonymous

  // Determine identifier (userId or hashed IP)
  const identifier = isAuthenticated ? userId : hashIp(getClientIp(request))

  const now = Date.now()
  const windowStart = now - config.windowMs

  try {
    // Reference to rate limit document
    const rateLimitRef = adminDb.collection("rateLimits").doc(identifier)

    // Get current rate limit data
    const doc = await rateLimitRef.get()
    const data = doc.exists ? doc.data() : null

    // Calculate current request count within window
    let requests: number[] = data?.requests || []

    // Filter out requests outside the time window
    requests = requests.filter((timestamp: number) => timestamp > windowStart)

    // Check if limit exceeded (before adding current request)
    const currentCount = requests.length
    const allowed = currentCount < config.maxRequests

    // If allowed, add current timestamp to requests array
    if (allowed) {
      requests.push(now)

      await rateLimitRef.set(
        {
          identifier,
          requests,
          lastRequest: now,
          userType: isAuthenticated ? "authenticated" : "anonymous",
          ip: getClientIp(request),
          updatedAt: new Date(),
        },
        { merge: true }
      )
    }

    // Calculate remaining after update
    const remaining = Math.max(0, config.maxRequests - (allowed ? currentCount + 1 : currentCount))
    const resetAt = new Date(now + config.windowMs)

    return {
      allowed,
      remaining: allowed ? remaining - 1 : remaining,
      resetAt,
      identifier,
    }
  } catch (error) {
    console.error("Rate limit check failed:", error)
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + config.windowMs),
      identifier,
    }
  }
}

/**
 * Resets the rate limit for a specific identifier.
 *
 * Completely removes the rate limit document from Firestore, effectively
 * resetting the request count to zero. Useful for testing or administrative
 * purposes (e.g., manually clearing a user's rate limit).
 *
 * @param {string} identifier - The user ID or hashed IP to reset
 * @returns {Promise<void>}
 *
 * @throws {Error} If the Firestore delete operation fails
 *
 * @example
 * ```typescript
 * // Reset rate limit for a user
 * await resetRateLimit('user123')
 *
 * // Reset rate limit for a hashed IP
 * await resetRateLimit('ip_abc123')
 * ```
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  try {
    await adminDb.collection("rateLimits").doc(identifier).delete()
  } catch (error) {
    console.error("Failed to reset rate limit:", error)
    throw error
  }
}

/**
 * Refunds a rate limit request for a specific identifier.
 *
 * Removes the most recent request timestamp from the rate limit document,
 * effectively giving back one quota slot. Should be called for all scan
 * failures EXCEPT malicious prompt detection.
 *
 * Refund policy:
 * ✅ REFUND for:
 *   - Invalid Git URL
 *   - Repository not accessible (private/not found)
 *   - Git clone timeout
 *   - Repository analysis failures
 *   - Gemini API errors (500, 503, etc.)
 *   - Firestore write errors
 *   - Any unexpected system errors
 *
 * ❌ DO NOT REFUND for:
 *   - Malicious prompt detected (intentional abuse)
 *
 * @param {string} identifier - The user ID or hashed IP to refund
 * @returns {Promise<boolean>} True if refund successful, false if nothing to refund
 *
 * @example
 * ```typescript
 * // Refund quota after any non-malicious error
 * try {
 *   await analyzeRepository(context)
 * } catch (error) {
 *   if (!isMaliciousPromptError(error)) {
 *     await refundRateLimit(userId || ipHash)
 *   }
 * }
 * ```
 */
export async function refundRateLimit(identifier: string): Promise<boolean> {
  try {
    const rateLimitRef = adminDb.collection("rateLimits").doc(identifier)
    const doc = await rateLimitRef.get()

    if (!doc.exists) {
      console.log(`No rate limit data found for ${identifier}, nothing to refund`)
      return false
    }

    const data = doc.data()
    const requests: number[] = data?.requests || []

    if (requests.length === 0) {
      console.log(`No requests to refund for ${identifier}`)
      return false
    }

    // Remove the most recent request (last element) - create new array
    const updatedRequests = requests.slice(0, -1)

    await rateLimitRef.update({
      requests: updatedRequests,
      updatedAt: new Date(),
    })

    console.log(`Refunded 1 quota for ${identifier} (remaining requests: ${requests.length})`)
    return true
  } catch (error) {
    console.error(`Failed to refund rate limit for ${identifier}:`, error)
    return false
  }
}

/**
 * Retrieves the current rate limit status without incrementing the counter.
 *
 * Similar to checkRateLimit but performs a read-only operation. Useful for
 * displaying rate limit information to users without consuming their quota.
 *
 * @param {string} identifier - The user ID or hashed IP to check
 * @param {boolean} [isAuthenticated=false] - Whether to use authenticated or anonymous limits
 * @returns {Promise<RateLimitResult>} Current rate limit status
 *
 * @throws {Error} Only logs errors, returns default allowed status on failure
 *
 * @example
 * ```typescript
 * // Check status for authenticated user
 * const status = await getRateLimitStatus('user123', true)
 * console.log(`You have ${status.remaining} requests remaining`)
 * console.log(`Limit resets at ${status.resetAt}`)
 *
 * // Check status for IP
 * const ipStatus = await getRateLimitStatus('ip_abc123', false)
 * ```
 */
export async function getRateLimitStatus(
  identifier: string,
  isAuthenticated: boolean = false
): Promise<RateLimitResult> {
  const config = isAuthenticated ? RATE_LIMITS.authenticated : RATE_LIMITS.anonymous

  const now = Date.now()
  const windowStart = now - config.windowMs

  try {
    const doc = await adminDb.collection("rateLimits").doc(identifier).get()
    const data = doc.exists ? doc.data() : null

    let requests: number[] = data?.requests || []
    requests = requests.filter((timestamp: number) => timestamp > windowStart)

    const allowed = requests.length < config.maxRequests
    const remaining = Math.max(0, config.maxRequests - requests.length)
    const resetAt = new Date(now + config.windowMs)

    return {
      allowed,
      remaining,
      resetAt,
      identifier,
    }
  } catch (error) {
    console.error("Failed to get rate limit status:", error)
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now + config.windowMs),
      identifier,
    }
  }
}
