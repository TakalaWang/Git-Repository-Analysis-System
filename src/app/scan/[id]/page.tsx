"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  ExternalLink,
  Code,
  Package,
  Users,
  ArrowLeft,
  XCircle,
  ShieldAlert,
  Ban,
} from "lucide-react"
import { subscribeScan } from "@/lib/firestore-client"
import type { Scan } from "@/lib/types"
import { SKILL_LEVEL_COLORS } from "@/lib/types"
import { useAuth } from "@/contexts/AuthContext"

export default function ScanResultPage() {
  const params = useParams()
  const router = useRouter()
  const scanId = params.id as string
  const { user } = useAuth()

  const [scan, setScan] = useState<Scan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Subscribe to real-time scan updates using Firestore
   * Automatically updates UI when scan status changes
   */
  useEffect(() => {
    // Subscribe to Firestore real-time updates
    const unsubscribe = subscribeScan(
      scanId,
      (scanData) => {
        if (scanData) {
          setScan(scanData)
          setError(null)
        } else {
          setError("Scan not found")
        }
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
  }, [scanId])

  /**
   * Render loading skeleton while fetching initial data
   */
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  /**
   * Render error state
   */
  if (error || !scan) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.push(user ? "/dashboard" : "/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {user ? "Back to Dashboard" : "Back to Home"}
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Failed to load scan"}</AlertDescription>
        </Alert>
      </div>
    )
  }

  /**
   * Get result icon based on actual scan outcome (left icon)
   * Shows the final result: success if completed without errors, or error type
   */
  const getResultIcon = () => {
    if (!scan) return null

    // If still processing, show processing icon
    if (scan.status === "queued") {
      return <Clock className="h-5 w-5 text-blue-500" />
    }
    if (scan.status === "running") {
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
    }

    // If completed (succeeded or failed), check for actual result
    // If there's an error, show error icon based on error type
    if (scan.error) {
      const errorInfo = getErrorInfo(scan.error)
      return <div className="text-red-500">{errorInfo.icon}</div>
    }

    // If succeeded without error, show success
    if (scan.status === "succeeded") {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    }

    // Default to error icon for failed status
    return <AlertCircle className="h-5 w-5 text-red-500" />
  }

  /**
   * Get processing status badge (right badge)
   * Shows whether the scan processing is complete or still running
   */
  const getProcessingStatusBadge = () => {
    if (!scan) return null

    const statusConfig: Record<
      Scan["status"],
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      queued: { label: "Queued", variant: "secondary" },
      running: { label: "Running", variant: "default" },
      succeeded: { label: "Completed", variant: "outline" },
      failed: { label: "Completed", variant: "outline" }, // Processing completed even if failed
    }

    const config = statusConfig[scan.status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  /**
   * Get error icon and type based on error message
   */
  const getErrorInfo = (errorMessage: string) => {
    const lowerError = errorMessage.toLowerCase()

    // Rate limit error
    if (lowerError.includes("rate limit") || lowerError.includes("quota")) {
      return {
        icon: <Ban className="h-4 w-4" />,
        type: "Rate Limit Exceeded",
        variant: "destructive" as const,
      }
    }

    // User error (invalid input, repository not found, etc.)
    if (
      lowerError.includes("not found") ||
      lowerError.includes("invalid") ||
      lowerError.includes("not accessible") ||
      lowerError.includes("private")
    ) {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        type: "Invalid Input",
        variant: "destructive" as const,
      }
    }

    // System error (timeout, internal error, etc.)
    if (
      lowerError.includes("timeout") ||
      lowerError.includes("internal") ||
      lowerError.includes("unavailable") ||
      lowerError.includes("failed to")
    ) {
      return {
        icon: <XCircle className="h-4 w-4" />,
        type: "System Error",
        variant: "destructive" as const,
      }
    }

    // Security/permission error
    if (lowerError.includes("permission") || lowerError.includes("unauthorized")) {
      return {
        icon: <ShieldAlert className="h-4 w-4" />,
        type: "Permission Denied",
        variant: "destructive" as const,
      }
    }

    // Default error
    return {
      icon: <AlertCircle className="h-4 w-4" />,
      type: "Error",
      variant: "destructive" as const,
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.push(user ? "/dashboard" : "/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {user ? "Back to Dashboard" : "Back to Home"}
        </Button>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="shrink-0 mt-1">{getResultIcon()}</div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl mb-2">
                  {scan.owner && scan.repo
                    ? `${scan.owner}/${scan.repo}`
                    : scan.repoName || scan.repo || "Repository Analysis"}
                </CardTitle>
                <CardDescription className="flex flex-col gap-1">
                  <a
                    href={scan.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1 text-blue-600"
                  >
                    {scan.repoUrl}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  {scan.repositoryInfo?.description && (
                    <p className="text-sm mt-1">{scan.repositoryInfo.description}</p>
                  )}
                </CardDescription>
                {/* Repository Stats */}
                {scan.repositoryInfo && (
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                    {scan.repositoryInfo.complexity && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Complexity:</span>
                        <Badge variant="outline" className="text-xs">
                          {scan.repositoryInfo.complexity}
                        </Badge>
                      </div>
                    )}
                    {scan.repositoryInfo.teamSize && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{scan.repositoryInfo.teamSize}</span>
                      </div>
                    )}
                    {scan.repositoryInfo.projectDuration && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{scan.repositoryInfo.projectDuration}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="shrink-0">{getProcessingStatusBadge()}</div>
          </div>
        </CardHeader>

        {/* Show progress bar for queued/running status */}
        {(scan.status === "queued" || scan.status === "running") && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {scan.progress?.message || "Processing..."}
                </span>
                <span className="font-medium">{scan.progress?.percentage || 0}%</span>
              </div>
              <Progress value={scan.progress?.percentage || 0} className="h-2" />
              <p className="text-xs text-muted-foreground">
                This may take 2-5 minutes. Status updates automatically.
              </p>
            </div>
          </CardContent>
        )}

        {/* Show error message if there's any error (regardless of status) */}
        {scan.error && (
          <CardContent>
            {(() => {
              const errorInfo = getErrorInfo(scan.error)
              return (
                <Alert variant={errorInfo.variant}>
                  <div className="flex items-start gap-2">
                    {errorInfo.icon}
                    <div className="flex-1">
                      <div className="font-semibold mb-1">{errorInfo.type}</div>
                      <AlertDescription>{scan.error}</AlertDescription>
                    </div>
                  </div>
                </Alert>
              )
            })()}
          </CardContent>
        )}
      </Card>

      {/* Results - Only show if scan succeeded without errors */}
      {scan.status === "succeeded" && !scan.error && scan.description && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tech-stack">Tech Stack</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Repository Information Card (Enhanced for HR) */}
            {scan.repositoryInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Project Information
                  </CardTitle>
                  <CardDescription>
                    Comprehensive project overview for non-technical understanding
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {scan.repositoryInfo.mainPurpose && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-muted-foreground">
                          Main Purpose
                        </h4>
                        <p className="text-sm">{scan.repositoryInfo.mainPurpose}</p>
                      </div>
                    )}
                    {scan.repositoryInfo.targetAudience && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-muted-foreground">
                          Target Audience
                        </h4>
                        <p className="text-sm">{scan.repositoryInfo.targetAudience}</p>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-3">
                    {scan.repositoryInfo.complexity && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-muted-foreground">Complexity</h4>
                        <Badge variant="secondary" className="mt-1">
                          {scan.repositoryInfo.complexity}
                        </Badge>
                      </div>
                    )}
                    {scan.repositoryInfo.teamSize && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-muted-foreground">Team Size</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{scan.repositoryInfo.teamSize}</span>
                        </div>
                      </div>
                    )}
                    {scan.repositoryInfo.projectDuration && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-muted-foreground">Duration</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{scan.repositoryInfo.projectDuration}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Technical Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {scan.description}
                </p>
              </CardContent>
            </Card>

            {/* Skill Level Assessment */}
            {scan.skillLevel && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Skill Level Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge
                    className={
                      SKILL_LEVEL_COLORS[scan.skillLevel as keyof typeof SKILL_LEVEL_COLORS] || ""
                    }
                    variant="outline"
                  >
                    {scan.skillLevel}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-3">
                    This assessment is based on code complexity, architecture patterns, and project
                    structure.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tech Stack Tab */}
          <TabsContent value="tech-stack" className="space-y-6">
            {/* Categorized Tech Stack */}
            {scan.categorizedTechStack ? (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Frontend */}
                {scan.categorizedTechStack.frontend &&
                  scan.categorizedTechStack.frontend.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Code className="h-5 w-5" />
                          Frontend
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {scan.categorizedTechStack.frontend.map((tech, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                            >
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Backend */}
                {scan.categorizedTechStack.backend &&
                  scan.categorizedTechStack.backend.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Package className="h-5 w-5" />
                          Backend
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {scan.categorizedTechStack.backend.map((tech, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            >
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Database */}
                {scan.categorizedTechStack.database &&
                  scan.categorizedTechStack.database.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Package className="h-5 w-5" />
                          Database
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {scan.categorizedTechStack.database.map((tech, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
                            >
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* DevOps */}
                {scan.categorizedTechStack.devops &&
                  scan.categorizedTechStack.devops.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Package className="h-5 w-5" />
                          DevOps
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {scan.categorizedTechStack.devops.map((tech, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
                            >
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Tools */}
                {scan.categorizedTechStack.tools && scan.categorizedTechStack.tools.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="h-5 w-5" />
                        Tools
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {scan.categorizedTechStack.tools.map((tech, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Other */}
                {scan.categorizedTechStack.other && scan.categorizedTechStack.other.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="h-5 w-5" />
                        Other
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {scan.categorizedTechStack.other.map((tech, index) => (
                          <Badge key={index} variant="secondary">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              /* Fallback to uncategorized tech stack */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Technologies & Frameworks
                  </CardTitle>
                  <CardDescription>
                    Detected technologies, languages, and tools used in this project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {scan.techStack && scan.techStack.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {scan.techStack.map((tech, index) => (
                        <Badge key={index} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No tech stack information available</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Assessment Tab */}
          <TabsContent value="assessment" className="space-y-6">
            {scan.detailedAssessment ? (
              <>
                {/* Skill Level & Reasoning */}
                <Card>
                  <CardHeader>
                    <CardTitle>Skill Level Assessment</CardTitle>
                    <CardDescription>Required developer skill level and reasoning</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                        Required Level
                      </h4>
                      <Badge
                        className={
                          SKILL_LEVEL_COLORS[
                            scan.detailedAssessment.skillLevel as keyof typeof SKILL_LEVEL_COLORS
                          ] || ""
                        }
                        variant="outline"
                      >
                        {scan.detailedAssessment.skillLevel}
                      </Badge>
                    </div>
                    {scan.detailedAssessment.reasoning && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                            Reasoning
                          </h4>
                          <p className="text-sm leading-relaxed whitespace-pre-line">
                            {scan.detailedAssessment.reasoning}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Strengths & Weaknesses */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Strengths */}
                  {scan.detailedAssessment.strengths &&
                    scan.detailedAssessment.strengths.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-5 w-5" />
                            Strengths
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {scan.detailedAssessment.strengths.map((strength, index) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                  {/* Weaknesses */}
                  {scan.detailedAssessment.weaknesses &&
                    scan.detailedAssessment.weaknesses.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg text-orange-600 dark:text-orange-400">
                            <AlertCircle className="h-5 w-5" />
                            Areas for Improvement
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {scan.detailedAssessment.weaknesses.map((weakness, index) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <span className="text-orange-600 dark:text-orange-400 mt-1">•</span>
                                <span>{weakness}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                </div>

                {/* Recommendations */}
                {scan.detailedAssessment.recommendations &&
                  scan.detailedAssessment.recommendations.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Code className="h-5 w-5" />
                          Recommendations
                        </CardTitle>
                        <CardDescription>Suggested improvements and best practices</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {scan.detailedAssessment.recommendations.map((rec, index) => (
                            <li
                              key={index}
                              className="text-sm flex items-start gap-2 p-3 rounded-lg bg-muted/50"
                            >
                              <span className="text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                                {index + 1}.
                              </span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                {/* Quality Metrics */}
                <div className="grid gap-4 md:grid-cols-3">
                  {scan.detailedAssessment.codeQuality && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Code Quality</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{scan.detailedAssessment.codeQuality}</p>
                      </CardContent>
                    </Card>
                  )}
                  {scan.detailedAssessment.architectureRating && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Architecture</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {scan.detailedAssessment.architectureRating}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  {scan.detailedAssessment.testCoverage && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Test Coverage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{scan.detailedAssessment.testCoverage}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              /* Fallback to basic assessment */
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Assessment</CardTitle>
                  <CardDescription>
                    Comprehensive analysis of the repository structure and quality
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Complexity Level</h4>
                    {scan.skillLevel && (
                      <Badge
                        className={
                          SKILL_LEVEL_COLORS[scan.skillLevel as keyof typeof SKILL_LEVEL_COLORS] ||
                          ""
                        }
                        variant="outline"
                      >
                        {scan.skillLevel}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
