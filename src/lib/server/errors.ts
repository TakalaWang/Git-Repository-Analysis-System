/**
 * Custom Error Classes with Error Codes
 *
 * Provides typed error classes that include specific error codes
 * for consistent error handling across the application.
 *
 * @module errors
 */

import type { ErrorCode } from "@/lib/types"

/**
 * Base class for application errors with error codes.
 * Extends the native Error class to include an errorCode property.
 */
export class AppError extends Error {
  public readonly errorCode: ErrorCode

  constructor(message: string, errorCode: ErrorCode) {
    super(message)
    this.name = "AppError"
    this.errorCode = errorCode
  }
}

/**
 * Error thrown when a repository is too large or takes too long to process.
 */
export class RepositoryTooLargeError extends AppError {
  constructor(message = "Repository is too large or took too long to process") {
    super(message, "REPO_TOO_LARGE")
    this.name = "RepositoryTooLargeError"
  }
}

/**
 * Error thrown when a repository cannot be accessed.
 * This includes private repositories, deleted repositories, or invalid URLs.
 */
export class RepositoryNotAccessibleError extends AppError {
  constructor(message = "Repository is not accessible") {
    super(message, "REPO_NOT_ACCESSIBLE")
    this.name = "RepositoryNotAccessibleError"
  }
}

/**
 * Error thrown when Gemini API rate limit is exceeded.
 */
export class GeminiRateLimitError extends AppError {
  constructor(message = "Gemini API rate limit exceeded") {
    super(message, "GEMINI_RATE_LIMIT")
    this.name = "GeminiRateLimitError"
  }
}

/**
 * Error thrown when malicious content is detected in a repository.
 */
export class MaliciousContentError extends AppError {
  constructor(message = "Repository contains potentially malicious content") {
    super(message, "MALICIOUS_CONTENT")
    this.name = "MaliciousContentError"
  }
}

/**
 * Helper function to extract error code from an error object.
 * If the error is an AppError, returns its errorCode.
 * Otherwise, returns "UNKNOWN_ERROR".
 */
export function getErrorCode(error: unknown): ErrorCode {
  if (error instanceof AppError) {
    return error.errorCode
  }
  return "UNKNOWN_ERROR"
}
