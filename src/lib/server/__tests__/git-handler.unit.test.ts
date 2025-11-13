/**
 * Unit Tests for Git Handler Module
 *
 * Tests repository URL validation, parsing, and utility functions.
 */

import { isValidGitUrl, parseGitUrl } from "@/lib/server/git-handler"

describe("Git Handler - URL Validation", () => {
  describe("isValidGitUrl", () => {
    it("should accept valid GitHub HTTPS URLs", () => {
      expect(isValidGitUrl("https://github.com/owner/repo")).toBe(true)
      expect(isValidGitUrl("https://github.com/owner/repo.git")).toBe(true)
    })

    it("should accept valid GitLab HTTPS URLs", () => {
      expect(isValidGitUrl("https://gitlab.com/owner/repo")).toBe(true)
      expect(isValidGitUrl("https://gitlab.com/owner/repo.git")).toBe(true)
    })

    it("should accept valid Bitbucket HTTPS URLs", () => {
      expect(isValidGitUrl("https://bitbucket.org/owner/repo")).toBe(true)
      expect(isValidGitUrl("https://bitbucket.org/owner/repo.git")).toBe(true)
    })

    it("should accept valid SSH URLs", () => {
      expect(isValidGitUrl("git@github.com:owner/repo.git")).toBe(true)
      expect(isValidGitUrl("git@gitlab.com:owner/repo.git")).toBe(true)
      expect(isValidGitUrl("git@bitbucket.org:owner/repo.git")).toBe(true)
    })

    it("should reject invalid URLs", () => {
      expect(isValidGitUrl("https://example.com/repo")).toBe(false)
      expect(isValidGitUrl("not-a-url")).toBe(false)
      expect(isValidGitUrl("ftp://github.com/owner/repo")).toBe(false)
      expect(isValidGitUrl("")).toBe(false)
    })

    it("should reject URLs with invalid characters", () => {
      expect(isValidGitUrl("https://github.com/owner/repo with spaces")).toBe(false)
      expect(isValidGitUrl("https://github.com/owner/")).toBe(false)
    })
  })

  describe("parseGitUrl", () => {
    it("should parse GitHub URL correctly", () => {
      const result = parseGitUrl("https://github.com/vercel/next.js")
      expect(result.provider).toBe("github")
      expect(result.owner).toBe("vercel")
      expect(result.repo).toBe("next.js")
      expect(result.url).toBe("https://github.com/vercel/next.js.git")
    })

    it("should parse GitLab URL correctly", () => {
      const result = parseGitUrl("https://gitlab.com/group/project")
      expect(result.provider).toBe("gitlab")
      expect(result.owner).toBe("group")
      expect(result.repo).toBe("project")
    })

    it("should parse Bitbucket URL correctly", () => {
      const result = parseGitUrl("https://bitbucket.org/team/repo")
      expect(result.provider).toBe("bitbucket")
      expect(result.owner).toBe("team")
      expect(result.repo).toBe("repo")
    })

    it("should handle URLs without .git extension", () => {
      const result = parseGitUrl("https://github.com/owner/repo")
      expect(result.url).toBe("https://github.com/owner/repo.git")
    })

    it("should handle URLs with .git extension", () => {
      const result = parseGitUrl("https://github.com/owner/repo.git")
      expect(result.url).toBe("https://github.com/owner/repo.git")
    })

    it("should detect unknown providers", () => {
      const result = parseGitUrl("https://example.com/owner/repo")
      expect(result.provider).toBe("other")
    })
  })
})
