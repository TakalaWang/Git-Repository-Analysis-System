/**
 * Unit Tests for Type Definitions
 *
 * Tests type constants and configuration objects.
 */

import { SCAN_STATUS_CONFIG, type SkillLevel, type ScanStatus } from "@/lib/types"

// SKILL_LEVEL_COLORS is defined locally in scan page, test via SCAN_STATUS_CONFIG instead

describe("Type Definitions", () => {
  describe("SkillLevel Type", () => {
    it("should have valid skill level options", () => {
      const validLevels: SkillLevel[] = ["Beginner", "Junior", "Mid-level", "Senior"]
      expect(validLevels).toHaveLength(4)

      validLevels.forEach((level) => {
        expect(["Beginner", "Junior", "Mid-level", "Senior"]).toContain(level)
      })
    })
  })

  describe("SCAN_STATUS_CONFIG", () => {
    it("should have configuration for all scan statuses", () => {
      expect(SCAN_STATUS_CONFIG["queued"]).toBeDefined()
      expect(SCAN_STATUS_CONFIG["running"]).toBeDefined()
      expect(SCAN_STATUS_CONFIG["succeeded"]).toBeDefined()
      expect(SCAN_STATUS_CONFIG["failed"]).toBeDefined()
    })

    it("should have label and variant for each status", () => {
      Object.values(SCAN_STATUS_CONFIG).forEach((config) => {
        expect(config.label).toBeTruthy()
        expect(config.variant).toBeTruthy()
        expect(typeof config.label).toBe("string")
        expect(typeof config.variant).toBe("string")
      })
    })

    it("should have appropriate variants", () => {
      expect(SCAN_STATUS_CONFIG.queued.variant).toBe("secondary")
      expect(SCAN_STATUS_CONFIG.running.variant).toBe("default")
      expect(SCAN_STATUS_CONFIG.succeeded.variant).toBe("outline")
      expect(SCAN_STATUS_CONFIG.failed.variant).toBe("destructive")
    })

    it("should have human-readable labels", () => {
      expect(SCAN_STATUS_CONFIG.queued.label).toBe("Queued")
      expect(SCAN_STATUS_CONFIG.running.label).toBe("Running")
      expect(SCAN_STATUS_CONFIG.succeeded.label).toBe("Completed")
      expect(SCAN_STATUS_CONFIG.failed.label).toBe("Failed")
    })
  })

  describe("Type Safety", () => {
    it("should enforce valid scan statuses at compile time", () => {
      const validStatuses: ScanStatus[] = ["queued", "running", "succeeded", "failed"]
      validStatuses.forEach((status) => {
        expect(SCAN_STATUS_CONFIG[status]).toBeDefined()
      })
    })

    it("should have consistent status types", () => {
      const statuses = Object.keys(SCAN_STATUS_CONFIG) as ScanStatus[]
      expect(statuses).toContain("queued")
      expect(statuses).toContain("running")
      expect(statuses).toContain("succeeded")
      expect(statuses).toContain("failed")
    })
  })
})
