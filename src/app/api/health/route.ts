/**
 * Health Check API Endpoint
 *
 * Provides application health status for monitoring and CI/CD deployment verification
 *
 * @route GET /api/health
 */

import { NextResponse } from "next/server"
import os from "os"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * GET /api/health
 *
 * Returns application health status and basic information
 *
 * @returns {Object} Health status information
 * @property {string} status - Health status ('ok' | 'error')
 * @property {number} timestamp - Current timestamp
 * @property {string} version - Application version
 * @property {Object} uptime - Uptime information
 */
export async function GET() {
  try {
    const healthInfo = {
      status: "ok",
      timestamp: Date.now(),
      version: process.env.npm_package_version || "1.0.0",
      uptime: {
        process: process.uptime(),
        system: os.uptime(),
      },
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
    }

    return NextResponse.json(healthInfo, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
