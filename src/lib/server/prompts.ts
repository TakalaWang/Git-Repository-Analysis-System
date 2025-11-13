/**
 * Gemini AI Prompts Module
 *
 * Contains carefully crafted prompt templates for repository analysis using
 * Google's Gemini AI. These prompts are designed to extract structured,
 * actionable insights about code repositories.
 *
 * The prompts guide Gemini to analyze:
 * - Project purpose and description
 * - Technology stack and frameworks
 * - Required skill level (Beginner to Senior)
 * - Code quality metrics
 * - Improvement suggestions
 *
 * All prompts are designed to return structured JSON for easy parsing.
 *
 * @module prompts
 */

/**
 * Context object containing all repository information for AI analysis.
 *
 * @interface RepositoryContext
 * @property {string} repoUrl - Original Git repository URL
 * @property {string} [readmeContent] - Content of README file (truncated to 10k chars)
 * @property {Record<string, number>} languages - Map of language name to file count
 * @property {string[]} fileStructure - Array of relative file paths
 * @property {Object} configFiles - ALL configuration files organized by category
 * @property {Record<string, string>} [configFiles.packageManagers] - Package/dependency files (package.json, requirements.txt, go.mod, Gemfile, Cargo.toml, etc.)
 * @property {Record<string, string>} [configFiles.buildTools] - Build configurations (tsconfig.json, webpack.config.js, vite.config.ts, etc.)
 * @property {Record<string, string>} [configFiles.codeQuality] - Linting/formatting configs (.eslintrc, .prettierrc, etc.)
 * @property {Record<string, string>} [configFiles.testing] - Test framework configs (jest.config.js, pytest.ini, etc.)
 * @property {Record<string, string>} [configFiles.deployment] - Deployment files (Dockerfile, docker-compose.yml, CI/CD configs, etc.)
 * @property {Record<string, string>} [configFiles.environment] - Environment configs (.env.example, .nvmrc, runtime.txt, etc.)
 * @property {Record<string, string>} [configFiles.other] - Other configuration files
 * @property {number} totalFiles - Total number of files in repository
 * @property {number} totalLines - Total lines of code
 *
 * Note: The LLM will analyze ALL config files to determine the complete tech stack,
 * package managers used, build tools, testing frameworks, and deployment strategies.
 * This approach is flexible and doesn't require hardcoding specific package managers.
 */
export interface RepositoryContext {
  repoUrl: string
  readmeContent?: string
  languages: Record<string, number> // language -> file count
  fileStructure: string[]
  configFiles: {
    packageManagers?: Record<string, string>
    buildTools?: Record<string, string>
    codeQuality?: Record<string, string>
    testing?: Record<string, string>
    deployment?: Record<string, string>
    environment?: Record<string, string>
    other?: Record<string, string>
  }
  totalFiles: number
  totalLines: number
}

/**
 * Generates the system prompt that establishes Gemini's role and behavior.
 *
 * This prompt sets up Gemini as an expert code analyst, defining:
 * - The three main analysis tasks (description, tech stack, skill level)
 * - Quality guidelines for responses
 * - Response format is enforced by structured output schema
 *
 * The system prompt is sent once at the start of a chat session to establish
 * consistent behavior across all repository analyses.
 *
 * Note: With structured output enabled, we don't need to request JSON format
 * in the prompt - the schema ensures correct formatting automatically.
 *
 * @returns {string} System prompt text for Gemini
 *
 * @example
 * ```typescript
 * const chat = model.startChat({
 *   history: [
 *     {
 *       role: 'user',
 *       parts: [{ text: getSystemPrompt() }],
 *     },
 *     {
 *       role: 'model',
 *       parts: [{ text: 'I understand...' }],
 *     },
 *   ],
 * })
 * ```
 */
export function getSystemPrompt(): string {
  return `You are an expert code analyst and technical recruiter. Your task is to analyze Git repositories and provide comprehensive assessments that help HR professionals understand technical projects.

Your analysis should include:

1. **Project Description**: A clear, business-friendly summary of what the project does and its purpose.

2. **Tech Stack Analysis**:
   - List all technologies, frameworks, and tools used
   - Categorize them into: Frontend, Backend, Database, DevOps, Tools, and Other
   - Be specific (e.g., "React 18 with TypeScript" not just "React")

3. **Repository Information** (for HR understanding):
   - Estimated team size needed for this project
   - Estimated development duration
   - Overall complexity level
   - Main purpose and target audience
   - Project scale indicators (lines of code, file count)

4. **Detailed Assessment**:
   - Required skill level (Beginner/Junior/Mid-level/Senior) with detailed reasoning
   - Key strengths of the codebase (3-5 points)
   - Identified weaknesses or areas for improvement (3-5 points)
   - Specific recommendations for enhancement (3-5 points)
   - Code quality rating with explanation
   - Architecture quality assessment
   - Testing coverage evaluation

Guidelines:
- Be objective and factual
- Use clear, professional language that non-technical HR can understand
- Base assessments on actual code patterns, architecture, and best practices
- Consider: design patterns, code organization, testing, documentation, scalability
- Provide actionable insights and specific examples

Your response will be automatically formatted into a structured format.`
}

/**
 * Generates a comprehensive analysis prompt with repository context.
 *
 * Creates a detailed prompt that includes:
 * - Repository URL and README content
 * - File and line statistics
 * - Programming language distribution
 * - Sample file structure (first 50 files)
 * - ALL configuration files organized by category
 *
 * The prompt provides Gemini with ALL configuration files, allowing it to:
 * - Determine what package managers are used (npm, pip, cargo, etc.)
 * - Identify build tools and frameworks (webpack, vite, Next.js, etc.)
 * - Detect code quality tools (ESLint, Prettier, etc.)
 * - Find testing frameworks (Jest, Pytest, etc.)
 * - Understand deployment setup (Docker, CI/CD)
 * - Analyze the complete tech stack
 *
 * This flexible approach doesn't require hardcoding specific package managers,
 * making it future-proof and able to handle any project configuration.
 *
 * @param {RepositoryContext} context - Complete repository analysis context
 * @returns {string} Formatted analysis prompt for Gemini
 *
 * @example
 * ```typescript
 * const context = await analyzeRepository(repoPath, repoUrl)
 * const prompt = getAnalysisPrompt(context)
 * const result = await chat.sendMessage(prompt)
 * ```
 */
export function getAnalysisPrompt(context: RepositoryContext): string {
  const { repoUrl, readmeContent, languages, fileStructure, configFiles, totalFiles, totalLines } =
    context

  // Build language statistics string
  const languageStats = Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .map(([lang, count]) => `${lang}: ${count} files`)
    .join(", ")

  // Format all configuration files
  const configSummary = formatConfigFiles(configFiles)

  return `Please analyze the following Git repository and provide a comprehensive assessment:

**Repository URL**: ${repoUrl}

**README Content**:
${readmeContent || "No README found"}

**Code Statistics**:
- Total Files: ${totalFiles}
- Total Lines: ${totalLines}
- Primary Languages: ${languageStats}

**File Structure** (sample):
${fileStructure.slice(0, 50).join("\n")}
${fileStructure.length > 50 ? `\n... and ${fileStructure.length - 50} more files` : ""}

**Configuration Files**:
${configSummary}

Based on ALL the information above (especially the configuration files), please provide:
- A clear 2-3 sentence description of what this project does and its main purpose
- A comprehensive list of ALL technologies, frameworks, tools, and package managers used (analyze the config files to determine this)
- An assessment of skill level (Beginner, Junior, Mid-level, or Senior) with reasoning
- Analysis of project complexity (architecture, code quality, test coverage, documentation)
- Key features of the project
- Suggested improvements for the codebase`
}

/**
 * Formats all configuration files into a readable string for the LLM.
 *
 * Organizes config files by category and provides their full content.
 * This gives the LLM complete context to determine:
 * - Package managers used
 * - Build tools and frameworks
 * - Testing setup
 * - Deployment configuration
 * - Code quality tools
 *
 * Each file is displayed with its path and full content, allowing the LLM
 * to analyze the complete project setup.
 *
 * @param {RepositoryContext['configFiles']} configFiles - Categorized config files
 * @returns {string} Formatted configuration file summary
 *
 * @private
 */
function formatConfigFiles(configFiles: RepositoryContext["configFiles"]): string {
  if (!configFiles || Object.keys(configFiles).length === 0) {
    return "No configuration files found"
  }

  const sections: string[] = []

  const categoryLabels: Record<string, string> = {
    packageManagers: "Package Management & Dependencies",
    buildTools: "Build & Compilation Configuration",
    codeQuality: "Code Quality & Linting",
    testing: "Testing Configuration",
    deployment: "Deployment & CI/CD",
    environment: "Environment & Runtime",
    other: "Other Configuration Files",
  }

  for (const [category, files] of Object.entries(configFiles)) {
    if (!files || Object.keys(files).length === 0) continue

    const label = categoryLabels[category] || category
    sections.push(`\n### ${label}:`)

    for (const [filePath, content] of Object.entries(files)) {
      // Truncate very long files to prevent token overflow
      const truncatedContent =
        content.length > 5000 ? content.substring(0, 5000) + "\n... (truncated)" : content

      sections.push(`\n**${filePath}**:`)
      sections.push("```")
      sections.push(truncatedContent)
      sections.push("```")
    }
  }

  return sections.length > 0 ? sections.join("\n") : "No configuration files found"
}
