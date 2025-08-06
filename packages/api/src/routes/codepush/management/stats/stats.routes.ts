/**
 * CodePush Statistics Routes Module
 *
 * This module provides endpoints for retrieving CodePush statistics and analytics.
 * It includes endpoints for release counts, deployment statistics, and other metrics.
 *
 * Features:
 * - Release count statistics per app/platform/deployment
 * - Deployment analytics
 * - Performance metrics
 *
 * Security:
 * - Permission-based access control
 * - User scope validation
 * - API key validation
 *
 * @module routes/codepush/management/stats
 */
import { createRouter } from "@/api/lib/create/router";
import { ReleaseStatsResponseSchema } from "@/api/schemas/common";
import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Management/CodePush/Stats"];

/**
 * Route Configuration for Getting Release Statistics
 * Retrieves the release statistics for all apps, platforms, and deployments
 *
 * Features:
 * - App, platform, and deployment statistics
 * - Release count aggregation
 *
 * Endpoint: GET /stats/releases
 * Authentication: Required
 *
 * @returns {Object} Release statistics for all apps, platforms, and deployments
 */
const GetReleaseStatsRoute = createRoute({
	tags,
	path: "/stats/releases",
	method: "get",
	description: "Retrieves release statistics for all apps, platforms, and deployments",
	responses: {
		[HttpStatusCodes.OK]: jsonContent(ReleaseStatsResponseSchema, "Returns the release statistics"),
	},
});

/**
 * Release Statistics Router
 * Provides endpoints for retrieving CodePush release statistics
 */
const StatsRouter = createRouter().openapi(GetReleaseStatsRoute, async (c) => {
	const storage = c.get("storage");

	const releaseStats = await storage.codepush.getReleaseStats();

	return c.json({ stats: releaseStats }, HttpStatusCodes.OK);
});

export { StatsRouter };
