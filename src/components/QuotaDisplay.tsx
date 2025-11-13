/**
 * Quota Display Component
 *
 * Shows user's remaining scan quota with real-time updates.
 * Displays different limits for authenticated vs anonymous users.
 * Can be embedded in header, dashboard, or any other location.
 *
 * @module components/QuotaDisplay
 */

"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Zap } from "lucide-react"
import { subscribeRateLimit } from "@/lib/firestore-client"
import type { UserQuota } from "@/lib/types"

interface QuotaDisplayProps {
  /**
   * Display variant:
   * - "full" shows progress bar with details
   * - "compact" shows only remaining count
   * - "badge" shows minimal badge format
   */
  variant?: "full" | "compact" | "badge"

  /**
   * Custom className for styling
   */
  className?: string

  /**
   * Callback when quota is updated
   */
  onQuotaUpdate?: (quota: UserQuota) => void
}

/**
 * QuotaDisplay Component
 *
 * Displays user quota information in various formats.
 * Automatically fetches and updates quota based on authentication state.
 *
 * @example
 * ```tsx
 * // Full display with progress bar
 * <QuotaDisplay variant="full" />
 *
 * // Compact text-only display
 * <QuotaDisplay variant="compact" />
 *
 * // Badge format
 * <QuotaDisplay variant="badge" />
 * ```
 */
export function QuotaDisplay({
  variant = "full",
  className = "",
  onQuotaUpdate,
}: QuotaDisplayProps) {
  const { user } = useAuth()
  const [quota, setQuota] = useState<UserQuota | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Subscribe to quota information from Firestore
   * - Authenticated users: Subscribe to their rateLimits document in real-time
   * - Anonymous users: Show static quota (actual limit is enforced by server)
   */
  useEffect(() => {
    let mounted = true

    // For authenticated users, subscribe to their rate limit document
    if (user) {
      const unsubscribe = subscribeRateLimit(
        user.uid,
        true, // isAuthenticated
        (quotaData) => {
          if (!mounted) return
          setQuota(quotaData)
          onQuotaUpdate?.(quotaData)
          setIsLoading(false)
          setError(null)
        },
        (err) => {
          if (!mounted) return
          setError(err.message)
          setIsLoading(false)
        }
      )

      // Cleanup subscription on unmount or user change
      return () => {
        mounted = false
        unsubscribe()
      }
    } else {
      // For anonymous users, show static quota info
      // Actual rate limiting is enforced by server when they make a scan request
      // We can't track anonymous user's actual usage client-side without IP
      const anonymousQuota: UserQuota = {
        maxScans: 3,
        usedScans: 0, // Server will track by IP
        remainingScans: 3,
        resetAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        isAuthenticated: false,
      }

      // Use setTimeout to defer state updates and avoid cascading renders
      const timer = setTimeout(() => {
        if (!mounted) return
        setQuota(anonymousQuota)
        onQuotaUpdate?.(anonymousQuota)
        setIsLoading(false)
        setError(null)
      }, 0)

      return () => {
        mounted = false
        clearTimeout(timer)
      }
    }
  }, [user, onQuotaUpdate])

  // Loading state
  if (isLoading) {
    if (variant === "badge") {
      return <Skeleton className="h-6 w-24" />
    }
    if (variant === "compact") {
      return <Skeleton className="h-5 w-32" />
    }
    return (
      <div className={`space-y-2 ${className}`}>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-2 w-full" />
      </div>
    )
  }

  // Error state
  if (error || !quota) {
    if (variant === "badge") {
      return (
        <Badge variant="destructive" className={className}>
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      )
    }
    return (
      <div className={`text-sm text-destructive ${className}`}>
        <AlertCircle className="h-4 w-4 inline mr-1" />
        Failed to load quota
      </div>
    )
  }

  // Calculate quota metrics
  const percentage = quota.maxScans === 0 ? 0 : Math.round((quota.usedScans / quota.maxScans) * 100)
  const isNearLimit = percentage >= 80
  const atLimit = quota.remainingScans <= 0

  // Badge variant
  if (variant === "badge") {
    return (
      <Badge
        variant={atLimit ? "destructive" : isNearLimit ? "secondary" : "outline"}
        className={className}
      >
        <Zap className="h-3 w-3 mr-1" />
        {quota.remainingScans}/{quota.maxScans}
      </Badge>
    )
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <div className={`text-sm ${className}`}>
        <span
          className={
            atLimit ? "text-destructive" : isNearLimit ? "text-yellow-600" : "text-muted-foreground"
          }
        >
          {quota.remainingScans}/{quota.maxScans} scans remaining
        </span>
      </div>
    )
  }

  // Full variant with progress bar
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {quota.isAuthenticated ? "Authenticated" : "Anonymous"} Scans
        </span>
        <span
          className={`text-sm ${atLimit ? "text-destructive" : isNearLimit ? "text-yellow-600" : "text-muted-foreground"}`}
        >
          {quota.remainingScans}/{quota.maxScans}
        </span>
      </div>
      <Progress
        value={percentage}
        className={`h-2 ${atLimit ? "bg-destructive/20" : isNearLimit ? "bg-yellow-100" : ""}`}
      />
      {atLimit && (
        <p className="text-xs text-destructive">
          Quota reached. {quota.isAuthenticated ? "Wait for reset" : "Sign in for more scans"}
        </p>
      )}
      {isNearLimit && !atLimit && (
        <p className="text-xs text-yellow-600">
          Running low on scans. {quota.isAuthenticated ? "" : "Sign in for 20 scans/hour"}
        </p>
      )}
    </div>
  )
}
