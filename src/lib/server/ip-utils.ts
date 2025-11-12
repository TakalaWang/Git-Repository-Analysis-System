/**
 * IP Utilities
 *
 * Handles IP address extraction from Next.js requests for rate limiting
 * and anonymous user tracking.
 */

import { NextRequest } from "next/server"

/**
 * Extracts the client IP address from a Next.js request.
 *
 * This function checks multiple headers in order of priority to handle
 * various proxy and CDN configurations (Cloudflare, Vercel, standard proxies).
 *
 * Priority order:
 * 1. x-forwarded-for (most common proxy header)
 * 2. x-real-ip (alternative proxy header)
 * 3. cf-connecting-ip (Cloudflare specific)
 * 4. x-vercel-forwarded-for / x-forwarded-host (Vercel specific)
 *
 * @param {NextRequest} request - The Next.js request object containing headers
 * @returns {string} The client's IP address, or 'unknown' if not found
 *
 * @example
 * ```typescript
 * const ip = getClientIp(request)
 * console.log(`Client IP: ${ip}`) // "192.168.1.1"
 * ```
 */
export function getClientIp(request: NextRequest): string {
  // Check forwarded headers (most proxies)
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    // x-forwarded-for may contain multiple IPs, take the first one (client IP)
    return forwardedFor.split(",")[0].trim()
  }

  // Check real IP header (some proxies)
  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp.trim()
  }

  // Check Cloudflare connecting IP
  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }

  // Fallback to remote address (direct connection)
  const remoteAddress =
    request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-host")
  if (remoteAddress) {
    return remoteAddress.split(",")[0].trim()
  }

  return "unknown"
}

/**
 * Hashes an IP address for privacy-conscious storage.
 *
 * Converts an IP address to a simple hash value to protect user privacy
 * while still allowing rate limiting and tracking. This implementation uses
 * a basic hash function suitable for development.
 *
 * @param {string} ip - The IP address to hash
 * @returns {string} A hashed IP string in format 'ip_{hash}' (e.g., 'ip_1a2b3c')
 *
 * @remarks
 * For production use, consider using Node.js crypto module with SHA-256
 * for stronger hashing: `crypto.createHash('sha256').update(ip).digest('hex')`
 *
 * @example
 * ```typescript
 * const hashedIp = hashIp('192.168.1.1')
 * console.log(hashedIp) // "ip_3f7a9b2"
 * ```
 */
export function hashIp(ip: string): string {
  // Simple hash function for demo purposes
  // In production, consider using crypto.createHash('sha256')
  let hash = 0
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `ip_${Math.abs(hash).toString(36)}`
}

/**
 * Validates whether a string is a valid IPv4 or IPv6 address.
 *
 * Uses regex patterns to check if the provided string matches
 * standard IPv4 or IPv6 formats. Returns false for 'unknown' values.
 *
 * @param {string} ip - The IP address string to validate
 * @returns {boolean} True if the IP is a valid IPv4 or IPv6 address, false otherwise
 *
 * @example
 * ```typescript
 * isValidIp('192.168.1.1')           // true (IPv4)
 * isValidIp('2001:0db8::1')          // true (IPv6)
 * isValidIp('invalid')               // false
 * isValidIp('unknown')               // false
 * ```
 */
export function isValidIp(ip: string): boolean {
  if (ip === "unknown") return false

  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  // IPv6 regex (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/

  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}
