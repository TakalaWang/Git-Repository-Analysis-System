/**
 * Tests for Error Message Utilities
 *
 * Tests user-friendly error message generation
 *
 * @module error-messages.test
 */

import { getUserFriendlyError } from "../error-messages"
import type { ErrorCode } from "../types"

describe("getUserFriendlyError", () => {
  describe("RATE_LIMIT_EXCEEDED", () => {
    it("should return appropriate message", () => {
      const result = getUserFriendlyError("RATE_LIMIT_EXCEEDED")

      expect(result.title).toBe("Rate Limit Reached")
      expect(result.message).toContain("quota")
      expect(result.actions).toBeInstanceOf(Array)
      expect(result.actions.length).toBeGreaterThan(0)
    })
  })

  describe("REPO_TOO_LARGE", () => {
    it("should return appropriate message", () => {
      const result = getUserFriendlyError("REPO_TOO_LARGE")

      expect(result.title).toBe("Repository Too Large")
      expect(result.message).toContain("too long to download")
      expect(result.actions).toBeInstanceOf(Array)
    })
  })

  describe("REPO_NOT_ACCESSIBLE", () => {
    it("should return appropriate message", () => {
      const result = getUserFriendlyError("REPO_NOT_ACCESSIBLE")

      expect(result.title).toBe("Repository Not Accessible")
      expect(result.message).toContain("access")
      expect(result.actions).toBeInstanceOf(Array)
    })
  })

  describe("GEMINI_RATE_LIMIT", () => {
    it("should return appropriate message", () => {
      const result = getUserFriendlyError("GEMINI_RATE_LIMIT")

      expect(result.title).toBe("Analysis Service Busy")
      expect(result.message).toContain("high demand")
      expect(result.actions).toBeInstanceOf(Array)
    })
  })

  describe("MALICIOUS_CONTENT", () => {
    it("should return appropriate message", () => {
      const result = getUserFriendlyError("MALICIOUS_CONTENT")

      expect(result.title).toBe("Security Alert")
      expect(result.message).toContain("manipulate our analysis system")
      expect(result.actions).toBeInstanceOf(Array)
    })
  })

  describe("UNKNOWN_ERROR", () => {
    it("should return generic error message", () => {
      const result = getUserFriendlyError("UNKNOWN_ERROR")

      expect(result.title).toBe("Analysis Failed")
      expect(result.message).toContain("unexpected")
      expect(result.actions).toBeInstanceOf(Array)
    })
  })

  describe("All error codes", () => {
    const errorCodes: ErrorCode[] = [
      "RATE_LIMIT_EXCEEDED",
      "REPO_TOO_LARGE",
      "REPO_NOT_ACCESSIBLE",
      "GEMINI_RATE_LIMIT",
      "MALICIOUS_CONTENT",
      "UNKNOWN_ERROR",
    ]

    it("should return valid structure for all error codes", () => {
      errorCodes.forEach((code) => {
        const result = getUserFriendlyError(code)

        expect(result).toHaveProperty("title")
        expect(result).toHaveProperty("message")
        expect(result).toHaveProperty("actions")
        expect(typeof result.title).toBe("string")
        expect(typeof result.message).toBe("string")
        expect(Array.isArray(result.actions)).toBe(true)
        expect(result.title.length).toBeGreaterThan(0)
        expect(result.message.length).toBeGreaterThan(0)
      })
    })

    it("should provide actionable guidance", () => {
      errorCodes.forEach((code) => {
        const result = getUserFriendlyError(code)

        // Each error should have at least one suggested action
        // (except UNKNOWN_ERROR which might have fewer)
        if (code !== "UNKNOWN_ERROR") {
          expect(result.actions.length).toBeGreaterThan(0)
        }
      })
    })

    it("should not expose technical details", () => {
      errorCodes.forEach((code) => {
        const result = getUserFriendlyError(code)

        // Messages should be user-friendly, not technical
        expect(result.message.toLowerCase()).not.toContain("error code")
        expect(result.message.toLowerCase()).not.toContain("exception")
        expect(result.message.toLowerCase()).not.toContain("stack trace")
      })
    })
  })
})
