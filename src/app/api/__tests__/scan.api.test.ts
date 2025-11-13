/**
 * @jest-environment node
 */

/**
 * Comprehensive Tests for Scan API
 *
 * Tests the scan API endpoint functionality
 *
 * @module scan.api.test
 */

import { POST } from "../scan/route"
import { NextRequest } from "next/server"

// Mock modules
jest.mock("@/lib/server/firebase-admin")
jest.mock("@/lib/server/scan-queue")
jest.mock("@/lib/server/git-handler")
jest.mock("@/lib/server/ip-utils")

/**
 * Helper function to create a mock NextRequest
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

describe("POST /api/scan", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mocks
    const firebaseAdmin = require("@/lib/server/firebase-admin")
    const scanQueue = require("@/lib/server/scan-queue")
    const gitHandler = require("@/lib/server/git-handler")
    const ipUtils = require("@/lib/server/ip-utils")

    firebaseAdmin.adminAuth = {
      verifyIdToken: jest.fn(),
    }

    firebaseAdmin.adminDb = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          id: "mock-scan-id",
          set: jest.fn().mockResolvedValue({}),
        })),
      })),
    }

    scanQueue.enqueueScan = jest.fn().mockResolvedValue({})

    gitHandler.parseGitUrl = jest.fn((url: string) => ({
      provider: "github",
      owner: "test-owner",
      repo: "test-repo",
    }))

    ipUtils.getClientIp = jest.fn(() => "192.168.1.1")
    ipUtils.hashIp = jest.fn((ip: string) => `hashed_${ip}`)
  })

  describe("Request Validation", () => {
    it("should reject request without repoUrl", async () => {
      const request = createMockRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Repository URL is required")
    })

    it("should reject request with non-string repoUrl", async () => {
      const request = createMockRequest({ repoUrl: 123 })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Repository URL is required")
    })

    it("should accept valid repository URL", async () => {
      const request = createMockRequest({
        repoUrl: "https://github.com/owner/repo",
      })
      const response = await POST(request)

      expect(response.status).toBe(202)
    })
  })

  describe("Response Format", () => {
    it("should return correct success response", async () => {
      const request = createMockRequest({
        repoUrl: "https://github.com/owner/repo",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(202)
      expect(data).toMatchObject({
        success: true,
        scanId: "mock-scan-id",
        status: "queued",
        message: "Repository scan has been queued for analysis",
        estimatedTime: "2-5 minutes",
        resultUrl: "/scan/mock-scan-id",
      })
    })
  })

  describe("Error Handling", () => {
    it("should handle internal errors gracefully", async () => {
      const firebaseAdmin = require("@/lib/server/firebase-admin")
      firebaseAdmin.adminDb.collection.mockImplementation(() => {
        throw new Error("Database error")
      })

      const request = createMockRequest({
        repoUrl: "https://github.com/owner/repo",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("Internal server error")
    })
  })
})
