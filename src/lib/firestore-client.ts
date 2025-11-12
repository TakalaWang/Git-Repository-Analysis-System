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
import type { Scan } from "./types"

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
