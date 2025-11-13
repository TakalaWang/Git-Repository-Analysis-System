"use client"

import { useEffect, useState, ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { SkillLevel } from "@/lib/types"
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
  InfoIcon,
} from "lucide-react"
import { subscribeScan } from "@/lib/firestore-client"
import type { Scan } from "@/lib/types"
import { useAuth } from "@/contexts/AuthContext"
import { getUserFriendlyError } from "@/lib/error-messages"

/**
 * Tailwind CSS classes for skill level badges.
 * Maps each skill level to its corresponding color scheme.
 */
const SKILL_LEVEL_COLORS: Record<SkillLevel, string> = {
  Beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  Junior: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  "Mid-level": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  Senior: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
}

/**
 * Small helpers to keep JSX tidy
 */
const Row: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <div className={`flex items-center gap-2 ${className}`}>{children}</div>
const Section: React.FC<{ title: ReactNode; desc?: ReactNode; children?: ReactNode }> = ({
  title,
  desc,
  children,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">{title}</CardTitle>
      {desc && <CardDescription>{desc}</CardDescription>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
)

const LoadingSkeleton = () => (
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

const ErrorView: React.FC<{ backTo: string; message: string }> = ({ backTo, message }) => (
  <div className="container mx-auto px-4 py-8 max-w-4xl">
    <Button variant="ghost" onClick={() => (window.location.href = backTo)} className="mb-6">
      <ArrowLeft className="mr-2 h-4 w-4" /> Back
    </Button>
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  </div>
)

const StatusBadge: React.FC<{ status: Scan["status"] }> = ({ status }) => {
  const map: Record<
    Scan["status"],
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    queued: { label: "Queued", variant: "secondary" },
    running: { label: "Analyzing...", variant: "default" },
    succeeded: { label: "Completed", variant: "outline" },
    failed: { label: "Failed", variant: "destructive" },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

const ResultIcon: React.FC<{ scan: Scan }> = ({ scan }) => {
  if (scan.status === "queued") return <Clock className="h-5 w-5 text-blue-500" />
  if (scan.status === "running") return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
  if (scan.errorCode) {
    const map: Record<NonNullable<Scan["errorCode"]>, ReactNode> = {
      RATE_LIMIT_EXCEEDED: <Ban className="h-5 w-5 text-orange-500" />,
      GEMINI_RATE_LIMIT: <Ban className="h-5 w-5 text-orange-500" />,
      REPO_TOO_LARGE: <XCircle className="h-5 w-5 text-red-500" />,
      MALICIOUS_CONTENT: <ShieldAlert className="h-5 w-5 text-red-500" />,
      REPO_NOT_ACCESSIBLE: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      UNKNOWN_ERROR: <AlertCircle className="h-5 w-5 text-red-500" />,
    }
    return map[scan.errorCode]
  }
  if (scan.status === "succeeded") return <CheckCircle2 className="h-5 w-5 text-green-500" />
  return <AlertCircle className="h-5 w-5 text-red-500" />
}

export default function ScanResultPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { user } = useAuth()

  const [scan, setScan] = useState<Scan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeScan(
      id,
      (data) => {
        setScan(data || null)
        setError(data ? null : "Scan not found")
        setIsLoading(false)
      },
      (err) => {
        setError(err.message)
        setIsLoading(false)
      }
    )
    return () => unsubscribe()
  }, [id])

  if (isLoading) return <LoadingSkeleton />
  if (error || !scan)
    return <ErrorView backTo={user ? "/dashboard" : "/"} message={error || "Failed to load scan"} />

  const repoTitle =
    scan.owner && scan.repo
      ? `${scan.owner}/${scan.repo}`
      : scan.repoName || scan.repo || "Repository Analysis"

  return (
    <div className="min-h-[calc(100vh-73px)]">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => router.push(user ? "/dashboard" : "/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {user ? "Back to Dashboard" : "Back to Home"}
          </Button>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="shrink-0 mt-1">
                  <ResultIcon scan={scan} />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl mb-2">{repoTitle}</CardTitle>
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
                  {scan.repositoryInfo && (
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                      {scan.repositoryInfo.complexity && (
                        <Row>
                          <span className="font-medium">Complexity:</span>
                          <Badge variant="outline" className="text-xs">
                            {scan.repositoryInfo.complexity}
                          </Badge>
                        </Row>
                      )}
                      {scan.repositoryInfo.teamSize && (
                        <Row>
                          <Users className="h-3 w-3" /> <span>{scan.repositoryInfo.teamSize}</span>
                        </Row>
                      )}
                      {scan.repositoryInfo.projectDuration && (
                        <Row>
                          <Clock className="h-3 w-3" />{" "}
                          <span>{scan.repositoryInfo.projectDuration}</span>
                        </Row>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                <StatusBadge status={scan.status} />
              </div>
            </div>
          </CardHeader>

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

          {scan.errorCode && (
            <CardContent>
              {(() => {
                const { title, message, actions } = getUserFriendlyError(scan.errorCode!)
                return (
                  <Alert
                    variant={scan.errorCode === "MALICIOUS_CONTENT" ? "destructive" : "default"}
                  >
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>{title}</AlertTitle>
                    <AlertDescription>
                      <p className="mb-3">{message}</p>
                      {!!actions.length && (
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {actions.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      )}
                    </AlertDescription>
                  </Alert>
                )
              })()}
            </CardContent>
          )}
        </Card>

        {/* Results */}
        {scan.status === "succeeded" && !scan.errorCode && scan.description && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tech-stack">Tech Stack</TabsTrigger>
              <TabsTrigger value="assessment">Assessment</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-6">
              {scan.repositoryInfo && (
                <Section
                  title={
                    <>
                      <Code className="h-5 w-5" /> Project Information
                    </>
                  }
                  desc="Comprehensive project overview for non-technical understanding"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    {scan.repositoryInfo.mainPurpose && (
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground">
                          Main Purpose
                        </h4>
                        <p className="text-sm">{scan.repositoryInfo.mainPurpose}</p>
                      </div>
                    )}
                    {scan.repositoryInfo.targetAudience && (
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground">
                          Target Audience
                        </h4>
                        <p className="text-sm">{scan.repositoryInfo.targetAudience}</p>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              <Section
                title={
                  <>
                    <Code className="h-5 w-5" /> Technical Overview
                  </>
                }
              >
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {scan.description}
                </p>
              </Section>

              {scan.skillLevel && (
                <Section
                  title={
                    <>
                      <Users className="h-5 w-5" /> Skill Level Required
                    </>
                  }
                >
                  <Badge
                    className={SKILL_LEVEL_COLORS[scan.skillLevel as SkillLevel]}
                    variant="outline"
                  >
                    {scan.skillLevel}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-3">
                    This assessment is based on code complexity, architecture patterns, and project
                    structure.
                  </p>
                </Section>
              )}
            </TabsContent>

            {/* Tech Stack */}
            <TabsContent value="tech-stack" className="space-y-6">
              {scan.categorizedTechStack ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {(
                    [
                      ["frontend", "Frontend"],
                      ["backend", "Backend"],
                      ["database", "Database"],
                      ["devops", "DevOps"],
                      ["tools", "Tools"],
                      ["other", "Other"],
                    ] as const
                  ).map(([key, title]) => {
                    type TechCategory =
                      | "frontend"
                      | "backend"
                      | "database"
                      | "devops"
                      | "tools"
                      | "other"
                    const categorized = scan.categorizedTechStack as
                      | Record<TechCategory, string[] | undefined>
                      | undefined
                    const list = categorized?.[key as TechCategory]
                    if (!list?.length) return null
                    const colorMap: Record<string, string> = {
                      frontend: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
                      backend: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
                      database:
                        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
                      devops:
                        "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
                      tools:
                        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
                    }
                    return (
                      <Card key={key}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Package className="h-5 w-5" /> {title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {list.map((t, i) => (
                              <Badge key={i} variant="secondary" className={colorMap[key] || ""}>
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Section
                  title={
                    <>
                      <Package className="h-5 w-5" /> Technologies & Frameworks
                    </>
                  }
                  desc="Detected technologies, languages, and tools used in this project"
                >
                  {scan.techStack?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {scan.techStack.map((t, i) => (
                        <Badge key={i} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No tech stack information available</p>
                  )}
                </Section>
              )}
            </TabsContent>

            {/* Assessment */}
            <TabsContent value="assessment" className="space-y-6">
              {scan.detailedAssessment ? (
                <>
                  <Section
                    title="Skill Level Assessment"
                    desc="Required developer skill level and reasoning"
                  >
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                          Required Level
                        </h4>
                        <Badge
                          className={
                            SKILL_LEVEL_COLORS[scan.detailedAssessment.skillLevel as SkillLevel]
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
                    </div>
                  </Section>

                  <div className="grid gap-4 md:grid-cols-2">
                    {scan.detailedAssessment.strengths?.length && (
                      <Section
                        title={
                          <span className="flex items-center gap-2 text-lg text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-5 w-5" /> Strengths
                          </span>
                        }
                      >
                        <ul className="space-y-2">
                          {scan.detailedAssessment.strengths!.map((s, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {scan.detailedAssessment.weaknesses?.length && (
                      <Section
                        title={
                          <span className="flex items-center gap-2 text-lg text-orange-600 dark:text-orange-400">
                            <AlertCircle className="h-5 w-5" /> Areas for Improvement
                          </span>
                        }
                      >
                        <ul className="space-y-2">
                          {scan.detailedAssessment.weaknesses!.map((w, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-orange-600 dark:text-orange-400 mt-1">•</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}
                  </div>

                  {scan.detailedAssessment.recommendations?.length && (
                    <Section
                      title={
                        <>
                          <Code className="h-5 w-5" /> Recommendations
                        </>
                      }
                      desc="Suggested improvements and best practices"
                    >
                      <ul className="space-y-3">
                        {scan.detailedAssessment.recommendations!.map((r, i) => (
                          <li
                            key={i}
                            className="text-sm flex items-start gap-2 p-3 rounded-lg bg-muted/50"
                          >
                            <span className="font-semibold mt-0.5">{i + 1}.</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}

                  {(scan.detailedAssessment.codeQuality ||
                    scan.detailedAssessment.architectureRating ||
                    scan.detailedAssessment.testCoverage) && (
                    <Section
                      title="Quality Metrics"
                      desc="Assessment of code quality, architecture, and testing practices"
                    >
                      <div className="grid gap-6 md:grid-cols-3">
                        {scan.detailedAssessment.codeQuality && (
                          <div>
                            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Code className="h-4 w-4" /> Code Quality
                            </div>
                            <div className="mt-1">
                              <span className="inline-block px-3 py-1 text-sm font-semibold">
                                {scan.detailedAssessment.codeQuality}
                              </span>
                              <p className="text-xs text-muted-foreground mt-2">
                                Assessment of linting, formatting, and general code hygiene.
                              </p>
                            </div>
                          </div>
                        )}
                        {scan.detailedAssessment.architectureRating && (
                          <div>
                            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Package className="h-4 w-4" /> Architecture
                            </div>
                            <div className="mt-1">
                              <span className="inline-block px-3 py-1 text-sm font-semibold">
                                {scan.detailedAssessment.architectureRating}
                              </span>
                              <p className="text-xs text-muted-foreground mt-2">
                                Summary of overall architecture and component design.
                              </p>
                            </div>
                          </div>
                        )}
                        {scan.detailedAssessment.testCoverage && (
                          <div>
                            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" /> Test Coverage
                            </div>
                            <div className="mt-1">
                              <span className="inline-block px-3 py-1 text-sm font-semibold">
                                {scan.detailedAssessment.testCoverage}
                              </span>
                              <p className="text-xs text-muted-foreground mt-2">
                                Brief note on test coverage and quality of tests.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Section>
                  )}
                </>
              ) : (
                <Section
                  title="Detailed Assessment"
                  desc="Comprehensive analysis of the repository structure and quality"
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Complexity Level</h4>
                      {scan.skillLevel && (
                        <Badge
                          className={SKILL_LEVEL_COLORS[scan.skillLevel as SkillLevel]}
                          variant="outline"
                        >
                          {scan.skillLevel}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Section>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
