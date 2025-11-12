/**
 * Scan Queue Manager Module
 *
 * Manages an in-memory queue for asynchronous repository scan processing.
 * Implements a simple FIFO (First-In-First-Out) queue with sequential processing
 * to prevent overwhelming system resources.
 *
 * Features:
 * - Non-blocking enqueue operation (returns immediately)
 * - Sequential processing (one scan at a time)
 * - Automatic Firestore status updates
 * - Comprehensive error handling with status tracking
 * - Resource cleanup (temporary files)
 *
 * Processing flow:
 * 1. Clone repository
 * 2. Analyze content (files, languages, dependencies)
 * 3. Get AI analysis from Gemini
 * 4. Update Firestore with results
 * 5. Cleanup temporary files
 *
 * @module scan-queue
 */

import { adminDb } from "./firebase-admin"
import { cloneRepository, cleanupRepository } from "./git-handler"
import { analyzeRepository as analyzeRepoContent } from "./repository-analyzer"
import { analyzeRepository as analyzeWithGemini } from "./gemini"

/**
 * Possible states for a scan job.
 *
 * @typedef {'queued'|'running'|'succeeded'|'failed'} ScanStatus
 * @property queued - Scan is waiting in queue
 * @property running - Scan is currently being processed
 * @property succeeded - Scan completed successfully
 * @property failed - Scan encountered an error
 */
export type ScanStatus = "queued" | "running" | "succeeded" | "failed"

/**
 * Represents a scan job in the queue.
 *
 * @interface ScanJob
 * @property {string} id - Unique identifier (Firestore document ID)
 * @property {string} repoUrl - Git repository URL to scan
 * @property {string} [userId] - User ID if authenticated, undefined if anonymous
 * @property {string} ip - Client IP address (for tracking/rate limiting)
 * @property {ScanStatus} status - Current processing status
 * @property {Date} createdAt - When scan was requested
 * @property {Date} updatedAt - Last status update time
 * @property {Date} [startedAt] - When processing began
 * @property {Date} [completedAt] - When processing finished (success or failure)
 * @property {string} [error] - Error message if scan failed
 */
export interface ScanJob {
  id: string
  repoUrl: string
  userId?: string
  ip: string
  status: ScanStatus
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
}

/**
 * In-memory queue storing scan IDs waiting for processing.
 * FIFO order - scans are processed in the order they were added.
 *
 * @private
 */
const scanQueue: string[] = []

/**
 * Flag indicating whether queue processing is currently active.
 * Prevents multiple concurrent processing loops.
 *
 * @private
 */
let isProcessing = false

/**
 * Adds a scan to the processing queue and initiates processing if needed.
 *
 * This function:
 * 1. Adds the scan ID to the end of the queue
 * 2. Logs the queue status
 * 3. Starts queue processing if not already running
 *
 * The function returns immediately (non-blocking). The actual scan processing
 * happens asynchronously in the background.
 *
 * @param {string} scanId - Firestore document ID of the scan to process
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * // In API route after creating scan document
 * const scanRef = adminDb.collection('scans').doc()
 * await scanRef.set({ status: 'queued', repoUrl, ... })
 *
 * // Add to queue (non-blocking)
 * await enqueueScan(scanRef.id)
 *
 * // Return immediately to client
 * return NextResponse.json({ scanId: scanRef.id, status: 'queued' })
 * ```
 */
export async function enqueueScan(scanId: string): Promise<void> {
  scanQueue.push(scanId)
  console.log(`Scan ${scanId} added to queue. Queue length: ${scanQueue.length}`)

  // Start processing if not already running
  if (!isProcessing) {
    processQueue()
  }
}

/**
 * Continuously processes scans from the queue until empty.
 *
 * Implements a simple sequential processing loop:
 * 1. Check if already processing (prevent duplicates)
 * 2. While queue has items:
 *    - Remove first item
 *    - Process the scan
 *    - Continue to next (even if one fails)
 * 3. Mark processing as complete
 *
 * Errors in individual scans don't stop the queue - they're logged and
 * the queue continues with the next scan.
 *
 * @returns {Promise<void>}
 *
 * @private
 */
async function processQueue(): Promise<void> {
  if (isProcessing) {
    return
  }

  isProcessing = true

  while (scanQueue.length > 0) {
    const scanId = scanQueue.shift()
    if (!scanId) continue

    try {
      console.log(`Processing scan: ${scanId}`)
      await processScan(scanId)
    } catch (error) {
      console.error(`Failed to process scan ${scanId}:`, error)
      // Continue processing other scans
    }
  }

  isProcessing = false
}

/**
 * Processes a single scan from queue to completion.
 *
 * This is the core scan processing function that orchestrates:
 * 1. Status update to 'running' in Firestore
 * 2. Repository cloning (with timeout protection)
 * 3. Content analysis (files, languages, structure)
 * 4. AI analysis via Gemini
 * 5. Results storage in Firestore
 * 6. Temporary file cleanup
 *
 * On success, updates Firestore with:
 * - status: 'succeeded'
 * - All analysis results (description, techStack, etc.)
 * - Statistics and metadata
 * - Completion timestamp
 *
 * On failure, updates Firestore with:
 * - status: 'failed'
 * - Error message
 * - Completion timestamp
 *
 * Always performs cleanup, even if processing fails.
 *
 * @param {string} scanId - Firestore document ID of the scan to process
 * @returns {Promise<void>}
 *
 * @throws Never throws - all errors are caught, logged, and stored in Firestore
 *
 * @private
 */
async function processScan(scanId: string): Promise<void> {
  const scanRef = adminDb.collection("scans").doc(scanId)

  try {
    // Update status to running
    await scanRef.update({
      status: "running",
      startedAt: new Date(),
      updatedAt: new Date(),
      progress: {
        stage: "running",
        message: "Initializing scan...",
        percentage: 0,
      },
    })

    // Get scan document
    const scanDoc = await scanRef.get()
    const scanData = scanDoc.data()

    if (!scanData || !scanData.repoUrl) {
      throw new Error("Invalid scan data")
    }

    const { repoUrl } = scanData

    // Step 1: Clone repository
    console.log(`Cloning repository: ${repoUrl}`)
    await scanRef.update({
      progress: {
        stage: "cloning",
        message: "Cloning repository...",
        percentage: 20,
      },
      updatedAt: new Date(),
    })

    const repoInfo = await cloneRepository(repoUrl, {
      depth: 1,
      timeout: 120000, // 2 minutes
    })

    try {
      // Step 2: Analyze repository content
      console.log(`Analyzing repository content...`)
      await scanRef.update({
        progress: {
          stage: "analyzing",
          message: "Analyzing repository structure and code...",
          percentage: 40,
        },
        updatedAt: new Date(),
      })

      const repoContext = await analyzeRepoContent(repoInfo.localPath, repoUrl)

      // Step 3: Get AI analysis from Gemini
      console.log(`Requesting Gemini analysis...`)
      await scanRef.update({
        progress: {
          stage: "generating",
          message: "Generating AI-powered insights...",
          percentage: 70,
        },
        updatedAt: new Date(),
      })

      const analysis = await analyzeWithGemini(repoContext)

      // Step 4: Update scan document with results
      // Filter out undefined values to avoid Firestore errors
      const repoName = repoInfo.repo || repoUrl.split("/").pop() || "Unknown Repository"

      const updateData: Record<string, unknown> = {
        status: "succeeded",
        completedAt: new Date(),
        updatedAt: new Date(),
        repoName,
        description: analysis.description || null,
        techStack: analysis.techStack || null,
        skillLevel: analysis.skillLevel || null,
        progress: {
          stage: "completed",
          message: "Analysis complete!",
          percentage: 100,
        },
        stats: {
          totalFiles: repoContext.totalFiles,
          totalLines: repoContext.totalLines,
          languages: repoContext.languages,
        },
        provider: repoInfo.provider,
        owner: repoInfo.owner,
        repo: repoInfo.repo,
      }

      // Only add optional fields if they exist
      if (analysis.categorizedTechStack) {
        updateData.categorizedTechStack = analysis.categorizedTechStack
      }
      if (analysis.repositoryInfo) {
        updateData.repositoryInfo = analysis.repositoryInfo
      }
      if (analysis.detailedAssessment) {
        updateData.detailedAssessment = analysis.detailedAssessment
      }
      if (analysis.skillLevelReasoning) {
        updateData.skillLevelReasoning = analysis.skillLevelReasoning
      }
      if (analysis.projectComplexity) {
        updateData.projectComplexity = analysis.projectComplexity
      }
      if (analysis.keyFeatures) {
        updateData.keyFeatures = analysis.keyFeatures
      }
      if (analysis.suggestedImprovements) {
        updateData.suggestedImprovements = analysis.suggestedImprovements
      }

      await scanRef.update(updateData)

      console.log(`Scan completed successfully: ${scanId}`)
    } finally {
      // Cleanup cloned repository
      await cleanupRepository(repoInfo.localPath)
    }
  } catch (error) {
    console.error(`Scan failed for ${scanId}:`, error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    // Update status to failed
    await scanRef.update({
      status: "failed",
      completedAt: new Date(),
      updatedAt: new Date(),
      error: errorMessage,
    })
  }
}

/**
 * Retrieves the current status of the scan queue.
 *
 * Useful for:
 * - Monitoring queue depth
 * - System health checks
 * - Debugging and diagnostics
 * - User-facing queue status displays
 *
 * @returns {{length: number, isProcessing: boolean}} Queue status object
 * @property {number} length - Number of scans waiting in queue
 * @property {boolean} isProcessing - Whether a scan is currently being processed
 *
 * @example
 * ```typescript
 * // Health check endpoint
 * export async function GET() {
 *   const queueStatus = getQueueStatus()
 *   return NextResponse.json({
 *     queue: {
 *       pending: queueStatus.length,
 *       processing: queueStatus.isProcessing,
 *       status: queueStatus.length > 10 ? 'busy' : 'healthy'
 *     }
 *   })
 * }
 *
 * // Logging
 * const status = getQueueStatus()
 * console.log(`Queue: ${status.length} pending, ${status.isProcessing ? 'active' : 'idle'}`)
 * ```
 */
export function getQueueStatus(): { length: number; isProcessing: boolean } {
  return {
    length: scanQueue.length,
    isProcessing,
  }
}

/**
 * Attempts to cancel a scan that is still queued (not yet processing).
 *
 * Only works for scans in 'queued' status. Once a scan is 'running',
 * it cannot be cancelled through this function.
 *
 * Note: This only removes from the in-memory queue. The Firestore document
 * should be updated separately if needed.
 *
 * @param {string} scanId - ID of the scan to cancel
 * @returns {boolean} True if scan was found and removed from queue, false if not in queue
 *
 * @example
 * ```typescript
 * // Cancel scan API endpoint
 * export async function DELETE(request, { params }) {
 *   const { id } = params
 *
 *   // Try to remove from queue
 *   const cancelled = cancelScan(id)
 *
 *   if (cancelled) {
 *     // Update Firestore status
 *     await adminDb.collection('scans').doc(id).update({
 *       status: 'cancelled',
 *       updatedAt: new Date()
 *     })
 *     return NextResponse.json({ message: 'Scan cancelled' })
 *   } else {
 *     return NextResponse.json(
 *       { error: 'Scan not in queue or already processing' },
 *       { status: 400 }
 *     )
 *   }
 * }
 * ```
 */
export function cancelScan(scanId: string): boolean {
  const index = scanQueue.indexOf(scanId)
  if (index > -1) {
    scanQueue.splice(index, 1)
    console.log(`Scan ${scanId} cancelled from queue`)
    return true
  }
  return false
}
