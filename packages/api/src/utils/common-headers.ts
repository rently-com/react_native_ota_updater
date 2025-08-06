/**
 * Common Headers Utility Module
 * Provides functions for handling common HTTP headers
 * @module CommonHeaders
 */

import type { HonoRequest } from "hono";

/**
 * Extracts the client's IP address from various HTTP headers
 * Handles different proxy and forwarding scenarios
 *
 * Header Priority (in order):
 * 1. Host
 * 2. x-client-ip
 * 3. x-forwarded-for
 * 4. x-real-ip
 * 5. x-cluster-client-ip
 * 6. x-forwarded
 * 7. forwarded-for
 * 8. forwarded
 *
 * @param {HonoRequest} req - The Hono request object
 * @returns {string} The client's IP address or "Unknown" if not found
 *
 * @example
 * ```typescript
 * import { getIpAddress } from './utils/common-headers';
 *
 * app.get('/ip', (c) => {
 *   const ip = getIpAddress(c.req);
 *   return c.text(`Your IP: ${ip}`);
 * });
 *
 * // With proxy:
 * // x-forwarded-for: "203.0.113.1, 192.168.1.1"
 * // Returns: "203.0.113.1"
 *
 * // No headers:
 * // Returns: "Unknown"
 * ```
 */
export function getIpAddress(req: HonoRequest): string {
	// Try various headers that might contain the IP address
	const ipAddress =
		req.header("Host") ??
		req.header("x-client-ip") ??
		req.header("x-forwarded-for") ??
		req.header("x-real-ip") ??
		req.header("x-cluster-client-ip") ??
		req.header("x-forwarded") ??
		req.header("forwarded-for") ??
		req.header("forwarded");

	// Some headers contain comma-separated lists; take the first (original) IP
	const splittedIpAddress = ipAddress?.split(",")[0];

	// Return the IP or "Unknown" if none found
	const finalIpAddress = splittedIpAddress ? splittedIpAddress : "Unknown";

	return finalIpAddress;
}
