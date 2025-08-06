/**
 * CodePush Acquisition Routes Module
 *
 * This module serves as the main entry point for all CodePush acquisition-related routes.
 * It combines and exposes the various endpoints needed for the CodePush update process,
 * including update checks, download reporting, and deployment status reporting.
 *
 * Features:
 * - Central router for all acquisition endpoints
 * - Welcome/health check endpoint
 * - Public API path management
 * - Route organization and grouping
 *
 * Endpoints:
 * - GET /: Welcome/health check endpoint
 * - GET /update_check: Check for available updates
 * - POST /report_status/download: Report package downloads
 * - POST /report_status/deploy: Report deployment status
 *
 * @module CodePushAcquisition
 */

import { createRouter } from "@/api/lib/create/router";
import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createMessageObjectSchema } from "stoker/openapi/schemas";

import { ACQUISITION_CODEPUSH_PUBLIC_PATH } from "@/api/lib/constants";
import { STRINGS } from "@/api/utils/strings";

import { ReportDeployRoute } from "./deploy.route";
import { ReportDownloadRoute } from "./download.route";
import { UpdateCheckRoute } from "./update_check.route";

/**
 * OpenAPI tag for acquisition routes
 * Used to group related endpoints in API documentation
 */
const tags = ["Acquisition/CodePush"];

/**
 * Index Route Definition
 * Provides a simple welcome endpoint and health check for the CodePush API
 *
 * Endpoint: GET /
 *
 * Features:
 * - API availability check
 * - Welcome message
 * - No authentication required
 *
 * Response:
 * - 200: API is available with welcome message
 */
const AcquisitionIndexRoute = createRoute({
	tags,
	path: "/",
	method: "get",
	description: "Welcome endpoint that confirms CodePush API availability",
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema(STRINGS.WELCOME_CODEPUSH),
			"Welcome message confirming CodePush API availability",
		),
	},
});

/**
 * Main Acquisition Router
 * Combines all CodePush acquisition-related routes into a single router
 *
 * Features:
 * - Index/welcome endpoint
 * - Update check endpoint
 * - Download reporting endpoint
 * - Deployment status reporting endpoint
 *
 * All routes except the index are mounted under the public API path
 * to maintain consistent routing structure and versioning.
 */
const AcquisitionCodePushRouter = createRouter()
	// Welcome/health check endpoint
	.openapi(AcquisitionIndexRoute, (c) => c.json({ message: STRINGS.WELCOME_CODEPUSH }, HttpStatusCodes.OK))
	// Mount update check endpoint
	.route(ACQUISITION_CODEPUSH_PUBLIC_PATH, UpdateCheckRoute)
	// Mount download reporting endpoint
	.route(ACQUISITION_CODEPUSH_PUBLIC_PATH, ReportDownloadRoute)
	// Mount deployment status reporting endpoint
	.route(ACQUISITION_CODEPUSH_PUBLIC_PATH, ReportDeployRoute);

export { AcquisitionCodePushRouter };
