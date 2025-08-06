/**
 * Health Check Routes Module
 *
 * This module implements health check endpoints for monitoring system status.
 * It provides functionality to validate critical service dependencies like
 * database and Redis connections.
 *
 * Features:
 * - Database connection health validation
 * - Redis connection health validation
 * - Status reporting via HTTP endpoints
 *
 * Security:
 * - No authentication required
 * - Public endpoint for monitoring
 *
 * @module routes/health
 */

import { createRouter } from "@/api/lib/create/router";
import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createMessageObjectSchema } from "stoker/openapi/schemas";

import { INTERNAL_SERVER_ERROR_RESPONSE } from "@/api/lib/openapi/open-api-responses";
import { STRINGS } from "@/api/utils/strings";

const tags = ["Health"];

/**
 * Health Check Route Configuration
 * Defines OpenAPI specification for the health check endpoint
 *
 * Features:
 * - Validates database connectivity
 * - Checks Redis connection status
 * - Returns standardized health status response
 *
 * Endpoint: GET /health
 * Authentication: Not required
 *
 * Response:
 * - 200: All systems healthy and responding
 * - 500: One or more critical dependencies failed
 */
const HealthCheckRoute = createRoute({
	tags,
	path: "/health",
	description: "Checks the health status of the application's critical dependencies",
	method: "get",
	responses: {
		...INTERNAL_SERVER_ERROR_RESPONSE,
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.HEALTHY),
			"Checks the Health of DB & Redis connections",
		),
	},
});

/**
 * Redis Keys Check Route Configuration
 * Defines OpenAPI specification for the Redis keys inspection endpoint
 *
 * Features:
 * - Lists all keys currently stored in Redis
 * - Helps diagnose Redis state and data integrity
 * - Provides visibility into cache contents
 *
 * Endpoint: GET /redis_keys
 * Authentication: Not required
 *
 * Response:
 * - 200: Successfully retrieved Redis keys
 * - 500: Error accessing Redis
 */
const RedisKeysCheckRoute = createRoute({
	tags,
	path: "/redis_keys",
	description: "Lists all keys currently stored in Redis for diagnostic purposes",
	method: "get",
	responses: {
		...INTERNAL_SERVER_ERROR_RESPONSE,
		[HttpStatusCodes.OK]: jsonContent(
			z.object({
				data: z.array(
					z.object({
						key: z.string(),
						value: z.string().nullable(),
					}),
				),
			}),
			"Returns list of all Redis keys",
		),
	},
});

/**
 * Health Check Router Implementation
 * Performs actual health validation of system dependencies
 *
 * Features:
 * - Asynchronous health checks
 * - Comprehensive dependency validation
 * - Standardized error handling
 *
 * @throws {Error} When Redis health check fails
 * @throws {Error} When Storage/Database health check fails
 * @returns {Object} JSON response with health status message
 */
const HealthRoute = createRouter()
	.openapi(HealthCheckRoute, async (c) => {
		await c.get("redis").checkHealth();
		await c.get("storage").checkHealth();

		return c.json({ message: STRINGS.HEALTHY }, HttpStatusCodes.OK);
	})
	.openapi(RedisKeysCheckRoute, async (c) => {
		const redis = c.get("redis");
		const data = await redis.getAllKeys();
		return c.json({ data }, HttpStatusCodes.OK);
	});

export { HealthRoute };
