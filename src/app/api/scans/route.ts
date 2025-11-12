/**
 * User Scans History API Endpoint
 *
 * GET /api/scans - Retrieve authenticated user's scan history
 *
 * This endpoint provides a paginated list of all scans belonging to the
 * authenticated user. Requires valid Firebase authentication.
 *
 * Features:
 * - Pagination support (limit and offset)
 * - Status filtering (queued, running, succeeded, failed)
 * - Chronological ordering (newest first)
 * - Total count for pagination UI
 *
 * Use cases:
 * - Dashboard scan history display
 * - User activity tracking
 * - Scan management interfaces
 *
 * @module api/scans
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/server/firebase-admin"

/**
 * GET handler for user scan history retrieval.
 *
 * Required authentication header:
 * ```
 * Authorization: Bearer <FIREBASE_ID_TOKEN>
 * ```
 *
 * Query parameters:
 * - `limit` (optional, default: 20): Number of scans per page (max 100)
 * - `offset` (optional, default: 0): Number of scans to skip for pagination
 * - `status` (optional): Filter by status ('queued', 'running', 'succeeded', 'failed')
 *
 * Example request:
 * ```
 * GET /api/scans?limit=10&offset=0&status=succeeded
 * ```
 *
 * Success response (200 OK):
 * ```json
 * {
 *   "scans": [
 *     {
 *       "id": "abc123",
 *       "repoUrl": "https://github.com/owner/repo",
 *       "status": "succeeded",
 *       "provider": "github",
 *       "owner": "owner",
 *       "repo": "repo",
 *       "createdAt": "2025-01-12T10:00:00Z",
 *       "completedAt": "2025-01-12T10:03:00Z",
 *       "skillLevel": "Mid-level",
 *       "techStack": ["Next.js", "TypeScript"],
 *       "error": null
 *     },
 *     ...
 *   ],
 *   "pagination": {
 *     "total": 45,
 *     "limit": 10,
 *     "offset": 0,
 *     "hasMore": true
 *   }
 * }
 * ```
 *
 * Error responses:
 * - 401: Authentication required (missing or invalid token)
 * - 500: Internal server error
 *
 * @param {NextRequest} request - Next.js request object with query parameters
 * @returns {Promise<NextResponse>} JSON response with scan list and pagination info
 */
export async function GET(request: NextRequest) {
  try {
    // Get user authentication
    const authHeader = request.headers.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const status = searchParams.get("status") // Optional filter
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    // Build query
    let query = adminDb
      .collection("scans")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")

    // Apply status filter if provided
    if (status && ["queued", "running", "succeeded", "failed"].includes(status)) {
      query = query.where("status", "==", status) as FirebaseFirestore.Query
    }

    // Apply pagination
    query = query.limit(limit).offset(offset) as FirebaseFirestore.Query

    // Execute query
    const snapshot = await query.get()

    // Format results
    const scans = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: data.id,
        repoUrl: data.repoUrl,
        status: data.status,
        provider: data.provider,
        owner: data.owner,
        repo: data.repo,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
        skillLevel: data.skillLevel || null,
        techStack: data.techStack || null,
        error: data.error || null,
      }
    })

    // Get total count for pagination
    const totalQuery = adminDb.collection("scans").where("userId", "==", userId)

    const totalSnapshot = await totalQuery.count().get()
    const total = totalSnapshot.data().count

    return NextResponse.json({
      scans,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + scans.length < total,
      },
    })
  } catch (error) {
    console.error("Scans API error:", error)

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
