// Jest setup file
import "@testing-library/jest-dom"

// Mock environment variables
process.env.GEMINI_API_KEY = "test-api-key"
process.env.FIREBASE_PROJECT_ID = "test-project"
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./service-account-file.json"

// Global test utilities
global.console = {
  ...console,
  error: jest.fn(), // Suppress error logs in tests
  warn: jest.fn(), // Suppress warning logs in tests
}

// Mock Firebase Admin
jest.mock("./src/lib/server/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
      add: jest.fn(),
    })),
  },
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}))
