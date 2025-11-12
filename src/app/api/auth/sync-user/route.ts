/**
 * User Sync API Endpoint
 *
 * POST /api/auth/sync-user - Sync authenticated user data to Firestore
 *
 * This endpoint handles user profile synchronization after successful Firebase authentication.
 * It creates or updates user documents in the Firestore 'users' collection, which is
 * write-protected and only accessible via this server-side endpoint.
 *
 * Security:
 * - Requires valid Firebase ID token
 * - Verifies token UID matches request UID
 * - Only accessible server-side (client cannot write directly)
 *
 * Flow:
 * 1. Verify Firebase ID token
 * 2. Validate UID matches token
 * 3. Create or update user document in Firestore
 * 4. Track login timestamps
 *
 * Use cases:
 * - First-time user registration
 * - User profile updates after login
 * - Keeping user data in sync with Firebase Auth
 *
 * @module api/auth/sync-user
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/server/firebase-admin"

/**
 * POST handler for user profile synchronization.
 *
 * Request headers:
 * ```
 * Authorization: Bearer <FIREBASE_ID_TOKEN>
 * ```
 *
 * Request body:
 * ```json
 * {
 *   "uid": "user123",
 *   "email": "user@example.com",
 *   "displayName": "John Doe",
 *   "photoURL": "https://...",
 *   "provider": "github.com"
 * }
 * ```
 *
 * Success response (200 OK):
 * ```json
 * {
 *   "success": true,
 *   "message": "User profile synced successfully"
 * }
 * ```
 *
 * Error responses:
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (UID mismatch)
 * - 500: Internal server error
 *
 * @param {NextRequest} request - Next.js request object with auth header and body
 * @returns {Promise<NextResponse>} JSON response indicating sync success or error
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization token from header
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Verify Firebase ID token
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      console.error("Token verification failed:", error)
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    // Get user data from request body
    const body = await request.json()
    const { uid, email, displayName, photoURL, provider } = body

    // Validate that the token UID matches the request UID
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ success: false, error: "UID mismatch" }, { status: 403 })
    }

    // Prepare user document
    const userDoc = {
      uid,
      email: email || null,
      displayName: displayName || null,
      photoURL: photoURL || null,
      provider: provider || "unknown",
      githubUsername: null, // Will be extracted from provider data if available
      updatedAt: new Date(),
    }

    // Check if user exists
    const userRef = adminDb.collection("users").doc(uid)
    const userSnapshot = await userRef.get()

    if (userSnapshot.exists) {
      // Update existing user
      await userRef.update({
        ...userDoc,
        lastLoginAt: new Date(),
      })
      console.log(`User ${uid} profile updated`)
    } else {
      // Create new user
      await userRef.set({
        ...userDoc,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        scanCount: 0,
      })
      console.log(`New user ${uid} profile created`)
    }

    return NextResponse.json(
      {
        success: true,
        message: "User profile synced successfully",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Sync user API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler for API endpoint information.
 *
 * Returns basic information about the endpoint and usage instructions.
 * This is a convenience endpoint for API discovery.
 *
 * Response (200 OK):
 * ```json
 * {
 *   "message": "User sync API. Use POST method with valid Firebase ID token."
 * }
 * ```
 *
 * @returns {NextResponse} JSON response with endpoint information
 */
export async function GET() {
  return NextResponse.json(
    {
      message: "User sync API. Use POST method with valid Firebase ID token.",
    },
    { status: 200 }
  )
}
