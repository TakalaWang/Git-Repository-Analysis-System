/**
 * Unit Tests for Rate Limiter Module
 *
 * Tests rate limiting logic, window calculations, and quota tracking.
 */

import { RATE_LIMITS } from "@/lib/server/rate-limiter"

describe("Rate Limiter", () => {
  describe("Rate Limit Configuration", () => {
    it("should have valid configuration", () => {
      expect(RATE_LIMITS.anonymous).toBeDefined()
      expect(RATE_LIMITS.authenticated).toBeDefined()
      expect(RATE_LIMITS.anonymous.maxRequests).toBeGreaterThan(0)
      expect(RATE_LIMITS.authenticated.maxRequests).toBeGreaterThan(0)
    })

    it("should have higher limits for authenticated users", () => {
      expect(RATE_LIMITS.authenticated.maxRequests).toBeGreaterThan(
        RATE_LIMITS.anonymous.maxRequests
      )
    })

    it("should have sensible time windows", () => {
      expect(RATE_LIMITS.anonymous.windowMs).toBeGreaterThan(0)
      expect(RATE_LIMITS.authenticated.windowMs).toBeGreaterThan(0)

      // Should be in reasonable range (e.g., 1 hour = 3600000ms)
      expect(RATE_LIMITS.anonymous.windowMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000)
      expect(RATE_LIMITS.authenticated.windowMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000)
    })

    it("should include human-readable labels", () => {
      expect(RATE_LIMITS.anonymous.windowLabel).toBeTruthy()
      expect(RATE_LIMITS.authenticated.windowLabel).toBeTruthy()
      expect(typeof RATE_LIMITS.anonymous.windowLabel).toBe("string")
      expect(typeof RATE_LIMITS.authenticated.windowLabel).toBe("string")
    })
  })

  describe("RATE_LIMITS constant", () => {
    it("should export configuration", () => {
      expect(RATE_LIMITS).toBeDefined()
      expect(RATE_LIMITS.anonymous).toBeDefined()
      expect(RATE_LIMITS.authenticated).toBeDefined()
    })

    it("should have default anonymous limit of 3 per hour", () => {
      expect(RATE_LIMITS.anonymous.maxRequests).toBe(3)
    })

    it("should have default authenticated limit of 20 per hour", () => {
      expect(RATE_LIMITS.authenticated.maxRequests).toBe(20)
    })
  })
})
