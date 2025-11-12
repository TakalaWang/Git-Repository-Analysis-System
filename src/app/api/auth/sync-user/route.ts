import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/server/firebase-admin"

/**
 * POST /api/auth/sync-user
 * Sync user data to Firestore after successful authentication
 * Only backend can write to users collection
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

export async function GET() {
  return NextResponse.json(
    {
      message: "User sync API. Use POST method with valid Firebase ID token.",
    },
    { status: 200 }
  )
}
