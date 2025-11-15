import nextJest from "next/jest.js"

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
})

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const config = {
  coverageProvider: "v8",
  // Use jsdom for React components, node environment will be set per-file for API tests
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.(test|spec).(ts|tsx)", "**/*.(test|spec).(ts|tsx)"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Allow tests to specify their own environment via docblock
  testEnvironmentOptions: {
    customExportConditions: [""],
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{ts,tsx}",
    "!src/**/__tests__/**",
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 28,
      statements: 28,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
