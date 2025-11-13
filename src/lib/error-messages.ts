/**
 * Error Message Utilities
 *
 * Converts error codes into user-friendly messages with actionable guidance.
 * Prevents exposing internal server details to end users.
 *
 * @module error-messages
 */

import type { ErrorCode, UserFriendlyError } from "./types"

/**
 * Converts an error code to a user-friendly error object.
 *
 * @param {ErrorCode} errorCode - Specific error code
 * @returns {UserFriendlyError} User-friendly error information
 *
 * @example
 * ```typescript
 * const error = getUserFriendlyError("GEMINI_RATE_LIMIT")
 * // Returns:
 * // {
 * //   title: "Analysis Service Busy",
 * //   message: "Our AI analysis service is currently experiencing high demand...",
 * //   actions: ["Please try again in a few minutes", ...]
 * // }
 * ```
 */
export function getUserFriendlyError(errorCode: ErrorCode | null | undefined): UserFriendlyError {
  switch (errorCode) {
    case "RATE_LIMIT_EXCEEDED":
      return {
        title: "Rate Limit Reached",
        message:
          "You've reached your scan quota. Please wait for your quota to reset or sign in for higher limits.",
        actions: [
          "Wait for your quota to reset (shown above)",
          "Sign in to get higher limits (20 scans/hour)",
        ],
      }

    case "REPO_TOO_LARGE":
      return {
        title: "Repository Too Large",
        message:
          "The repository took too long to download. This usually happens with very large repositories.",
        actions: [
          "Your scan quota has been refunded automatically",
          "Try again - sometimes network conditions improve",
          "Contact support if you need to analyze this specific repository",
        ],
      }

    case "REPO_NOT_ACCESSIBLE":
      return {
        title: "Repository Not Accessible",
        message:
          "We couldn't access this repository. It may be private, deleted, or the URL might be incorrect.",
        actions: [
          "Make sure the repository is public (we don't support private repos)",
          "Verify the repository URL is correct",
          "Check if the repository still exists",
        ],
      }

    case "GEMINI_RATE_LIMIT":
      return {
        title: "Analysis Service Busy",
        message:
          "Our AI analysis service is currently experiencing high demand and has reached its capacity.",
        actions: [
          "Your scan quota has been refunded automatically",
          "Please try again in a few minutes",
          "Contact support if urgent",
        ],
      }

    case "MALICIOUS_CONTENT":
      return {
        title: "Security Alert",
        message:
          "This repository contains content that appears to be attempting to manipulate our analysis system. For security reasons, we cannot analyze this repository.",
        actions: [
          "If you believe this is an error, please contact our support team",
          "Make sure your repository doesn't contain prompts or instructions that could interfere with analysis",
        ],
      }

    case "UNKNOWN_ERROR":
    default:
      return {
        title: "Analysis Failed",
        message: "We encountered an unexpected error while analyzing your repository.",
        actions: [
          "Your scan quota has been refunded automatically",
          "Please try submitting your repository again",
          "If the problem persists, contact our support team",
        ],
      }
  }
}

/**
 * Gets the appropriate status badge label for display.
 * Ensures consistent UI representation of scan states.
 *
 * @param {string} status - Scan status from database
 * @returns {string} User-friendly status label
 *
 * @example
 * ```typescript
 * getStatusLabel('succeeded') // "Completed"
 * getStatusLabel('failed')    // "Failed"
 * getStatusLabel('running')   // "Analyzing..."
 * getStatusLabel('queued')    // "Queued"
 * ```
 */
export function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    queued: "Queued",
    running: "Analyzing...",
    succeeded: "Completed",
    failed: "Failed",
  }

  return statusLabels[status] || status
}
