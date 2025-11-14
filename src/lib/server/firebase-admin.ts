/**
 * Firebase Admin SDK Module
 *
 * Initializes and exports Firebase Admin SDK instances for server-side operations.
 * This module provides access to Firestore and Authentication services with admin privileges.
 *
 * Configuration:
 * - Requires GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to service account JSON
 * - Singleton pattern - only initializes once per process
 * - Automatically resolves relative paths from project root
 *
 * @module firebase-admin
 */

import * as admin from "firebase-admin"
import fs from "fs"
import path from "path"

/**
 * Initialize Firebase Admin SDK with service account credentials.
 * Only runs once even if module is imported multiple times (singleton pattern).
 */
if (!admin.apps.length) {
  const servicePath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_PATH
  if (!servicePath) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_JSON_PATH environment variable. " +
        "Set it to the path of your Firebase service account JSON file."
    )
  }

  // Resolve path (handles both absolute and relative paths)
  const resolvedPath = fs.existsSync(servicePath)
    ? servicePath
    : path.resolve(process.cwd(), servicePath)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Firebase service account file not found at: ${resolvedPath}\n` +
        `Please ensure the file exists and FIREBASE_SERVICE_ACCOUNT_JSON_PATH is set correctly.`
    )
  }

  const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"))

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

/**
 * Firebase Firestore Admin instance.
 * Provides full admin access to Firestore database for server-side operations.
 *
 * @constant
 * @type {admin.firestore.Firestore}
 *
 * @example
 * ```typescript
 * import { adminDb } from '@/lib/server/firebase-admin'
 *
 * // Create a document
 * await adminDb.collection('scans').doc('scan123').set({ status: 'queued' })
 *
 * // Query documents
 * const snapshot = await adminDb.collection('users').where('active', '==', true).get()
 * ```
 */
export const adminDb = admin.firestore()

/**
 * Firebase Authentication Admin instance.
 * Provides full admin access to Firebase Authentication for server-side operations.
 *
 * @constant
 * @type {admin.auth.Auth}
 *
 * @example
 * ```typescript
 * import { adminAuth } from '@/lib/server/firebase-admin'
 *
 * // Verify ID token
 * const decodedToken = await adminAuth.verifyIdToken(idToken)
 * console.log('User ID:', decodedToken.uid)
 *
 * // Get user data
 * const user = await adminAuth.getUser(userId)
 * console.log('Email:', user.email)
 * ```
 */
export const adminAuth = admin.auth()
