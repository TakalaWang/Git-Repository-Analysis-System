/**
 * Tests for Error Handling System
 *
 * Tests custom error classes and error code mapping
 *
 * @module errors.test
 */

import {
  AppError,
  RepositoryTooLargeError,
  RepositoryNotAccessibleError,
  GeminiRateLimitError,
  MaliciousContentError,
  getErrorCode,
} from "../errors"

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should create error with code", () => {
      const error = new AppError("Test error", "UNKNOWN_ERROR")

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AppError)
      expect(error.message).toBe("Test error")
      expect(error.errorCode).toBe("UNKNOWN_ERROR")
      expect(error.name).toBe("AppError")
    })
  })

  describe("RepositoryTooLargeError", () => {
    it("should have correct error code", () => {
      const error = new RepositoryTooLargeError("Repository is too large")

      expect(error).toBeInstanceOf(AppError)
      expect(error.errorCode).toBe("REPO_TOO_LARGE")
      expect(error.name).toBe("RepositoryTooLargeError")
    })
  })

  describe("RepositoryNotAccessibleError", () => {
    it("should have correct error code", () => {
      const error = new RepositoryNotAccessibleError("Cannot access repository")

      expect(error).toBeInstanceOf(AppError)
      expect(error.errorCode).toBe("REPO_NOT_ACCESSIBLE")
      expect(error.name).toBe("RepositoryNotAccessibleError")
    })
  })

  describe("GeminiRateLimitError", () => {
    it("should have correct error code", () => {
      const error = new GeminiRateLimitError("Gemini API rate limit exceeded")

      expect(error).toBeInstanceOf(AppError)
      expect(error.errorCode).toBe("GEMINI_RATE_LIMIT")
      expect(error.name).toBe("GeminiRateLimitError")
    })
  })

  describe("MaliciousContentError", () => {
    it("should have correct error code", () => {
      const error = new MaliciousContentError("Detected malicious content")

      expect(error).toBeInstanceOf(AppError)
      expect(error.errorCode).toBe("MALICIOUS_CONTENT")
      expect(error.name).toBe("MaliciousContentError")
    })
  })

  describe("getErrorCode", () => {
    it("should extract code from AppError", () => {
      const error = new RepositoryTooLargeError("Too large")
      expect(getErrorCode(error)).toBe("REPO_TOO_LARGE")
    })

    it("should return UNKNOWN_ERROR for generic errors", () => {
      const error = new Error("Generic error")
      expect(getErrorCode(error)).toBe("UNKNOWN_ERROR")
    })

    it("should return UNKNOWN_ERROR for generic Error instances", () => {
      const error = new Error("Generic error")
      expect(getErrorCode(error)).toBe("UNKNOWN_ERROR")
    })

    it("should return errorCode from AppError instances", () => {
      const error = new AppError("Rate limit exceeded", "RATE_LIMIT_EXCEEDED")
      expect(getErrorCode(error)).toBe("RATE_LIMIT_EXCEEDED")
    })

    it("should return errorCode from custom error class instances", () => {
      const geminiError = new GeminiRateLimitError()
      expect(getErrorCode(geminiError)).toBe("GEMINI_RATE_LIMIT")

      const repoError = new RepositoryNotAccessibleError("Repo not found")
      expect(getErrorCode(repoError)).toBe("REPO_NOT_ACCESSIBLE")
    })
  })
})

describe("Error Code System", () => {
  it("should have unique error codes for each error type", () => {
    const errors = [
      new RepositoryTooLargeError(""),
      new RepositoryNotAccessibleError(""),
      new GeminiRateLimitError(""),
      new MaliciousContentError(""),
    ]

    const codes = errors.map((e) => e.errorCode)
    const uniqueCodes = new Set(codes)

    expect(uniqueCodes.size).toBe(codes.length)
  })

  it("should all extend AppError", () => {
    const errors = [
      new RepositoryTooLargeError(""),
      new RepositoryNotAccessibleError(""),
      new GeminiRateLimitError(""),
      new MaliciousContentError(""),
    ]

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(AppError)
      expect(error).toBeInstanceOf(Error)
    })
  })
})
