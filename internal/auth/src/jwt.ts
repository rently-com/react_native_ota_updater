/**
 * JWT token validation module
 * @module JWTValidation
 */

import { getToken } from "next-auth/jwt";
import env from "./env";

/**
 * Validates a JWT token from an incoming request
 * Attempts to extract and verify the JWT token from cookies or authorization header
 *
 * @param {Request} req - The incoming HTTP request
 * @param {boolean} isSecure - Whether to require secure cookie name access
 * @returns {Promise<JWT | null>} The decoded token if valid, null otherwise
 *
 * @example
 * ```typescript
 * // In an API route or middleware
 * const token = await isJwtTokenValid(request, process.env.NODE_ENV === 'production');
 * if (!token) {
 *   return new Response('Unauthorized', { status: 401 });
 * }
 * // Token is valid, continue processing
 * ```
 */
export const isJwtTokenValid = async (req: Request, isSecure: boolean) =>
	getToken({ req, secureCookie: isSecure, secret: env.AUTH_SECRET });
