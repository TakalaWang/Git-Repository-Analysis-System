/**
 * Repository Analyzer Module
 *
 * Provides comprehensive static analysis of Git repositories to extract:
 * - File statistics and directory structure
 * - Programming language distribution
 * - Package manager files and dependencies
 * - README documentation content
 * - Code metrics (file count, line count)
 *
 * Supports 40+ programming languages and multiple package managers
 * (npm, pip, bundler, cargo, maven, gradle, go modules).
 *
 * The analysis is designed to be fast and memory-efficient, with built-in
 * safeguards against processing overly large repositories.
 *
 * @module repository-analyzer
 */

import fs from "fs/promises"
import path from "path"
import { RepositoryContext } from "./prompts"
import { getGitLog } from "./git-handler"
import { analyzeTimelineWithAI } from "./gemini"
import type { TimelineEvent } from "../types"

/**
 * Mapping of file extensions to programming language names.
 * Used for automatic language detection and statistics.
 *
 * @constant
 * @type {Record<string, string>}
 */
const LANGUAGE_MAP: Record<string, string> = {
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".py": "Python",
  ".java": "Java",
  ".cpp": "C++",
  ".c": "C",
  ".cs": "C#",
  ".go": "Go",
  ".rs": "Rust",
  ".rb": "Ruby",
  ".php": "PHP",
  ".swift": "Swift",
  ".kt": "Kotlin",
  ".scala": "Scala",
  ".r": "R",
  ".m": "Objective-C",
  ".h": "C/C++ Header",
  ".vue": "Vue",
  ".dart": "Dart",
  ".ex": "Elixir",
  ".clj": "Clojure",
  ".hs": "Haskell",
  ".lua": "Lua",
  ".pl": "Perl",
  ".sh": "Shell",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sass": "Sass",
  ".less": "Less",
  ".json": "JSON",
  ".xml": "XML",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".sql": "SQL",
  ".md": "Markdown",
}

/**
 * Directories to ignore during repository analysis.
 * These are typically build artifacts, dependencies, or version control folders
 * that don't contain meaningful source code for analysis.
 *
 * @constant
 * @type {Set<string>}
 */
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".cache",
  "vendor",
  "target",
  "__pycache__",
  ".venv",
  "venv",
  ".idea",
  ".vscode",
])

/**
 * Configuration file patterns to search for in repositories.
 * Uses glob-like patterns to match various config files.
 *
 * These patterns are intentionally broad to capture all relevant configuration
 * files, allowing the LLM to analyze the complete project setup and determine
 * the actual tech stack, package managers, and tools used.
 *
 * Categories:
 * - Package/Dependency Management
 * - Build & Compilation
 * - Code Quality & Linting
 * - Testing
 * - Deployment & CI/CD
 * - Environment & Runtime
 *
 * @constant
 */
const CONFIG_FILE_PATTERNS = {
  // Package/Dependency files (all package managers)
  packageManagers: [
    "package.json",
    ".npmrc",
    ".yarnrc",
    "requirements.txt",
    "Pipfile",
    "pyproject.toml",
    "setup.py",
    "setup.cfg",
    "environment.yml",
    "environment.yaml",
    "conda.yml",
    "conda.yaml",
    "Gemfile",
    ".ruby-version",
    "go.mod",
    "go.sum",
    "Cargo.toml",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "settings.gradle",
    "gradle.properties",
    "composer.json",
    "Package.swift",
    "Package.resolved",
    "pubspec.yaml",
    "mix.exs",
    "build.sbt",
    "project.clj",
    "DESCRIPTION",
    "NAMESPACE", // R
    "Podfile",
    "Cartfile",
    "Cartfile.resolved", // Carthage
  ],

  // Build & Compilation configuration
  buildTools: [
    "tsconfig.json",
    "jsconfig.json",
    "webpack.config.js",
    "webpack.config.ts",
    "vite.config.js",
    "vite.config.ts",
    "rollup.config.js",
    "rollup.config.ts",
    "next.config.js",
    "next.config.ts",
    "next.config.mjs",
    "nuxt.config.js",
    "nuxt.config.ts",
    "vue.config.js",
    "svelte.config.js",
    "astro.config.mjs",
    "esbuild.config.js",
    "babel.config.js",
    "babel.config.json",
    ".babelrc",
    ".babelrc.json",
    "Makefile",
    "CMakeLists.txt",
    "Rakefile",
  ],

  // Code Quality & Linting
  codeQuality: [
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.json",
    ".eslintrc.yaml",
    "eslint.config.js",
    "eslint.config.mjs",
    ".prettierrc",
    ".prettierrc.js",
    ".prettierrc.json",
    ".prettierrc.yaml",
    "prettier.config.js",
    ".stylelintrc",
    ".stylelintrc.js",
    ".stylelintrc.json",
    "tslint.json",
    ".pylintrc",
    "pylint.rc",
    ".flake8",
    "mypy.ini",
    ".mypy.ini",
    "rubocop.yml",
    ".rubocop.yml",
    ".editorconfig",
  ],

  // Testing configuration
  testing: [
    "jest.config.js",
    "jest.config.ts",
    "jest.config.json",
    "vitest.config.js",
    "vitest.config.ts",
    "karma.conf.js",
    "playwright.config.js",
    "playwright.config.ts",
    "cypress.json",
    "cypress.config.js",
    "cypress.config.ts",
    "pytest.ini",
    "tox.ini",
    ".rspec",
  ],

  // Deployment & CI/CD
  deployment: [
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    ".dockerignore",
    "Procfile",
    "app.yaml",
    "app.yml", // Google App Engine
    "serverless.yml",
    "serverless.yaml",
    "vercel.json",
    "netlify.toml",
    ".github/workflows/*.yml",
    ".github/workflows/*.yaml",
    ".gitlab-ci.yml",
    ".travis.yml",
    "azure-pipelines.yml",
    "Jenkinsfile",
  ],

  // Environment & Runtime
  environment: [
    ".env.example",
    ".env.local",
    ".env.development",
    ".env.production",
    ".nvmrc",
    ".node-version",
    ".python-version",
    "runtime.txt",
    ".tool-versions",
  ],

  // Project-specific files
  projectFiles: [
    ".csproj",
    ".fsproj",
    ".vbproj", // .NET projects (glob pattern)
    "packages.config", // NuGet
  ],
}

/**
 * Analyzes a cloned Git repository and extracts comprehensive context.
 *
 * This is the main entry point for repository analysis. It performs:
 * 1. README file detection and reading
 * 2. Recursive directory scanning
 * 3. Language statistics collection
 * 4. File structure mapping
 * 5. Package file extraction
 * 6. Code metrics calculation
 *
 * The analysis respects IGNORE_DIRS to skip common build/dependency folders.
 * Large repositories are handled gracefully with file structure limits (1000 files).
 *
 * @param {string} repoPath - Local filesystem path to the cloned repository root
 * @param {string} repoUrl - Original repository URL for reference
 * @returns {Promise<RepositoryContext>} Comprehensive analysis context for AI processing
 *
 * @throws {Error} If repository path is inaccessible or analysis fails
 *
 * @example
 * ```typescript
 * // Analyze a cloned repository
 * const repoInfo = await cloneRepository('https://github.com/vercel/next.js')
 * const context = await analyzeRepository(repoInfo.localPath, repoInfo.url)
 *
 * console.log(`Analyzed ${context.totalFiles} files`)
 * console.log(`Total lines: ${context.totalLines}`)
 * console.log(`Languages:`, context.languages)
 * console.log(`Has README: ${!!context.readmeContent}`)
 *
 * // Use context for AI analysis
 * const aiAnalysis = await analyzeWithGemini(context)
 * ```
 */
export async function analyzeRepository(
  repoPath: string,
  repoUrl: string
): Promise<RepositoryContext> {
  console.log(`Analyzing repository at: ${repoPath}`)

  // Initialize context
  const context: RepositoryContext = {
    repoUrl,
    languages: {},
    fileStructure: [],
    configFiles: {},
    totalFiles: 0,
    totalLines: 0,
  }

  try {
    // Read README
    context.readmeContent = await findAndReadReadme(repoPath)

    // Scan directory structure
    await scanDirectory(repoPath, repoPath, context)

    // Collect ALL configuration files (package managers, build tools, etc.)
    const allConfigFiles = await collectConfigFiles(repoPath)

    // Categorize config files for better organization
    context.configFiles = categorizeConfigFiles(allConfigFiles)

    console.log(`Analysis complete: ${context.totalFiles} files, ${context.totalLines} lines`)
    console.log(`Languages:`, context.languages)
    console.log(`Config files found:`, Object.keys(allConfigFiles).length)

    return context
  } catch (error) {
    console.error("Repository analysis failed:", error)
    throw error
  }
}

/**
 * Recursively scans a directory to collect file statistics and structure.
 *
 * This internal function traverses the directory tree, respecting IGNORE_DIRS,
 * and populates the context object with:
 * - Language distribution statistics
 * - File structure (paths)
 * - Total file and line counts
 *
 * Includes depth limiting (max 10 levels) to prevent excessive recursion
 * on deeply nested structures.
 *
 * @param {string} currentPath - Current directory being scanned
 * @param {string} basePath - Base repository path (for calculating relative paths)
 * @param {RepositoryContext} context - Context object to populate with findings
 * @param {number} [depth=0] - Current recursion depth (prevents infinite loops)
 * @returns {Promise<void>}
 *
 * @private
 */
async function scanDirectory(
  currentPath: string,
  basePath: string,
  context: RepositoryContext,
  depth: number = 0
): Promise<void> {
  // Limit recursion depth to prevent excessive processing
  if (depth > 10) return

  try {
    const entries = await fs.readdir(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)
      const relativePath = path.relative(basePath, fullPath)

      if (entry.isDirectory()) {
        // Skip ignored directories
        if (IGNORE_DIRS.has(entry.name)) {
          continue
        }

        // Recurse into subdirectory
        await scanDirectory(fullPath, basePath, context, depth + 1)
      } else if (entry.isFile()) {
        // Process file
        await processFile(fullPath, relativePath, context)
      }
    }
  } catch (error) {
    console.error(`Failed to scan directory ${currentPath}:`, error)
    // Continue processing other directories
  }
}

/**
 * Processes an individual file to update repository context.
 *
 * Extracts and records:
 * - File language (based on extension)
 * - Relative file path (for structure)
 * - Line count (for text files only)
 *
 * Binary files are skipped for line counting. The file structure array
 * is limited to 1000 entries to prevent memory issues with large repos.
 *
 * @param {string} filePath - Full filesystem path to the file
 * @param {string} relativePath - Path relative to repository root
 * @param {RepositoryContext} context - Context object to update
 * @returns {Promise<void>}
 *
 * @private
 */
async function processFile(
  filePath: string,
  relativePath: string,
  context: RepositoryContext
): Promise<void> {
  try {
    const ext = path.extname(relativePath).toLowerCase()
    const language = LANGUAGE_MAP[ext] || "Other"

    // Update language statistics
    context.languages[language] = (context.languages[language] || 0) + 1

    // Add to file structure (limit to prevent overflow)
    if (context.fileStructure.length < 1000) {
      context.fileStructure.push(relativePath)
    }

    // Count total files
    context.totalFiles++

    // Count lines for text files (skip binary files)
    if (isTextFile(ext)) {
      const lines = await countLines(filePath)
      context.totalLines += lines
    }
  } catch (error) {
    console.error(`Failed to process file ${relativePath}:`, error)
    // Continue processing other files
  }
}

/**
 * Determines if a file is a text file (not binary) based on its extension.
 *
 * Used to decide whether to attempt line counting. Binary files (images,
 * executables, archives, etc.) are excluded to prevent reading errors and
 * improve performance.
 *
 * @param {string} ext - File extension (including the leading dot, e.g., '.js')
 * @returns {boolean} True if the file is likely a text file
 *
 * @private
 */
function isTextFile(ext: string): boolean {
  const textExtensions = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".java",
    ".cpp",
    ".c",
    ".cs",
    ".go",
    ".rs",
    ".rb",
    ".php",
    ".swift",
    ".kt",
    ".scala",
    ".r",
    ".m",
    ".h",
    ".vue",
    ".dart",
    ".ex",
    ".clj",
    ".hs",
    ".lua",
    ".pl",
    ".sh",
    ".html",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".json",
    ".xml",
    ".yaml",
    ".yml",
    ".sql",
    ".md",
    ".txt",
    ".env",
    ".gitignore",
    ".config",
  ])
  return textExtensions.has(ext)
}

/**
 * Counts the number of lines in a text file.
 *
 * Reads the entire file content and splits by newlines to count lines.
 * Returns 0 if the file is too large, binary, or unreadable to prevent
 * memory issues or read errors.
 *
 * @param {string} filePath - Full filesystem path to the file
 * @returns {Promise<number>} Number of lines, or 0 if counting fails
 *
 * @private
 */
async function countLines(filePath: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return content.split("\n").length
  } catch {
    // File might be too large or binary, return 0
    return 0
  }
}

/**
 * Searches for and reads the README file in a repository.
 *
 * Tries common README filename variations:
 * - README.md (most common)
 * - README.MD
 * - readme.md
 * - README (no extension)
 * - README.txt
 *
 * Content is truncated to 10,000 characters to prevent token overflow
 * in AI processing while preserving the most important information.
 *
 * @param {string} repoPath - Repository root directory path
 * @returns {Promise<string|undefined>} README content (truncated), or undefined if not found
 *
 * @private
 */
async function findAndReadReadme(repoPath: string): Promise<string | undefined> {
  const readmeNames = ["README.md", "README.MD", "readme.md", "README", "README.txt"]

  for (const name of readmeNames) {
    const readmePath = path.join(repoPath, name)
    try {
      const content = await fs.readFile(readmePath, "utf-8")
      // Limit README content to 10000 characters to prevent token overflow
      return content.length > 10000 ? content.substring(0, 10000) + "..." : content
    } catch {
      // File doesn't exist, try next name
      continue
    }
  }

  return undefined
}

/**
 * Recursively collects all configuration files from the repository.
 *
 * This function scans the repository for ALL configuration files including:
 * - Package/dependency files (package.json, requirements.txt, go.mod, etc.)
 * - Build configurations (webpack, vite, tsconfig, etc.)
 * - Code quality configs (eslint, prettier, etc.)
 * - Testing configs (jest, pytest, etc.)
 * - Deployment files (Dockerfile, CI/CD configs)
 * - Environment files
 *
 * The LLM will analyze ALL these files together to determine:
 * - What package managers are used
 * - What build tools are configured
 * - What testing frameworks are present
 * - What deployment strategies are used
 * - Complete tech stack
 *
 * This approach is flexible and doesn't require hardcoding specific package managers,
 * making it future-proof and able to handle any project configuration.
 *
 * Files are organized by category and limited to 50KB each to prevent token overflow.
 *
 * @param {string} repoPath - Repository root directory path
 * @param {string} currentPath - Current directory being scanned (for recursion)
 * @param {number} depth - Current recursion depth (limit to 3 levels)
 * @returns {Promise<Record<string, string>>} Map of file paths to their contents
 *
 * @private
 */
async function collectConfigFiles(
  repoPath: string,
  currentPath: string = repoPath,
  depth: number = 0
): Promise<Record<string, string>> {
  const configFiles: Record<string, string> = {}
  const MAX_DEPTH = 3 // Limit recursion depth
  const MAX_FILE_SIZE = 50 * 1024 // 50KB limit per file

  if (depth > MAX_DEPTH) return configFiles

  try {
    const items = await fs.readdir(currentPath, { withFileTypes: true })

    for (const item of items) {
      const fullPath = path.join(currentPath, item.name)
      const relativePath = path.relative(repoPath, fullPath)

      // Skip ignored directories
      if (item.isDirectory()) {
        if (IGNORE_DIRS.has(item.name)) continue

        // Recursively scan subdirectories
        const subConfigs = await collectConfigFiles(repoPath, fullPath, depth + 1)
        Object.assign(configFiles, subConfigs)
        continue
      }

      // Check if file matches any config pattern
      if (isConfigFile(item.name, relativePath)) {
        try {
          const stats = await fs.stat(fullPath)

          // Skip files that are too large
          if (stats.size > MAX_FILE_SIZE) {
            console.log(`Skipping large config file: ${relativePath} (${stats.size} bytes)`)
            continue
          }

          const content = await fs.readFile(fullPath, "utf-8")
          configFiles[relativePath] = content
        } catch (error) {
          console.error(`Failed to read config file ${relativePath}:`, error)
          // Continue with other files
        }
      }
    }
  } catch (error) {
    console.error(`Failed to scan directory ${currentPath}:`, error)
  }

  return configFiles
}

/**
 * Determines if a file is a configuration file based on its name and path.
 *
 * Checks against all patterns defined in CONFIG_FILE_PATTERNS.
 *
 * @param {string} fileName - Name of the file
 * @param {string} relativePath - Path relative to repository root
 * @returns {boolean} True if the file is a configuration file
 *
 * @private
 */
function isConfigFile(fileName: string, relativePath: string): boolean {
  // Check all pattern categories
  const allPatterns = [
    ...CONFIG_FILE_PATTERNS.packageManagers,
    ...CONFIG_FILE_PATTERNS.buildTools,
    ...CONFIG_FILE_PATTERNS.codeQuality,
    ...CONFIG_FILE_PATTERNS.testing,
    ...CONFIG_FILE_PATTERNS.deployment,
    ...CONFIG_FILE_PATTERNS.environment,
    ...CONFIG_FILE_PATTERNS.projectFiles,
  ]

  for (const pattern of allPatterns) {
    // Handle exact matches
    if (fileName === pattern) return true

    // Handle wildcard patterns (e.g., *.csproj)
    if (pattern.includes("*")) {
      const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*")
      const regex = new RegExp(`^${regexPattern}$`)
      if (regex.test(fileName)) return true
    }

    // Handle path patterns (e.g., .github/workflows/*.yml)
    if (pattern.includes("/")) {
      const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*")
      const regex = new RegExp(regexPattern)
      if (regex.test(relativePath)) return true
    }
  }

  return false
}

/**
 * Organizes collected config files by category for better LLM understanding.
 *
 * Groups files into:
 * - packageManagers: Dependencies and package management
 * - buildTools: Compilation and bundling configurations
 * - codeQuality: Linting, formatting, type checking
 * - testing: Test framework configurations
 * - deployment: Docker, CI/CD, hosting configs
 * - environment: Runtime and environment settings
 * - other: Unclassified configuration files
 *
 * @param {Record<string, string>} configFiles - Map of file paths to contents
 * @returns {Record<string, Record<string, string>>} Categorized config files
 *
 * @private
 */
function categorizeConfigFiles(
  configFiles: Record<string, string>
): Record<string, Record<string, string>> {
  const categorized: Record<string, Record<string, string>> = {
    packageManagers: {},
    buildTools: {},
    codeQuality: {},
    testing: {},
    deployment: {},
    environment: {},
    other: {},
  }

  for (const [filePath, content] of Object.entries(configFiles)) {
    const fileName = path.basename(filePath)
    let categorized_flag = false

    // Check each category
    for (const [category, patterns] of Object.entries(CONFIG_FILE_PATTERNS)) {
      for (const pattern of patterns) {
        if (
          fileName === pattern ||
          (pattern.includes("*") &&
            new RegExp(`^${pattern.replace(/\./g, "\\.").replace(/\*/g, ".*")}$`).test(fileName)) ||
          (pattern.includes("/") &&
            new RegExp(pattern.replace(/\./g, "\\.").replace(/\*/g, ".*")).test(filePath))
        ) {
          categorized[category][filePath] = content
          categorized_flag = true
          break
        }
      }
      if (categorized_flag) break
    }

    // If no category matched, put in 'other'
    if (!categorized_flag) {
      categorized.other[filePath] = content
    }
  }

  // Remove empty categories
  Object.keys(categorized).forEach((key) => {
    if (Object.keys(categorized[key]).length === 0) {
      delete categorized[key]
    }
  })

  return categorized
}

/**
 * Generates a human-readable summary of repository analysis results.
 *
 * Creates a formatted text summary including:
 * - Repository URL
 * - Total file and line counts
 * - Top 5 programming languages by file count
 * - README presence
 * - Count of configuration files found
 *
 * Useful for logging, debugging, or quick inspection of analysis results.
 *
 * @param {RepositoryContext} context - The repository analysis context
 * @returns {string} Formatted summary string
 *
 * @example
 * ```typescript
 * const context = await analyzeRepository(repoPath, repoUrl)
 * const summary = generateSummary(context)
 * console.log(summary)
 * // Output:
 * // Repository: https://github.com/vercel/next.js
 * // Total Files: 1523
 * // Total Lines: 125430
 * // Top Languages: TypeScript (892), JavaScript (245), ...
 * // Has README: Yes
 * // Config Files: 15 found (package managers, build tools, etc.)
 * ```
 */
/**
 * Analyzes Git commit history to identify major milestones and changes.
 *
 * Uses Gemini AI to analyze commit messages and dates to extract significant
 * events in the project's development history. Identifies 15-30 events
 * including all important changes such as features, refactors, releases, etc.
 *
 * @param {string} repoPath - Local path to the cloned repository
 * @param {string} repoUrl - Repository URL for context
 * @returns {Promise<TimelineEvent[]>} Array of timeline events sorted by date
 *
 * @example
 * ```typescript
 * const timeline = await analyzeTimeline(repoPath, repoUrl)
 * console.log(`Found ${timeline.length} major events`)
 * ```
 */
export async function analyzeTimeline(repoPath: string, repoUrl: string): Promise<TimelineEvent[]> {
  try {
    console.log(`[Timeline] Analyzing commit history for ${repoUrl}`)

    // Get git commit history (last 500 commits)
    const commits = await getGitLog(repoPath, 500)

    if (commits.length === 0) {
      console.log("[Timeline] No commits found, skipping timeline analysis")
      return []
    }

    console.log(`[Timeline] Analyzing ${commits.length} commits with Gemini`)

    // Analyze timeline with Gemini using structured output
    const result = await analyzeTimelineWithAI(
      commits.map((c) => ({
        date: c.date,
        message: c.message,
        hash: c.hash,
      })),
      repoUrl
    )

    let timeline = result.timeline || []

    console.log(`[Timeline] Successfully extracted ${timeline.length} events`)

    // Ensure we have at least 3 timeline events
    if (timeline.length < 3) {
      console.warn(`[Timeline] Only ${timeline.length} events found, expected at least 3`)
      // If we have commits but few events, try to create basic events from commits
      if (commits.length >= 3 && timeline.length < 3) {
        console.log("[Timeline] Creating fallback timeline from commits")
        const fallbackEvents: TimelineEvent[] = []

        // Add initial commit
        if (commits.length > 0) {
          const firstCommit = commits[commits.length - 1]
          fallbackEvents.push({
            date: firstCommit.date.split("T")[0],
            title: "Initial Commit",
            description: firstCommit.message,
            type: "milestone",
            commits: [firstCommit.hash.slice(0, 7)],
          })
        }

        // Add middle commit
        if (commits.length > 1) {
          const middleCommit = commits[Math.floor(commits.length / 2)]
          fallbackEvents.push({
            date: middleCommit.date.split("T")[0],
            title: "Project Development",
            description: middleCommit.message,
            type: "feature",
            commits: [middleCommit.hash.slice(0, 7)],
          })
        }

        // Add latest commit
        if (commits.length > 2) {
          const latestCommit = commits[0]
          fallbackEvents.push({
            date: latestCommit.date.split("T")[0],
            title: "Latest Update",
            description: latestCommit.message,
            type: "feature",
            commits: [latestCommit.hash.slice(0, 7)],
          })
        }

        // Merge fallback with existing timeline
        timeline = [...fallbackEvents, ...timeline]
        console.log(
          `[Timeline] Added ${fallbackEvents.length} fallback events, total: ${timeline.length}`
        )
      }
    }

    return timeline
  } catch (error) {
    console.error("[Timeline] Error analyzing timeline:", error)
    return [] // Return empty array on error, don't fail the entire scan
  }
}

export function generateSummary(context: RepositoryContext): string {
  const topLanguages = Object.entries(context.languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([lang, count]) => `${lang} (${count})`)
    .join(", ")

  const configFileCount = Object.values(context.configFiles).reduce(
    (total, category) => total + Object.keys(category || {}).length,
    0
  )

  return `
Repository: ${context.repoUrl}
Total Files: ${context.totalFiles}
Total Lines: ${context.totalLines}
Top Languages: ${topLanguages}
Has README: ${context.readmeContent ? "Yes" : "No"}
Config Files: ${configFileCount} found across all categories
  `.trim()
}
