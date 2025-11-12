/**
 * Tests for repository analyzer functions
 */

import { analyzeRepository } from "../repository-analyzer"
import * as fs from "fs/promises"
import * as path from "path"

describe("repository-analyzer", () => {
  const testRepoPath = path.join("/tmp", "test-repo-analyzer")

  beforeAll(async () => {
    // Create test repository structure
    await fs.mkdir(testRepoPath, { recursive: true })
    await fs.mkdir(path.join(testRepoPath, "src"), { recursive: true })
    await fs.mkdir(path.join(testRepoPath, "tests"), { recursive: true })

    // Create test files
    await fs.writeFile(
      path.join(testRepoPath, "README.md"),
      "# Test Repository\n\nThis is a test repository for analyzer testing."
    )
    await fs.writeFile(
      path.join(testRepoPath, "package.json"),
      JSON.stringify({
        name: "test-repo",
        dependencies: {
          react: "^18.0.0",
          next: "^14.0.0",
        },
      })
    )
    await fs.writeFile(path.join(testRepoPath, "src", "index.ts"), "console.log('Hello')\n")
    await fs.writeFile(path.join(testRepoPath, "src", "utils.ts"), "export function add() {}\n")
    await fs.writeFile(
      path.join(testRepoPath, "tests", "index.test.ts"),
      "test('example', () => {})\n"
    )
  })

  afterAll(async () => {
    // Cleanup test directory
    await fs.rm(testRepoPath, { recursive: true, force: true })
  })

  describe("analyzeRepository", () => {
    it("should analyze repository structure correctly", async () => {
      const result = await analyzeRepository(testRepoPath, "https://github.com/test/repo")

      expect(result).toBeDefined()
      expect(result.repoUrl).toBe("https://github.com/test/repo")
      expect(result.totalFiles).toBeGreaterThan(0)
      expect(result.totalLines).toBeGreaterThan(0)
    })

    it("should detect programming languages", async () => {
      const result = await analyzeRepository(testRepoPath, "https://github.com/test/repo")

      expect(result.languages).toBeDefined()
      expect(result.languages.TypeScript).toBeGreaterThan(0)
    })

    it("should read README content", async () => {
      const result = await analyzeRepository(testRepoPath, "https://github.com/test/repo")

      expect(result.readmeContent).toBeDefined()
      expect(result.readmeContent).toContain("Test Repository")
    })

    it("should parse package.json", async () => {
      const result = await analyzeRepository(testRepoPath, "https://github.com/test/repo")

      expect(result.configFiles.packageManagers).toBeDefined()
      expect(result.configFiles.packageManagers?.["package.json"]).toBeDefined()
      expect(result.configFiles.packageManagers?.["package.json"]).toContain("test-repo")
      expect(result.configFiles.packageManagers?.["package.json"]).toContain("react")
    })

    it("should include file structure", async () => {
      const result = await analyzeRepository(testRepoPath, "https://github.com/test/repo")

      expect(result.fileStructure).toBeDefined()
      expect(result.fileStructure.length).toBeGreaterThan(0)
      expect(result.fileStructure.some((f: string) => f.includes("README.md"))).toBe(true)
      expect(result.fileStructure.some((f: string) => f.includes("package.json"))).toBe(true)
    })

    it("should exclude node_modules and .git directories", async () => {
      // Create node_modules directory
      await fs.mkdir(path.join(testRepoPath, "node_modules"), { recursive: true })
      await fs.writeFile(path.join(testRepoPath, "node_modules", "test.js"), "// test")

      const result = await analyzeRepository(testRepoPath, "https://github.com/test/repo")

      expect(result.fileStructure.some((f: string) => f.includes("node_modules"))).toBe(false)

      // Cleanup
      await fs.rm(path.join(testRepoPath, "node_modules"), { recursive: true, force: true })
    })

    it("should handle repository without README", async () => {
      const tempPath = path.join("/tmp", "test-repo-no-readme")
      await fs.mkdir(tempPath, { recursive: true })
      await fs.writeFile(path.join(tempPath, "index.js"), "console.log('test')")

      const result = await analyzeRepository(tempPath, "https://github.com/test/repo")

      expect(result.readmeContent).toBeUndefined()

      // Cleanup
      await fs.rm(tempPath, { recursive: true, force: true })
    })

    it("should handle empty repository", async () => {
      const tempPath = path.join("/tmp", "test-repo-empty")
      await fs.mkdir(tempPath, { recursive: true })

      const result = await analyzeRepository(tempPath, "https://github.com/test/repo")

      expect(result.totalFiles).toBe(0)
      expect(result.totalLines).toBe(0)
      expect(result.fileStructure).toEqual([])

      // Cleanup
      await fs.rm(tempPath, { recursive: true, force: true })
    })
  })
})
