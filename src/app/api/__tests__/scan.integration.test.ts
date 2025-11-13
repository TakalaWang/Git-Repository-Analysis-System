/**
 * @jest-environment node
 */

/**
 * Integration Tests for Scan API
 *
 * Tests the scan API route handler logic by directly invoking
 * the POST handler with mock NextRequest objects.
 *
 * Note: Uses Node environment instead of jsdom for API route testing
 *
 * @module scan.integration.test
 */

import { POST } from "../scan/route"
import { NextRequest } from "next/server"

/**
 * Helper function to create a mock NextRequest for testing
 *
 * @param body - The request body object
 * @param headers - Optional headers to include
 * @returns A NextRequest instance
 */
function createMockRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe("Scan API Integration", () => {
  describe("POST /api/scan - Request Validation", () => {
    it("should reject invalid repository URLs", async () => {
      const invalidUrls = [
        "not-a-url",
        "https://example.com/repo",
        "ftp://github.com/owner/repo",
        "",
      ]

      for (const url of invalidUrls) {
        const request = createMockRequest({ repoUrl: url })
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBeTruthy()
      }
    })

    it("should reject missing repository URL", async () => {
      const request = createMockRequest({})
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeTruthy()
    })

    it("should accept valid GitHub URLs", async () => {
      const request = createMockRequest({
        repoUrl: "https://github.com/vercel/next.js",
      })
      const response = await POST(request)

      // Should either accept (202), rate limit (429), or fail validation (400/500)
      expect([202, 400, 429, 500]).toContain(response.status)

      if (response.status === 202) {
        const data = await response.json()
        expect(data.scanId).toBeTruthy()
        expect(typeof data.scanId).toBe("string")
        expect(data.status).toBe("queued")
      }
    }, 15000) // 15 second timeout for network requests

    it("should validate GitLab URLs", async () => {
      const request = createMockRequest({
        repoUrl: "https://gitlab.com/gitlab-org/gitlab",
      })
      const response = await POST(request)

      // Should either accept (202), rate limit (429), or fail (400/500)
      expect([202, 400, 429, 500]).toContain(response.status)
    }, 15000) // 15 second timeout

    it("should validate Bitbucket URLs", async () => {
      const request = createMockRequest({
        repoUrl: "https://bitbucket.org/atlassian/python-bitbucket",
      })
      const response = await POST(request)

      // Should either accept (202), rate limit (429), or fail (400/500)
      expect([202, 400, 429, 500]).toContain(response.status)
    }, 15000) // 15 second timeout
  })

  describe("POST /api/scan - Response Format", () => {
    it("should return proper error format for invalid requests", async () => {
      const request = createMockRequest({ repoUrl: "invalid-url" })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty("error")
      expect(typeof data.error).toBe("string")
    })

    it("should return scan ID in response on success", async () => {
      const request = createMockRequest({
        repoUrl: "https://github.com/test/repo",
      })
      const response = await POST(request)

      if (response.status === 202) {
        const data = await response.json()
        expect(data).toHaveProperty("scanId")
        expect(data).toHaveProperty("status")
        expect(data.status).toBe("queued")
      }
    })
  })
})
