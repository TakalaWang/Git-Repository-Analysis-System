"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Plus,
  Search,
  XCircle,
  Ban,
  ShieldAlert,
} from "lucide-react"
import { subscribeUserScans } from "@/lib/firestore-client"
import { QuotaDisplay } from "@/components/QuotaDisplay"
import type { Scan } from "@/lib/types"

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [scans, setScans] = useState<Scan[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Subscribe to user's scans with real-time updates
   */
  useEffect(() => {
    if (!user) return

    // Subscribe to Firestore real-time updates
    const unsubscribe = subscribeUserScans(
      user.uid,
      (scansData) => {
        setScans(scansData)
        setError(null)
        setIsLoading(false)
      },
      (err) => {
        setError(err.message)
        setIsLoading(false)
      }
    )

    // Cleanup subscription on unmount
    return () => {
      unsubscribe()
    }
  }, [user])

  /**
   * Filter scans based on search query
   */
  const filteredResults = !searchQuery.trim()
    ? scans
    : scans.filter((scan) => {
        const query = searchQuery.toLowerCase()
        return (
          scan.repoUrl.toLowerCase().includes(query) ||
          scan.description?.toLowerCase().includes(query) ||
          scan.skillLevel?.toLowerCase().includes(query) ||
          scan.techStack?.some((tech) => tech.toLowerCase().includes(query))
        )
      })

  /**
   * Redirect to login if not authenticated
   */
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  /**
   * Get status icon based on scan status and error type
   */
  const getStatusIcon = (status: Scan["status"], errorMessage?: string | null) => {
    switch (status) {
      case "queued":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case "succeeded":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "failed":
        // Show different icons based on error type
        if (errorMessage) {
          const lowerError = errorMessage.toLowerCase()

          // AI API errors
          if (
            lowerError.includes("gemini") ||
            lowerError.includes("api analysis failed") ||
            lowerError.includes("too many requests") ||
            lowerError.includes("429")
          ) {
            return <Ban className="h-4 w-4 text-orange-500" />
          }

          // General rate limit
          if (lowerError.includes("rate limit") || lowerError.includes("quota")) {
            return <Ban className="h-4 w-4 text-orange-500" />
          }

          // System errors
          if (
            lowerError.includes("timeout") ||
            lowerError.includes("internal") ||
            lowerError.includes("unavailable") ||
            lowerError.includes("failed to")
          ) {
            return <XCircle className="h-4 w-4 text-red-500" />
          }

          // Permission errors
          if (lowerError.includes("permission") || lowerError.includes("unauthorized")) {
            return <ShieldAlert className="h-4 w-4 text-red-500" />
          }

          // User input errors
          if (
            lowerError.includes("not found") ||
            lowerError.includes("invalid") ||
            lowerError.includes("not accessible")
          ) {
            return <AlertCircle className="h-4 w-4 text-yellow-500" />
          }
        }
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  /**
   * Get status badge variant
   */
  const getStatusBadge = (status: Scan["status"]) => {
    const config: Record<
      Scan["status"],
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      queued: { label: "Queued", variant: "secondary" },
      running: { label: "Running", variant: "default" },
      succeeded: { label: "Completed", variant: "outline" },
      failed: { label: "Failed", variant: "destructive" },
    }

    const { label, variant } = config[status]
    return <Badge variant={variant}>{label}</Badge>
  }

  /**
   * Get skill level badge color
   */
  const getSkillBadge = (skillLevel?: string | null) => {
    if (!skillLevel) return null

    const colors: Record<string, string> = {
      Beginner: "bg-green-100 text-green-800",
      Junior: "bg-blue-100 text-blue-800",
      "Mid-level": "bg-yellow-100 text-yellow-800",
      Senior: "bg-red-100 text-red-800",
    }

    return (
      <Badge className={colors[skillLevel] || ""} variant="outline">
        {skillLevel}
      </Badge>
    )
  }

  // Show loading state during auth check
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-[calc(100vh-73px)]">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">View and manage your repository scans</p>
          </div>
          <Button onClick={() => router.push("/")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Scan
          </Button>
        </div>

        {/* Quota Display */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Scan Quota</CardTitle>
          </CardHeader>
          <CardContent>
            <QuotaDisplay variant="full" />
          </CardContent>
        </Card>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by repository URL, description, tech stack, or skill level..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              Found {filteredResults.length} scan{filteredResults.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredResults.length === 0 ? (
          // Empty State
          <Card className="text-center py-12">
            <CardContent>
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? "No matching scans found" : "No scans yet"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Start analyzing repositories to see them here"}
              </p>
              {!searchQuery && (
                <Button onClick={() => router.push("/")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Scan
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          // Scans List
          <div className="space-y-4">
            {filteredResults.map((scan) => (
              <Card
                key={scan.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/scan/${scan.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(scan.status, scan.error)}
                        <CardTitle className="text-lg">
                          {scan.owner && scan.repo
                            ? `${scan.owner}/${scan.repo}`
                            : scan.repoName || scan.repo || scan.repoUrl}
                        </CardTitle>
                      </div>
                      {/* Show description for successful scans, error message for failed scans */}
                      {scan.status === "failed" && scan.error ? (
                        <CardDescription className="line-clamp-2 text-destructive">
                          <span className="font-semibold">Error: </span>
                          {scan.error}
                        </CardDescription>
                      ) : scan.description ? (
                        <CardDescription className="line-clamp-2">
                          {scan.description}
                        </CardDescription>
                      ) : scan.status === "queued" ? (
                        <CardDescription className="text-muted-foreground italic">
                          Waiting to be processed...
                        </CardDescription>
                      ) : scan.status === "running" ? (
                        <CardDescription className="text-muted-foreground italic">
                          Analysis in progress...
                        </CardDescription>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      {getStatusBadge(scan.status)}
                      {scan.status === "succeeded" &&
                        scan.skillLevel &&
                        getSkillBadge(scan.skillLevel)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>
                        Created:{" "}
                        {new Date(scan.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {scan.completedAt && (
                        <span>
                          Completed:{" "}
                          {new Date(scan.completedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(scan.repoUrl, "_blank")
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
