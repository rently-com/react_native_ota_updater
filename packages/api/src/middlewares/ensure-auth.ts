/**
 * Authentication Middleware Module
 * Provides request authentication and user context setup
 * @module AuthMiddleware
 */

import { createFactoryMiddleware } from "@/api/lib/create/router";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { isJwtTokenValid } from "@rentlydev/rnota-auth/jwt";

import { STRINGS } from "@/api/utils/strings";

/**
 * Middleware to ensure request authentication and set up user context
 * Supports both Bearer token and JWT cookie authentication methods
 *
 * Authentication Flow:
 * 1. Check for Bearer token in Authorization header
 *    - If valid, fetch user from storage and set context
 * 2. If no Bearer token, check for JWT in cookies
 *    - Verify JWT validity
 *    - If valid, set user context from token claims
 * 3. If both methods fail, return 401 Unauthorized
 *
 * Features:
 * - Dual authentication support (Bearer token & JWT)
 * - Secure cookie handling
 * - User context injection
 * - Type-safe middleware creation
 *
 * Context Additions:
 * - user: { id: string, email: string }
 * - accessKeyToken: string (only for Bearer auth)
 *
 * @throws {Response} 401 Unauthorized - If authentication fails
 *
 * @example
 * ```typescript
 * import { ensureAuthUser } from './middlewares/ensure-auth';
 *
 * // Protect routes with authentication
 * app.use('/protected/*', ensureAuthUser);
 *
 * // Access user in protected routes
 * app.get('/protected/profile', (c) => {
 *   const user = c.get('user');
 *   return c.json({
 *     id: user.id,
 *     email: user.email
 *   });
 * });
 *
 * // Bearer token usage:
 * // Authorization: Bearer <access-key>
 *
 * // Cookie usage:
 * // Cookie: __Secure-next-auth.session-token=<jwt>
 * ```
 */
export const ensureAuthUser = createFactoryMiddleware(async (c, next) => {
	// Extract the Bearer token from the Authorization header if it exists
	const authorizationHeader = c.req.header("Authorization") ?? "";
	const [, accessKey = ""] = authorizationHeader.split(" ");

	// Try Bearer token authentication
	if (accessKey) {
		const storage = c.get("storage");
		const user = await storage.getUserByAccessKeyToken(accessKey);

		c.set("accessKeyToken", accessKey);
		c.set("user", {
			id: user.id,
			email: user.email,
		});

		return next();
	}

	// Try JWT cookie authentication
	const rawCookies = c.req.raw.headers.get("cookie");
	const hasSecureCookie = rawCookies?.includes("__Secure-") ?? false;

	const jwtToken = await isJwtTokenValid(c.req.raw, hasSecureCookie);
	console.log("🔑 ~ jwtToken:", jwtToken);

	if (!jwtToken) {
		return c.text(STRINGS.UNAUTHORIZED, HttpStatusCodes.UNAUTHORIZED);
	}

	// Set user context from JWT claims
	c.set("user", {
		id: jwtToken.sub as string,
		email: jwtToken.email as string,
	});

	return next();
});
