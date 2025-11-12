/**
 * Tests for IP utility functions
 */

import { getClientIp, hashIp, isValidIp } from "../ip-utils"
import { NextRequest } from "next/server"

describe("ip-utils", () => {
  describe("getClientIp", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const request = new NextRequest("http://localhost", {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      })

      const ip = getClientIp(request)
      expect(ip).toBe("192.168.1.1")
    })

    it("should extract IP from x-real-ip header", () => {
      const request = new NextRequest("http://localhost", {
        headers: {
          "x-real-ip": "192.168.1.2",
        },
      })

      const ip = getClientIp(request)
      expect(ip).toBe("192.168.1.2")
    })

    it("should return unknown for missing headers", () => {
      const request = new NextRequest("http://localhost")

      const ip = getClientIp(request)
      expect(ip).toBe("unknown")
    })

    it("should handle multiple IPs in x-forwarded-for", () => {
      const request = new NextRequest("http://localhost", {
        headers: {
          "x-forwarded-for": "203.0.113.1, 198.51.100.1, 192.0.2.1",
        },
      })

      const ip = getClientIp(request)
      expect(ip).toBe("203.0.113.1")
    })
  })

  describe("hashIp", () => {
    it("should return consistent hash for same IP", () => {
      const ip = "192.168.1.1"
      const hash1 = hashIp(ip)
      const hash2 = hashIp(ip)

      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^ip_[0-9a-z]+$/) // Format: ip_{hash}
    })

    it("should return different hashes for different IPs", () => {
      const hash1 = hashIp("192.168.1.1")
      const hash2 = hashIp("192.168.1.2")

      expect(hash1).not.toBe(hash2)
    })

    it("should handle IPv6 addresses", () => {
      const ipv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334"
      const hash = hashIp(ipv6)

      expect(hash).toMatch(/^ip_[0-9a-z]+$/)
      expect(typeof hash).toBe("string")
    })
  })

  describe("isValidIp", () => {
    it("should validate correct IPv4 addresses", () => {
      expect(isValidIp("192.168.1.1")).toBe(true)
      expect(isValidIp("10.0.0.1")).toBe(true)
      expect(isValidIp("172.16.0.1")).toBe(true)
      expect(isValidIp("8.8.8.8")).toBe(true)
    })

    it("should reject invalid IPv4 addresses", () => {
      // Note: The current regex is simple and may allow some invalid IPs
      // It checks format but not ranges (e.g., 256 is allowed)
      expect(isValidIp("192.168.1")).toBe(false)
      expect(isValidIp("192.168.1.1.1")).toBe(false)
      expect(isValidIp("abc.def.ghi.jkl")).toBe(false)
    })

    it("should validate full IPv6 addresses", () => {
      // Simple regex only validates full format (no compression)
      expect(isValidIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(true)
    })

    it("should reject invalid IPv6 addresses", () => {
      expect(isValidIp("2001:0db8:85a3::8a2e::7334")).toBe(false) // Double ::
      expect(isValidIp("gggg::1")).toBe(false) // Invalid hex
      // Compressed format not supported by simple regex
      expect(isValidIp("2001:db8::1")).toBe(false)
      expect(isValidIp("::1")).toBe(false)
      expect(isValidIp("fe80::1")).toBe(false)
    })

    it("should handle edge cases", () => {
      expect(isValidIp("")).toBe(false)
      expect(isValidIp("unknown")).toBe(false)
      expect(isValidIp("localhost")).toBe(false)
    })
  })
})
