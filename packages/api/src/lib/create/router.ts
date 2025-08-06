/**
 * Router Factory Module
 * Provides functions to create OpenAPI-enabled routers and middleware
 * @module RouterFactory
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { createFactory } from "hono/factory";
import { defaultHook } from "stoker/openapi";

import type { AppBindings } from "@/api/lib/types";

/**
 * Creates a new OpenAPI-enabled Hono router instance
 * Configured with application bindings and default OpenAPI hook
 *
 * @returns {OpenAPIHono<AppBindings>} New router instance
 *
 * Features:
 * - OpenAPI/Swagger documentation support
 * - Type-safe request/response handling with Zod
 * - Non-strict path matching
 * - Default error hook for consistent error responses
 *
 * @example
 * ```typescript
 * const router = createRouter();
 *
 * // Add OpenAPI route with validation
 * router.openapi(
 *   route({
 *     method: 'get',
 *     path: '/users',
 *     responses: {
 *       200: {
 *         content: {
 *           'application/json': {
 *             schema: z.array(userSchema)
 *           }
 *         }
 *       }
 *     }
 *   }),
 *   (c) => c.json(users)
 * );
 * ```
 */
export function createRouter() {
	return new OpenAPIHono<AppBindings>({
		defaultHook,
		strict: false,
	});
}

/**
 * Factory for creating type-safe middleware
 * Uses the application bindings type for proper typing
 *
 * @const {ReturnType<typeof createFactory<AppBindings>>}
 *
 * @example
 * ```typescript
 * const loggerMiddleware = createFactoryMiddleware(async (c, next) => {
 *   console.log(`${c.req.method} ${c.req.url}`);
 *   await next();
 * });
 *
 * router.use(loggerMiddleware);
 * ```
 */
const factory = createFactory<AppBindings>();

/**
 * Function to create type-safe middleware with application bindings
 * Re-exported from the factory for convenience
 *
 * @const {typeof factory.createMiddleware}
 */
export const createFactoryMiddleware = factory.createMiddleware;
