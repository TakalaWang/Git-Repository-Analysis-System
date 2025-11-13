/**
 * Scan Status API Endpoint
 *
 * GET /api/scan/[id] - Retrieve status and results of a specific scan
 *
 * This endpoint provides real-time status updates for repository scans.
 * Clients should poll this endpoint to track scan progress.
 *
 * Features:
 * - Status tracking (queued → running → succeeded/failed)
 * - Access control (private scans only for owners)
 * - Detailed error messages on failure
 * - Complete analysis results on success
 *
 * Scan states:
 * - queued: Waiting for processing
 * - running: Currently being analyzed
 * - succeeded: Analysis complete with results
 * - failed: Analysis failed with error message
 *
 * @module api/scan/[id]
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/server/firebase-admin"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET handler for scan status and results retrieval.
 *
 * Optional authentication header (required for private scans):
 * ```
 * Authorization: Bearer <FIREBASE_ID_TOKEN>
 * ```
 *
 * Success response (200 OK) - Queued:
 * ```json
 * {
 *   "id": "abc123",
 *   "repoUrl": "https://github.com/owner/repo",
 *   "status": "queued",
 *   "createdAt": "2025-01-12T10:00:00Z",
 *   "updatedAt": "2025-01-12T10:00:00Z",
 *   "estimatedTime": "2-5 minutes",
 *   "message": "Scan is queued for processing"
 * }
 * ```
 *
 * Success response (200 OK) - Succeeded:
 * ```json
 * {
 *   "id": "abc123",
 *   "status": "succeeded",
 *   "completedAt": "2025-01-12T10:03:00Z",
 *   "results": {
 *     "description": "...",
 *     "techStack": ["Next.js", "TypeScript"],
 *     "skillLevel": "Mid-level",
 *     "projectComplexity": {...},
 *     "stats": {...}
 *   }
 * }
 * ```
 *
 * Error responses:
 * - 400: Missing scan ID
 * - 403: Access denied (private scan, not owner)
 * - 404: Scan not found
 * - 500: Internal server error
 *
 * @param {NextRequest} request - Next.js request object
 * @param {RouteContext} context - Route context containing scan ID parameter
 * @returns {Promise<NextResponse>} JSON response with scan status/results or error
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: "Scan ID is required" }, { status: 400 })
    }

    // Get scan document
    // Note: Authentication is no longer required - all scans are public
    const scanRef = adminDb.collection("scans").doc(id)
    const scanDoc = await scanRef.get()

    if (!scanDoc.exists) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 })
    }

    const scanData = scanDoc.data()

    if (!scanData) {
      return NextResponse.json({ error: "Invalid scan data" }, { status: 500 })
    }

    // All scans are now public - no permission check needed
    // Any user can view any scan result

    // Return scan data with timestamps as ISO strings
    const response: Record<string, unknown> = {
      id: scanData.id,
      repoUrl: scanData.repoUrl,
      status: scanData.status,
      createdAt: scanData.createdAt?.toDate?.()?.toISOString() || scanData.createdAt,
      updatedAt: scanData.updatedAt?.toDate?.()?.toISOString() || scanData.updatedAt,
    }

    // Add timestamps if available
    if (scanData.startedAt) {
      response.startedAt = scanData.startedAt?.toDate?.()?.toISOString() || scanData.startedAt
    }
    if (scanData.completedAt) {
      response.completedAt = scanData.completedAt?.toDate?.()?.toISOString() || scanData.completedAt
    }

    // Add results if scan succeeded
    if (scanData.status === "succeeded") {
      response.results = {
        description: scanData.description,
        techStack: scanData.techStack,
        skillLevel: scanData.skillLevel,
        skillLevelReasoning: scanData.skillLevelReasoning,
        projectComplexity: scanData.projectComplexity,
        keyFeatures: scanData.keyFeatures,
        suggestedImprovements: scanData.suggestedImprovements,
        stats: scanData.stats,
        provider: scanData.provider,
        owner: scanData.owner,
        repo: scanData.repo,
      }
    }

    // Add error if scan failed
    if (scanData.status === "failed") {
      response.error = scanData.error
    }

    // Add estimated time for queued/running scans
    if (scanData.status === "queued" || scanData.status === "running") {
      response.estimatedTime = "2-5 minutes"
      response.message =
        scanData.status === "queued" ? "Scan is queued for processing" : "Scan is currently running"
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Scan status API error:", error)

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
