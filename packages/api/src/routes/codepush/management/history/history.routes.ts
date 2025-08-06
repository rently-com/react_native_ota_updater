/**
 * CodePush Release History Management Routes Module
 *
 * This module implements functionality for managing release history in CodePush applications.
 * It provides endpoints for retrieving and managing deployment release history across platforms.
 *
 * Features:
 * - View deployment release history
 * - Clear deployment history
 * - Deployment key-based history lookup
 * - Cache invalidation management
 *
 * Security:
 * - Owner/Admin permission validation
 * - User-scoped operations
 * - Deployment key validation
 *
 * Performance:
 * - Redis cache integration
 * - Optimized history queries
 * - Efficient cache invalidation
 *
 * @module routes/codepush/management/history
 */

import { createRouter } from "@/api/lib/create/router";
import { createRoute, z } from "@hono/zod-openapi";
import type { Context } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";

import { Permission } from "@rentlydev/rnota-db";
import { RedisUtilities } from "@rentlydev/rnota-redis";

import type { AppBindings } from "@/api/lib/types";
import { AppNamePlatformDeploymentQuerySchema, DeploymentReleaseHistoryResponseSchema } from "@/api/schemas/common";
import { STRINGS } from "@/api/utils/strings";

import { APP_NOT_FOUND_RESPONSE, PERMISSION_ERROR_RESPONSE } from "../app/app.routes";

const tags = ["Management/CodePush/History"];

/**
 * Route Configuration for Getting Deployment Release History
 * Retrieves the release history for a specific deployment and platform
 *
 * Features:
 * - Platform-specific history retrieval
 * - Deployment validation
 * - Release tracking
 *
 * Endpoint: GET /history
 * Authentication: Required
 *
 * @throws {404} When app or deployment is not found
 * @returns {Object} Release history for the specified deployment
 */
const GetDeploymentReleaseHistoryRoute = createRoute({
	tags,
	path: "/history",
	method: "get",
	description: "Retrieves release history for the specified deployment and platform",
	request: { query: AppNamePlatformDeploymentQuerySchema },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(AppNamePlatformDeploymentQuerySchema),
			"Invalid query parameters",
		),
		[HttpStatusCodes.OK]: jsonContent(
			DeploymentReleaseHistoryResponseSchema,
			"Returns the platform's deployment release history",
		),
	},
});

/**
 * Route Configuration for Clearing Deployment Release History
 * Deletes all release history for a specific deployment and platform
 *
 * Features:
 * - History cleanup
 * - Cache invalidation
 * - Permission validation
 *
 * Endpoint: DELETE /history
 * Authentication: Required (Admin only)
 *
 * @throws {404} When app or deployment is not found
 * @throws {403} When user lacks required permissions
 * @returns {Object} Success message confirming history cleared
 */
const DeleteDeploymentReleaseHistoryRoute = createRoute({
	tags,
	path: "/history",
	method: "delete",
	description: "Clears release history for the specified deployment and platform",
	request: { query: AppNamePlatformDeploymentQuerySchema },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		...PERMISSION_ERROR_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(AppNamePlatformDeploymentQuerySchema),
			"Invalid query parameters",
		),
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.DEPLOYMENT_HISTORY_CLEARED("Staging", "TestApp", "android")),
			"Returns success message",
		),
	},
});

/**
 * Route Configuration for Getting History by Deployment Key
 * Retrieves release history using a deployment key directly
 *
 * Features:
 * - Direct key-based lookup
 * - Unverified history access
 * - Quick retrieval
 *
 * Endpoint: GET /history/overview
 * Authentication: Required
 *
 * @throws {404} When deployment key is not found
 * @returns {Object} Release history for the deployment key
 */
const GetDeploymentReleaseHistoryByKeyRoute = createRoute({
	tags,
	path: "/history/overview",
	method: "get",
	description: "Retrieves release history using a deployment key",
	request: { query: z.object({ deploymentKey: z.string() }) },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(z.object({ deploymentKey: z.string() })),
			"Invalid query parameters",
		),
		[HttpStatusCodes.OK]: jsonContent(
			DeploymentReleaseHistoryResponseSchema,
			"Returns the platform's deployment release history",
		),
	},
});

/**
 * Invalidates the cached package for a deployment
 * Removes the cached package data from Redis when history is cleared
 *
 * @param {string} deploymentKey - The deployment key to invalidate cache for
 * @param {Context<AppBindings>} c - The application context with Redis binding
 * @returns {Promise<void>} Resolves when cache is invalidated
 * @throws {Error} When Redis operation fails
 */
export async function invalidateCachedPackage(deploymentKey: string, c: Context<AppBindings>): Promise<void> {
	const redis = c.get("redis");
	await redis.invalidateCache(RedisUtilities.getDeploymentKeyHash(deploymentKey));
}

/**
 * Release History Management Router Implementation
 * Combines all history management routes with their handlers
 *
 * Features:
 * - History retrieval and management
 * - Cache control
 * - Permission validation
 *
 * Security:
 * - Permission-based access control
 * - User scope validation
 * - Cache invalidation safety
 *
 * @throws {401} When authentication fails
 * @throws {403} When permission check fails
 * @throws {404} When app or deployment not found
 */
const HistoryRouter = createRouter()
	.openapi(GetDeploymentReleaseHistoryRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName, platform } = c.req.valid("query");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		const deployment = await storage.codepush.getDeploymentForAppIdAndPlatform(
			collaboratorApp.appId,
			platform,
			deploymentName,
		);

		if (!deployment) {
			return c.text(STRINGS.DEPLOYMENT.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		// Returns unverified release history for the deployment
		const history = await storage.codepush.getReleaseHistoryByDeploymentKey(deployment.key);

		return c.json({ history: history }, HttpStatusCodes.OK);
	})
	.openapi(DeleteDeploymentReleaseHistoryRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName, platform } = c.req.valid("query");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		storage.codepush.throwIfInvalidPermissions(collaboratorApp, Permission.ADMIN);

		const deploymentToClearHistory = await storage.codepush.getDeploymentForAppIdAndPlatform(
			collaboratorApp.appId,
			platform,
			deploymentName,
		);

		if (!deploymentToClearHistory) {
			return c.text(STRINGS.DEPLOYMENT.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		await storage.codepush.clearReleaseHistoryByDeploymentKey(deploymentToClearHistory.key);

		await invalidateCachedPackage(deploymentToClearHistory.key, c);

		return c.json(
			{ message: STRINGS.DEPLOYMENT_HISTORY_CLEARED(deploymentName, appName, platform) },
			HttpStatusCodes.OK,
		);
	})
	.openapi(GetDeploymentReleaseHistoryByKeyRoute, async (c) => {
		const storage = c.get("storage");

		const { deploymentKey } = c.req.valid("query");

		// Returns unverified release history for the deployment
		const history = await storage.codepush.getReleaseHistoryByDeploymentKey(deploymentKey);

		return c.json({ history: history }, HttpStatusCodes.OK);
	});

export { HistoryRouter };
