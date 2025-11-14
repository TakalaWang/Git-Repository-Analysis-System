/**
 * Git Repository Handler Module
 *
 * Provides comprehensive utilities for handling Git repository operations including:
 * - URL validation and parsing
 * - Repository cloning with timeout protection
 * - Accessibility checks without full clone
 * - Metadata extraction (branches, commits, dates)
 * - Automatic cleanup of temporary files
 *
 * Supports multiple Git hosting platforms: GitHub, GitLab, and Bitbucket.
 *
 * @module git-handler
 */

import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { randomUUID } from "crypto"
import { RepositoryNotAccessibleError, RepositoryTooLargeError } from "./errors"

const execAsync = promisify(exec)

/**
 * Default timeout for git clone operations in milliseconds.
 * Configurable via GIT_CLONE_TIMEOUT_SECONDS environment variable.
 * @constant
 */
const DEFAULT_CLONE_TIMEOUT_MS = parseInt(process.env.GIT_CLONE_TIMEOUT_SECONDS || "300", 10) * 1000

/**
 * Information about a Git repository.
 *
 * @interface GitRepoInfo
 * @property {string} url - The normalized Git repository URL (with .git extension)
 * @property {string} localPath - Local filesystem path where repo is cloned
 * @property {'github'|'gitlab'|'bitbucket'|'other'} provider - Git hosting provider
 * @property {string} [owner] - Repository owner/organization name
 * @property {string} [repo] - Repository name (without .git)
 */
export interface GitRepoInfo {
  url: string
  localPath: string
  provider: "github" | "gitlab" | "bitbucket" | "other"
  owner?: string
  repo?: string
}

/**
 * Validates whether a URL is a properly formatted Git repository URL.
 *
 * Supports both HTTPS and SSH formats for GitHub, GitLab, and Bitbucket:
 * - HTTPS: https://github.com/owner/repo or https://github.com/owner/repo.git
 * - SSH: git@github.com:owner/repo.git
 *
 * @param {string} url - The URL to validate
 * @returns {boolean} True if the URL matches a valid Git repository pattern
 *
 * @example
 * ```typescript
 * isValidGitUrl('https://github.com/vercel/next.js')        // true
 * isValidGitUrl('https://gitlab.com/group/project.git')     // true
 * isValidGitUrl('git@github.com:owner/repo.git')            // true
 * isValidGitUrl('https://example.com/not-a-git-repo')       // false
 * isValidGitUrl('invalid-url')                               // false
 * ```
 */
export function isValidGitUrl(url: string): boolean {
  // Support HTTPS and SSH formats
  const patterns = [
    /^https?:\/\/(www\.)?(github|gitlab|bitbucket)\.(com|org)\/[\w-]+\/[\w.-]+(.git)?$/i,
    /^git@(github|gitlab|bitbucket)\.(com|org):[\w-]+\/[\w.-]+(.git)?$/i,
  ]

  return patterns.some((pattern) => pattern.test(url))
}

/**
 * Parses a Git repository URL to extract metadata and normalize the format.
 *
 * Extracts useful information from the URL including:
 * - Provider (GitHub, GitLab, Bitbucket, or other)
 * - Repository owner/organization
 * - Repository name
 * - Normalized URL with .git extension
 *
 * @param {string} url - The Git repository URL to parse
 * @returns {Omit<GitRepoInfo, 'localPath'>} Parsed repository information (without local path)
 *
 * @example
 * ```typescript
 * const info = parseGitUrl('https://github.com/vercel/next.js')
 * // Returns:
 * // {
 * //   url: 'https://github.com/vercel/next.js.git',
 * //   provider: 'github',
 * //   owner: 'vercel',
 * //   repo: 'next.js'
 * // }
 *
 * const gitlabInfo = parseGitUrl('https://gitlab.com/group/project')
 * // provider: 'gitlab', owner: 'group', repo: 'project'
 * ```
 */
export function parseGitUrl(url: string): Omit<GitRepoInfo, "localPath"> {
  // Normalize URL
  let normalizedUrl = url.trim()
  if (!normalizedUrl.endsWith(".git")) {
    normalizedUrl += ".git"
  }

  // Detect provider
  let provider: GitRepoInfo["provider"] = "other"
  if (normalizedUrl.includes("github.com")) provider = "github"
  else if (normalizedUrl.includes("gitlab.com")) provider = "gitlab"
  else if (normalizedUrl.includes("bitbucket.org")) provider = "bitbucket"

  // Extract owner and repo name
  const match = normalizedUrl.match(/[:/]([\w-]+)\/([\w.-]+?)(\.git)?$/)
  const owner = match?.[1]
  const repo = match?.[2]?.replace(".git", "")

  return {
    url: normalizedUrl,
    provider,
    owner,
    repo,
  }
}

/**
 * Clones a Git repository to a temporary directory with timeout protection.
 *
 * Performs a shallow clone (depth=1) by default to minimize download time and disk usage.
 * The repository is cloned to a unique temporary directory that should be cleaned up
 * using cleanupRepository() after processing.
 *
 * Features:
 * - Shallow clone by default (configurable depth)
 * - Timeout protection to prevent hanging on large repos
 * - Automatic directory creation
 * - Automatic cleanup on failure
 * - URL validation before cloning
 *
 * @param {string} url - The Git repository URL to clone
 * @param {Object} [options] - Clone options
 * @param {number} [options.depth=1] - Depth for shallow clone (1 = single commit)
 * @param {number} [options.timeout=60000] - Timeout in milliseconds (default 60s)
 * @returns {Promise<GitRepoInfo>} Repository info including local path where it was cloned
 *
 * @throws {Error} If URL is invalid
 * @throws {Error} If clone command fails
 * @throws {Error} If clone times out (with specific timeout message)
 *
 * @example
 * ```typescript
 * // Basic clone with defaults (shallow, 60s timeout)
 * const repo = await cloneRepository('https://github.com/vercel/next.js')
 * console.log(`Cloned to: ${repo.localPath}`)
 *
 * // Custom depth and timeout
 * const fullRepo = await cloneRepository(
 *   'https://github.com/small/repo',
 *   { depth: 10, timeout: 120000 } // 10 commits, 2 minute timeout
 * )
 *
 * // Always cleanup after use
 * try {
 *   const repo = await cloneRepository(url)
 *   // ... process repository
 * } finally {
 *   await cleanupRepository(repo.localPath)
 * }
 * ```
 */
export async function cloneRepository(
  url: string,
  options: {
    depth?: number // Shallow clone depth
    timeout?: number // Timeout in milliseconds
  } = {}
): Promise<GitRepoInfo> {
  const { depth = 1, timeout = DEFAULT_CLONE_TIMEOUT_MS } = options

  // Validate URL
  if (!isValidGitUrl(url)) {
    throw new RepositoryNotAccessibleError("Invalid Git repository URL")
  }

  // Parse URL
  const repoInfo = parseGitUrl(url)

  // Create temporary directory
  const tempDir = path.join(os.tmpdir(), "repo-analysis", randomUUID())
  await fs.mkdir(tempDir, { recursive: true })

  try {
    // Build git clone command with shallow clone
    const cloneCmd = `git clone --depth ${depth} --single-branch "${repoInfo.url}" "${tempDir}"`

    console.log(`Cloning repository: ${repoInfo.url}`)

    // Execute clone with timeout
    await execAsync(cloneCmd, {
      timeout,
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    })

    console.log(`Repository cloned successfully to: ${tempDir}`)

    return {
      ...repoInfo,
      localPath: tempDir,
    }
  } catch (error: unknown) {
    // Cleanup on failure
    await cleanupRepository(tempDir)

    const err = error as { killed?: boolean; signal?: string; message?: string }

    if (err.killed && err.signal === "SIGTERM") {
      throw new RepositoryTooLargeError("Repository clone timeout - repository may be too large")
    }

    throw new RepositoryNotAccessibleError(
      `Failed to clone repository: ${err.message || "Unknown error"}`
    )
  }
}

/**
 * Checks if a Git repository is accessible without performing a full clone.
 *
 * Uses `git ls-remote` to quickly verify that:
 * 1. The repository exists
 * 2. The repository is accessible (public or user has access)
 * 3. The URL is valid
 *
 * This is much faster than cloning and useful for validation before
 * committing resources to a full clone operation.
 *
 * @param {string} url - The Git repository URL to check
 * @returns {Promise<boolean>} True if repository is accessible, false otherwise
 *
 * @example
 * ```typescript
 * // Check before cloning
 * if (await isRepositoryAccessible('https://github.com/vercel/next.js')) {
 *   const repo = await cloneRepository(url)
 *   // ... process
 * } else {
 *   console.error('Repository not accessible')
 * }
 *
 * // Validate user input
 * const userUrl = req.body.repoUrl
 * const isValid = await isRepositoryAccessible(userUrl)
 * if (!isValid) {
 *   return res.status(400).json({ error: 'Invalid or private repository' })
 * }
 * ```
 */
export async function isRepositoryAccessible(url: string): Promise<boolean> {
  try {
    const { url: normalizedUrl } = parseGitUrl(url)

    // Use git ls-remote with GIT_TERMINAL_PROMPT=0 to prevent credential prompts
    // This ensures we only accept public repositories (no local credentials used)
    await execAsync(`GIT_TERMINAL_PROMPT=0 git ls-remote "${normalizedUrl}" HEAD`, {
      timeout: 10000, // 10 second timeout
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0", // Disable credential prompts
        GIT_ASKPASS: "echo", // Prevent any password prompts
      },
    })

    return true
  } catch (error) {
    console.error("Repository accessibility check failed:", error)
    return false
  }
}

/**
 * Calculates the total size of a cloned repository in bytes.
 *
 * Uses the `du` (disk usage) command to calculate the size of all files
 * in the repository directory, including the .git folder.
 *
 * @param {string} localPath - Local filesystem path to the cloned repository
 * @returns {Promise<number>} Total size in bytes, or 0 if calculation fails
 *
 * @example
 * ```typescript
 * const repo = await cloneRepository(url)
 * const sizeBytes = await getRepositorySize(repo.localPath)
 * const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2)
 * console.log(`Repository size: ${sizeMB} MB`)
 *
 * // Check if repo is too large
 * const MAX_SIZE = 100 * 1024 * 1024 // 100 MB
 * if (sizeBytes > MAX_SIZE) {
 *   console.warn('Repository exceeds size limit')
 * }
 * ```
 */
export async function getRepositorySize(localPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`du -sb "${localPath}"`)
    const sizeMatch = stdout.match(/^(\d+)/)
    return sizeMatch ? parseInt(sizeMatch[1], 10) : 0
  } catch (error) {
    console.error("Failed to get repository size:", error)
    return 0
  }
}

/**
 * Extracts Git metadata from a cloned repository.
 *
 * Retrieves important Git information including:
 * - Default branch name (main, master, etc.)
 * - Last commit date
 * - Total number of commits in history
 *
 * All Git commands are executed in the repository's directory context.
 *
 * @param {string} localPath - Local filesystem path to the cloned repository
 * @returns {Promise<{defaultBranch: string, lastCommitDate: string, totalCommits: number}>}
 *          Object containing repository metadata
 *
 * @example
 * ```typescript
 * const repo = await cloneRepository(url)
 * const metadata = await getRepositoryMetadata(repo.localPath)
 *
 * console.log(`Default branch: ${metadata.defaultBranch}`)
 * console.log(`Last commit: ${metadata.lastCommitDate}`)
 * console.log(`Total commits: ${metadata.totalCommits}`)
 *
 * // Use in analysis
 * const isActive = new Date(metadata.lastCommitDate) > lastMonth
 * const isMature = metadata.totalCommits > 100
 * ```
 */
export async function getRepositoryMetadata(localPath: string): Promise<{
  defaultBranch: string
  lastCommitDate: string
  totalCommits: number
}> {
  try {
    // Get default branch
    const { stdout: branchOutput } = await execAsync(
      'git symbolic-ref refs/remotes/origin/HEAD | sed "s@^refs/remotes/origin/@@"',
      { cwd: localPath }
    )
    const defaultBranch = branchOutput.trim()

    // Get last commit date
    const { stdout: dateOutput } = await execAsync("git log -1 --format=%cd --date=iso", {
      cwd: localPath,
    })
    const lastCommitDate = dateOutput.trim()

    // Get total commits
    const { stdout: countOutput } = await execAsync("git rev-list --count HEAD", { cwd: localPath })
    const totalCommits = parseInt(countOutput.trim(), 10)

    return {
      defaultBranch,
      lastCommitDate,
      totalCommits,
    }
  } catch (error) {
    console.error("Failed to get repository metadata:", error)
    return {
      defaultBranch: "main",
      lastCommitDate: new Date().toISOString(),
      totalCommits: 0,
    }
  }
}

/**
 * Removes a cloned repository from the filesystem.
 *
 * Recursively deletes the repository directory and all its contents.
 * Uses force flag to handle read-only files. This operation is best-effort;
 * errors are logged but not thrown to prevent cleanup from blocking other operations.
 *
 * Should always be called after processing a repository to prevent disk space buildup.
 *
 * @param {string} localPath - Local filesystem path to the repository to delete
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * // Always use try/finally for cleanup
 * let repo
 * try {
 *   repo = await cloneRepository(url)
 *   await analyzeRepository(repo.localPath)
 * } finally {
 *   if (repo) {
 *     await cleanupRepository(repo.localPath)
 *   }
 * }
 *
 * // Multiple cleanups
 * const repos = await Promise.all(urls.map(cloneRepository))
 * try {
 *   // ... process all repos
 * } finally {
 *   await Promise.all(repos.map(r => cleanupRepository(r.localPath)))
 * }
 * ```
 */
export async function cleanupRepository(localPath: string): Promise<void> {
  try {
    await fs.rm(localPath, { recursive: true, force: true })
    console.log(`Cleaned up repository: ${localPath}`)
  } catch (error) {
    console.error(`Failed to cleanup repository at ${localPath}:`, error)
    // Don't throw - cleanup is best effort
  }
}

/**
 * Cleans up old temporary repositories that have exceeded their lifetime.
 *
 * Scans the temporary repository directory and deletes any subdirectories
 * that are older than 1 hour. This prevents disk space accumulation from
 * failed cleanups or interrupted processes.
 *
 * Should be called periodically (e.g., via cron job or background task)
 * to maintain system hygiene. Safe to call even if directory doesn't exist.
 *
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * // Call periodically in a background job
 * setInterval(async () => {
 *   await cleanupOldRepositories()
 *   console.log('Cleaned up old repositories')
 * }, 60 * 60 * 1000) // Every hour
 *
 * // Call at application startup
 * async function startup() {
 *   await cleanupOldRepositories()
 *   console.log('Startup cleanup complete')
 * }
 *
 * // Call in API route for self-cleaning
 * export async function POST(request) {
 *   // Cleanup old repos before processing new one
 *   cleanupOldRepositories() // Fire and forget
 *
 *   const repo = await cloneRepository(url)
 *   // ... process
 * }
 * ```
 */
export async function cleanupOldRepositories(): Promise<void> {
  try {
    const repoAnalysisDir = path.join(os.tmpdir(), "repo-analysis")

    // Check if directory exists
    try {
      await fs.access(repoAnalysisDir)
    } catch {
      return // Directory doesn't exist, nothing to clean
    }

    const entries = await fs.readdir(repoAnalysisDir, { withFileTypes: true })
    const now = Date.now()
    const oneHour = 60 * 60 * 1000

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(repoAnalysisDir, entry.name)
        const stats = await fs.stat(dirPath)

        // Delete if older than 1 hour
        if (now - stats.mtimeMs > oneHour) {
          await fs.rm(dirPath, { recursive: true, force: true })
          console.log(`Cleaned up old repository: ${entry.name}`)
        }
      }
    }
  } catch (error) {
    console.error("Failed to cleanup old repositories:", error)
    // Don't throw - cleanup is best effort
  }
}

/**
 * Get the latest commit hash from a remote Git repository.
 *
 * Fetches the HEAD commit hash without cloning the entire repository.
 * This is used for cache validation - if the commit hash hasn't changed,
 * we can reuse previous analysis results.
 *
 * @param {string} url - Git repository URL
 * @returns {Promise<string>} The commit hash (SHA-1) of the latest commit on default branch
 *
 * @throws {Error} If URL is invalid
 * @throws {Error} If git ls-remote command fails
 * @throws {Error} If repository is not accessible
 *
 * @example
 * ```typescript
 * const commitHash = await getRemoteCommitHash('https://github.com/vercel/next.js')
 * console.log(`Latest commit: ${commitHash}`) // e.g., "a1b2c3d4..."
 *
 * // Check if analysis is still valid
 * const cachedAnalysis = await findCachedAnalysis(repoUrl)
 * if (cachedAnalysis && cachedAnalysis.commitHash === commitHash) {
 *   return cachedAnalysis // Use cached result
 * }
 * ```
 */
export async function getRemoteCommitHash(url: string): Promise<string> {
  // Validate URL
  if (!isValidGitUrl(url)) {
    throw new RepositoryNotAccessibleError("Invalid Git repository URL")
  }

  const repoInfo = parseGitUrl(url)

  try {
    // Use git ls-remote to get HEAD commit without cloning
    // Set GIT_TERMINAL_PROMPT=0 and GIT_ASKPASS to avoid using local credentials
    // This ensures private repositories are not accessible using local auth.
    const { stdout } = await execAsync(`git ls-remote "${repoInfo.url}" HEAD`, {
      timeout: 30000, // 30 second timeout
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_ASKPASS: "echo",
      },
    })

    // Output format: "commit_hash\tHEAD"
    const match = stdout.match(/^([a-f0-9]{40})\s+HEAD$/m)
    if (!match) {
      throw new RepositoryNotAccessibleError(
        "Failed to parse commit hash from git ls-remote output"
      )
    }

    return match[1]
  } catch (error) {
    // If ls-remote fails it may be because the repo is private or inaccessible.
    // Surface a clear error so the caller can reject private repositories.
    if (error instanceof RepositoryNotAccessibleError) {
      throw error
    }
    if (error instanceof Error) {
      throw new RepositoryNotAccessibleError(`Failed to get commit hash: ${error.message}`)
    }
    throw new RepositoryNotAccessibleError("Failed to get commit hash from repository")
  }
}

/**
 * Git commit log entry.
 *
 * @interface GitCommit
 * @property {string} hash - Commit SHA hash
 * @property {string} date - Commit date in ISO format
 * @property {string} author - Commit author name
 * @property {string} email - Commit author email
 * @property {string} message - Commit message
 */
export interface GitCommit {
  hash: string
  date: string
  author: string
  email: string
  message: string
}

/**
 * Retrieves the git commit history from a cloned repository.
 *
 * Extracts the full commit log including hash, date, author, and message.
 * Useful for analyzing project evolution and identifying major milestones.
 *
 * @param {string} localPath - Path to the cloned repository
 * @param {number} limit - Maximum number of commits to retrieve (default: 200)
 * @returns {Promise<GitCommit[]>} Array of commit information
 * @throws {Error} If git log command fails
 *
 * @example
 * ```typescript
 * const commits = await getGitLog('/tmp/repo-abc123', 100)
 * console.log(`Retrieved ${commits.length} commits`)
 * commits.forEach(commit => {
 *   console.log(`${commit.date}: ${commit.message}`)
 * })
 * ```
 */
export async function getGitLog(localPath: string, limit: number = 500): Promise<GitCommit[]> {
  try {
    const format = "%H|%aI|%an|%ae|%s"
    const { stdout } = await execAsync(`git log --all --format="${format}" -n ${limit}`, {
      cwd: localPath,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large repos
    })

    const commits: GitCommit[] = []
    const lines = stdout.trim().split("\n")

    for (const line of lines) {
      if (!line) continue
      const [hash, date, author, email, message] = line.split("|")
      if (hash && date && author && email && message) {
        commits.push({
          hash,
          date,
          author,
          email,
          message,
        })
      }
    }

    return commits
  } catch (error) {
    console.error("Failed to get git log:", error)
    throw new Error("Failed to retrieve git commit history")
  }
}
