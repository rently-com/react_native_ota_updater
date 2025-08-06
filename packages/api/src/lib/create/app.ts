/**
 * Application Factory Module
 * Provides functions to create and configure Hono application instances
 * @module AppFactory
 */

import type { ContentfulStatusCode } from "hono/utils/http-status";
import { INTERNAL_SERVER_ERROR, OK } from "stoker/http-status-codes";
import { notFound, serveEmojiFavicon } from "stoker/middlewares";

import { BASE_API_PATH, CODEPUSH_PATH, MANAGEMENT_PATH } from "@/api/lib/constants";
import { createRouter } from "@/api/lib/create/router";
import type { AppOpenAPI } from "@/api/lib/types";

import { cliVersionChecker } from "@/api/middlewares/cli-version-checker";
import { debugDelay } from "@/api/middlewares/debug-delay";
import { ensureAuthUser } from "@/api/middlewares/ensure-auth";
import { pinoLogger } from "@/api/middlewares/pino-logger";

import { StorageManager } from "@rentlydev/rnota-db";
import { RedisManager } from "@rentlydev/rnota-redis";

/**
 * Creates and configures a new Hono application instance
 * Sets up middleware, error handlers, and authentication for different routes
 *
 * @returns {AppOpenAPI} Configured Hono application instance
 *
 * Features:
 * - Redis and Storage managers in request context
 * - Emoji favicon (🔥)
 * - Pino logging middleware
 * - Debug delay for development
 * - Authentication for management routes
 * - Error handling with appropriate status codes
 *
 * Protected Routes:
 * - `${MANAGEMENT_PATH}/*`
 * - `${CODEPUSH_PATH}${MANAGEMENT_PATH}/*`
 *
 * @example
 * ```typescript
 * const app = createApp();
 * app.get('/health', (c) => c.json({ status: 'ok' }));
 * serve({ fetch: app.fetch, port: 3000 });
 * ```
 */
export default function createApp() {
	const redis = new RedisManager();
	const storage = new StorageManager();

	const app = createRouter().basePath(BASE_API_PATH) as AppOpenAPI;

	app
		// Set up context variables
		.use((c, next) => {
			c.set("redis", redis);
			c.set("storage", storage);
			return next();
		})
		// Configure middleware
		.use(serveEmojiFavicon("🔥"))
		.use(pinoLogger())
		.use(debugDelay)
		// Protect routes
		.use("/redis_keys", ensureAuthUser)
		.use(`${MANAGEMENT_PATH}/*`, ensureAuthUser)
		.use(`${CODEPUSH_PATH}${MANAGEMENT_PATH}/*`, ensureAuthUser)
		.use(`${MANAGEMENT_PATH}/*`, cliVersionChecker)
		.use(`${CODEPUSH_PATH}${MANAGEMENT_PATH}/*`, cliVersionChecker)
		// Error handling
		.notFound(notFound)
		.onError((err, c) => {
			const currentStatus = "status" in err ? err.status : c.newResponse(null).status;
			const statusCode = currentStatus !== OK ? currentStatus : INTERNAL_SERVER_ERROR;
			return c.text(err.message, statusCode as ContentfulStatusCode);
		});

	return app;
}

/**
 * Creates a test application instance with a custom router
 * Useful for testing individual routes or middleware in isolation
 *
 * @template R - Type extending AppOpenAPI
 * @param {R} router - Router instance to be tested
 * @returns {AppOpenAPI} Test application instance with the router mounted at root
 *
 * @example
 * ```typescript
 * const testRouter = createRouter();
 * testRouter.get('/test', (c) => c.json({ test: 'ok' }));
 *
 * const testApp = createTestApp(testRouter);
 * const res = await testApp.request('/test');
 * expect(res.status).toBe(200);
 * ```
 */
export function createTestApp<R extends AppOpenAPI>(router: R) {
	return createApp().route("/", router);
}
