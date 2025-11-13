/**
 * Firestore Client Utilities
 *
 * Client-side utilities for Firestore real-time subscriptions and data fetching.
 * These functions provide a clean interface for components to interact with Firestore.
 *
 * @module lib/firestore-client
 */

import { doc, onSnapshot, collection, query, where, orderBy, Unsubscribe } from "firebase/firestore"
import { db } from "./firebase-client"
import type { Scan, UserQuota } from "./types"

/**
 * Subscribe to real-time updates for a single scan document
 *
 * @param scanId - The scan document ID
 * @param onUpdate - Callback function called when scan data changes
 * @param onError - Optional callback for error handling
 * @returns Unsubscribe function to stop listening
 *
 * @example
 * ```typescript
 * const unsubscribe = subscribeScan('scan123', (scan) => {
 *   console.log('Scan updated:', scan)
 * })
 *
 * // Later, stop listening
 * unsubscribe()
 * ```
 */
export function subscribeScan(
  scanId: string,
  onUpdate: (scan: Scan | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const scanRef = doc(db, "scans", scanId)

  return onSnapshot(
    scanRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        const scan: Scan = {
          ...data,
          id: snapshot.id,
          // Convert Firestore timestamps to ISO strings
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          startedAt: data.startedAt?.toDate?.()?.toISOString() || data.startedAt,
          completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt,
        } as Scan
        onUpdate(scan)
      } else {
        onUpdate(null)
      }
    },
    (error) => {
      console.error("Error subscribing to scan:", error)
      onError?.(error as Error)
    }
  )
}

/**
 * Subscribe to real-time updates for all scans by a specific user
 *
 * @param userId - The user ID to filter scans
 * @param onUpdate - Callback function called when scans data changes
 * @param onError - Optional callback for error handling
 * @returns Unsubscribe function to stop listening
 *
 * @example
 * ```typescript
 * const unsubscribe = subscribeUserScans('user123', (scans) => {
 *   console.log('User scans:', scans)
 * })
 * ```
 */
export function subscribeUserScans(
  userId: string,
  onUpdate: (scans: Scan[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const scansRef = collection(db, "scans")
  const q = query(scansRef, where("userId", "==", userId), orderBy("createdAt", "desc"))

  return onSnapshot(
    q,
    (snapshot) => {
      const scans: Scan[] = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          startedAt: data.startedAt?.toDate?.()?.toISOString() || data.startedAt,
          completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt,
        } as Scan
      })
      onUpdate(scans)
    },
    (error) => {
      console.error("Error subscribing to user scans:", error)
      onError?.(error as Error)
    }
  )
}

/**
 * Gets rate limit configuration from environment variables with fallback defaults.
 * These values are embedded at build time from NEXT_PUBLIC_ environment variables.
 *
 * @private
 * @returns {Object} Rate limit configuration object
 */
function getRateLimitConfig() {
  // Parse from environment variables (NEXT_PUBLIC_ prefix for client-side access)
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

  return {
    anonymous: {
      maxRequests: anonymousMaxRequests,
      windowMs: anonymousWindowHours * 60 * 60 * 1000,
    },
    authenticated: {
      maxRequests: authenticatedMaxRequests,
      windowMs: authenticatedWindowHours * 60 * 60 * 1000,
    },
  }
}

/**
 * Rate limit configuration constants
 * Must match the server-side RATE_LIMITS configuration
 *
 * Configuration is loaded from NEXT_PUBLIC_ environment variables with defaults:
 * - NEXT_PUBLIC_RATE_LIMIT_ANONYMOUS_MAX_REQUESTS (default: 3)
 * - NEXT_PUBLIC_RATE_LIMIT_ANONYMOUS_WINDOW_HOURS (default: 1)
 * - NEXT_PUBLIC_RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS (default: 20)
 * - NEXT_PUBLIC_RATE_LIMIT_AUTHENTICATED_WINDOW_HOURS (default: 1)
 */
export const RATE_LIMIT_CONFIG = getRateLimitConfig()

/**
 * Subscribe to real-time rate limit updates for a specific identifier
 *
 * This function subscribes to the rateLimits collection in Firestore
 * and calculates the current quota status based on request history.
 *
 * @param identifier - The rate limit identifier (user ID or hashed IP)
 * @param isAuthenticated - Whether this is an authenticated user
 * @param onUpdate - Callback function called when quota data changes
 * @param onError - Optional callback for error handling
 * @returns Unsubscribe function to stop listening
 *
 * @example
 * ```typescript
 * // For authenticated user
 * const unsubscribe = subscribeRateLimit('user123', true, (quota) => {
 *   console.log('Remaining scans:', quota.remainingScans)
 * })
 *
 * // For anonymous user (using hashed IP)
 * const unsubscribe = subscribeRateLimit(hashedIp, false, (quota) => {
 *   console.log('Remaining scans:', quota.remainingScans)
 * })
 * ```
 */
export function subscribeRateLimit(
  identifier: string,
  isAuthenticated: boolean,
  onUpdate: (quota: UserQuota) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const rateLimitRef = doc(db, "rateLimits", identifier)
  const config = isAuthenticated ? RATE_LIMIT_CONFIG.authenticated : RATE_LIMIT_CONFIG.anonymous

  return onSnapshot(
    rateLimitRef,
    (snapshot) => {
      console.log(
        `[subscribeRateLimit] Snapshot received for ${identifier}, exists: ${snapshot.exists()}`
      )

      const now = new Date()
      const windowStart = new Date(now.getTime() - config.windowMs)
      let usedScans = 0

      if (snapshot.exists()) {
        const data = snapshot.data()

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
      } else {
        console.log(
          `[subscribeRateLimit] No rate limit document found for ${identifier}, showing fresh quota`
        )
      }

      const remainingScans = Math.max(0, config.maxRequests - usedScans)
      const resetAt = new Date(now.getTime() + config.windowMs)

      const quota: UserQuota = {
        maxScans: config.maxRequests,
        usedScans,
        remainingScans,
        resetAt,
        isAuthenticated,
      }

      console.log(`[subscribeRateLimit] Quota calculated:`, quota)
      onUpdate(quota)
    },
    (error) => {
      console.error("[subscribeRateLimit] Error subscribing to rate limit:", error)
      onError?.(error as Error)
    }
  )
}
