/**
 * Debug Delay Middleware Module
 * Provides artificial request delays for development testing
 * @module DebugDelay
 */

import env from "@/api/env";
import { createFactoryMiddleware } from "@/api/lib/create/router";

/**
 * Middleware that introduces an artificial delay for debugging purposes
 * Only active in development environment
 *
 * Features:
 * - Random delay between 2000ms and 2400ms
 * - Development environment only
 * - Console logging of delay duration
 * - Type-safe middleware creation
 *
 * @returns {ReturnType<typeof createFactoryMiddleware>} Configured middleware function
 *
 * @example
 * ```typescript
 * import { debugDelay } from './middlewares/debug-delay';
 *
 * // Add to application
 * app.use(debugDelay);
 *
 * // Development output:
 * // "Adding Artificial Delay of 2234ms"
 * // Request processes after delay
 *
 * // Production:
 * // No delay added, middleware passes through
 * ```
 */
export const debugDelay = createFactoryMiddleware(async (_, next) => {
	if (env.NODE_ENV === "development") {
		// Artificial Delay in DEV => 2000-2400ms
		const waitMs = Math.floor(Math.random() * 400) + 2000;
		console.log(`Adding Artificial Delay of ${waitMs}ms`);
		await new Promise((resolve) => setTimeout(resolve, waitMs));
	}

	return next();
});
