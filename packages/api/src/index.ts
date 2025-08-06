/**
 * API Server entry point
 * Sets up and starts the HTTP server using Hono's node-server adapter
 * @module APIServer
 */

import { serve } from "@hono/node-server";

import app from "@/api/app";
import env from "@/api/env";
import { BASE_API_PATH } from "@/api/lib/constants";
import { showRoutes } from "hono/dev";

/**
 * Start the HTTP server with the configured Hono application
 * Features:
 * - Configurable port via environment variables
 * - Route visualization in development
 * - Base API path prefix
 *
 * @example
 * ```bash
 * # Start the server
 * npm start
 *
 * # Server will output:
 * # Server is running on port http://localhost:3000/api Mode: development
 * # [Routes]
 * # GET  /api/env
 * # ...
 * ```
 */
serve(
	{
		fetch: app.fetch,
		port: Number(env.PORT),
	},
	(info) => {
		// Show available routes in development
		showRoutes(app, { colorize: true });

		console.log(`\nServer is running on port http://localhost:${info.port}${BASE_API_PATH} Mode: ${env.NODE_ENV}\n`);
	},
);

export default app;
