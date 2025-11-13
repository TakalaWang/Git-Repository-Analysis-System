/**
 * @jest-environment node
 */

/**
 * Tests for prompt generation functions
 */

import { getSystemPrompt, getAnalysisPrompt, RepositoryContext } from "../prompts"

describe("prompts", () => {
  describe("getSystemPrompt", () => {
    it("should return a non-empty system prompt", () => {
      const prompt = getSystemPrompt()

      expect(prompt).toBeDefined()
      expect(prompt.length).toBeGreaterThan(0)
      expect(typeof prompt).toBe("string")
    })

    it("should mention key analysis areas", () => {
      const prompt = getSystemPrompt()

      expect(prompt).toContain("Project Description")
      expect(prompt).toContain("Tech Stack")
      expect(prompt).toContain("skill level")
    })

    it("should mention skill levels", () => {
      const prompt = getSystemPrompt()

      expect(prompt).toContain("Beginner")
      expect(prompt).toContain("Junior")
      expect(prompt).toContain("Mid-level")
      expect(prompt).toContain("Senior")
    })
  })

  describe("getAnalysisPrompt", () => {
    const mockContext = {
      repoUrl: "https://github.com/test/repo",
      readmeContent: "# Test Repository\n\nThis is a test.",
      languages: {
        TypeScript: 50,
        JavaScript: 30,
        CSS: 10,
      },
      fileStructure: ["src/index.ts", "src/utils.ts", "package.json", "README.md"],
      packageFiles: {
        packageJson: {
          name: "test-repo",
          dependencies: {
            react: "^18.0.0",
            next: "^14.0.0",
          },
        },
      },
      totalFiles: 50,
      totalLines: 2500,
    } as unknown as RepositoryContext

    it("should include repository URL", () => {
      const prompt = getAnalysisPrompt(mockContext)

      expect(prompt).toContain(mockContext.repoUrl)
    })

    it("should include README content", () => {
      const prompt = getAnalysisPrompt(mockContext)

      expect(prompt).toContain("Test Repository")
    })

    it("should include code statistics", () => {
      const prompt = getAnalysisPrompt(mockContext)

      expect(prompt).toContain("Total Files: 50")
      expect(prompt).toContain("Total Lines: 2500")
    })

    it("should include language statistics", () => {
      const prompt = getAnalysisPrompt(mockContext)

      expect(prompt).toContain("TypeScript: 50 files")
      expect(prompt).toContain("JavaScript: 30 files")
    })

    it("should include file structure", () => {
      const prompt = getAnalysisPrompt(mockContext)

      expect(prompt).toContain("src/index.ts")
      expect(prompt).toContain("package.json")
    })

    it("should include dependencies", () => {
      const prompt = getAnalysisPrompt(mockContext)

      expect(prompt).toContain("react")
      expect(prompt).toContain("next")
    })

    it("should handle missing README", () => {
      const contextWithoutReadme = { ...mockContext, readmeContent: undefined }
      const prompt = getAnalysisPrompt(contextWithoutReadme)

      expect(prompt).toContain("No README found")
    })

    it("should limit file structure to 50 files", () => {
      const manyFiles = Array.from({ length: 100 }, (_, i) => `file${i}.ts`)
      const contextWithManyFiles = { ...mockContext, fileStructure: manyFiles }
      const prompt = getAnalysisPrompt(contextWithManyFiles)

      expect(prompt).toContain("and 50 more files")
    })

    it("should handle Python requirements.txt", () => {
      const contextWithPython = {
        ...mockContext,
        packageFiles: {
          requirementsTxt: "django==4.2.0\ncelery==5.3.0\nredis==4.5.0",
        },
      }
      const prompt = getAnalysisPrompt(contextWithPython)

      expect(prompt).toContain("Python Packages")
      expect(prompt).toContain("django")
    })

    it("should handle Ruby Gemfile", () => {
      const contextWithRuby = {
        ...mockContext,
        packageFiles: {
          gemfile: "source 'https://rubygems.org'\ngem 'rails'",
        },
      }
      const prompt = getAnalysisPrompt(contextWithRuby)

      expect(prompt).toContain("Ruby Gems")
    })

    it("should handle Go modules", () => {
      const contextWithGo = {
        ...mockContext,
        packageFiles: {
          goMod: "module example.com/myapp\n\ngo 1.21",
        },
      }
      const prompt = getAnalysisPrompt(contextWithGo)

      expect(prompt).toContain("Go Modules")
    })

    it("should handle Rust Cargo.toml", () => {
      const contextWithRust = {
        ...mockContext,
        packageFiles: {
          cargoToml: "[package]\nname = 'myapp'",
        },
      }
      const prompt = getAnalysisPrompt(contextWithRust)

      expect(prompt).toContain("Rust Crates")
    })

    it("should handle Java Maven pom.xml", () => {
      const contextWithMaven = {
        ...mockContext,
        packageFiles: {
          pomXml: "<project>...</project>",
        },
      }
      const prompt = getAnalysisPrompt(contextWithMaven)

      expect(prompt).toContain("Maven")
    })

    it("should handle Java Gradle build.gradle", () => {
      const contextWithGradle = {
        ...mockContext,
        packageFiles: {
          buildGradle: "plugins { id 'java' }",
        },
      }
      const prompt = getAnalysisPrompt(contextWithGradle)

      expect(prompt).toContain("Gradle")
    })
  })
})
