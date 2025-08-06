/**
 * Main application module for the API server
 * Configures and sets up the Hono application with OpenAPI and routes
 * @module APIApp
 */

import createApp from "@/api/lib/create/app";
import configureOpenAPI from "@/api/lib/openapi/configure-open-api";
import { registerRoutes } from "@/api/routes/index";

/**
 * Main application instance
 * Configured with:
 * - Base application setup (middleware, error handling)
 * - OpenAPI/Swagger documentation
 * - API routes
 * - Development environment endpoint
 *
 * @const {import('hono').Hono}
 */
const app = createApp();
configureOpenAPI(app); // Comment out when not in on-premise servers
registerRoutes(app);

/**
 * Development environment endpoint
 * Returns the current environment variables
 * Note: This endpoint should be disabled in production
 */
// app.get("/env", (c) => {
// 	return c.json({
// 		envs: process.env,
// 	});
// });

export default app;
