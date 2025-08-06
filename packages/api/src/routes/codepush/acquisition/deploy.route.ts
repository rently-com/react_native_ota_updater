/**
 * CodePush Deployment Status Reporting Module
 *
 * This module implements the deployment status reporting endpoint for CodePush applications.
 * It handles client reports about the success or failure of update deployments and
 * maintains metrics about deployment performance.
 *
 * Features:
 * - Deployment success/failure tracking
 * - Metrics collection and storage
 * - Version transition tracking
 * - Client state management
 *
 * @module CodePushDeploymentStatus
 */

import { createRouter } from "@/api/lib/create/router";
import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { DEPLOYMENT_STATUS } from "@rentlydev/rnota-redis";

import { INTERNAL_SERVER_ERROR_RESPONSE } from "@/api/lib/openapi/open-api-responses";
import { createMessageSchema, textContent } from "@/api/lib/openapi/schemas";
import { LabelSchema } from "@/api/schemas/common";
import { STRINGS } from "@/api/utils/strings";

/**
 * Schema for deployment status report request body
 * Validates and documents the required information for reporting deployment status
 *
 * Required Fields:
 * - app_version: The version of the application
 * - deployment_key: The key identifying the deployment
 * - client_unique_id: Unique identifier for the client
 * - status: Success or failure status of the deployment
 * - label: Version label of the deployed package
 *
 * Optional Fields:
 * - previous_deployment_key: Key of the previous deployment
 * - previous_label_or_app_version: Previous version label or app version
 */
const ReportStatusDeployRequestBodySchema = z
	.object({
		app_version: z.string().openapi({
			description: "The current version of the application after deployment attempt",
		}),
		deployment_key: z.string().openapi({
			description: "The deployment key identifying the target deployment",
		}),
		client_unique_id: z.string().openapi({
			description: "Unique identifier for the client device",
		}),
		status: z.enum([DEPLOYMENT_STATUS.DEPLOYMENT_FAILED, DEPLOYMENT_STATUS.DEPLOYMENT_SUCCEEDED]).openapi({
			description: "The final status of the deployment attempt (success/failure)",
		}),
		label: LabelSchema.openapi({
			description: "The version label of the package that was deployed",
		}),
		previous_deployment_key: z.string().nullish().openapi({
			description: "The deployment key of the previous version (defaults to current deployment key if not provided)",
		}),
		previous_label_or_app_version: z
			.string()
			.openapi({
				description: "The previous version of the application",
			})
			.or(
				LabelSchema.openapi({
					description: "The version label of the previous package",
				}),
			)
			.optional()
			.openapi({
				description: "The previous version identifier (either app version or package label)",
			}),
	})
	.openapi({
		description: "Request body for reporting the status of a CodePush deployment attempt",
	});

const publicTag = ["Acquisition/CodePush/Public"];

/**
 * Deployment Status Report Route Handler
 * Implements the endpoint for clients to report deployment status
 *
 * Endpoint: POST /report_status/deploy
 *
 * Features:
 * - Records deployment success/failure metrics
 * - Tracks version transitions
 * - Manages client deployment state
 * - Updates both Redis cache and persistent storage
 *
 * Response Codes:
 * - 200: Status report successfully processed
 * - 400: Invalid status report combination
 * - 422: Invalid request parameters
 * - 500: Internal server error
 */
const ReportDeployRoute = createRouter().openapi(
	createRoute({
		tags: publicTag,
		path: "/report_status/deploy",
		method: "post",
		description:
			"Report the status of a CodePush deployment attempt. Used by clients to track successful deployments and failures.",
		request: {
			body: jsonContentRequired(ReportStatusDeployRequestBodySchema, "Deployment status report details"),
		},
		responses: {
			...INTERNAL_SERVER_ERROR_RESPONSE,
			[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
				createErrorSchema(ReportStatusDeployRequestBodySchema),
				"Request validation failed - invalid parameters provided",
			),
			[HttpStatusCodes.BAD_REQUEST]: textContent(
				createMessageSchema(STRINGS.DEPLOY_STATUS_REPORT_BAD_REQUEST),
				"Invalid status report - missing required status for label",
			),
			[HttpStatusCodes.OK]: textContent(createMessageSchema(STRINGS.OK), "Status report successfully processed"),
		},
	}),
	async (c) => {
		// const redis = c.get("redis");
		const storage = c.get("storage");

		const {
			deployment_key,
			app_version,
			label,
			status,
			// client_unique_id,
			previous_deployment_key,
			previous_label_or_app_version,
		} = c.req.valid("json");

		// Default to current deployment key if previous not specified
		const previousDeploymentKey = previous_deployment_key ?? deployment_key;

		// Validate that status is provided when reporting for a specific label
		if (label && !status) {
			return c.text(STRINGS.DEPLOY_STATUS_REPORT_BAD_REQUEST, HttpStatusCodes.BAD_REQUEST);
		}

		if (status === DEPLOYMENT_STATUS.DEPLOYMENT_FAILED) {
			// Record deployment failure metrics
			// await redis.incrementLabelStatusCount(deployment_key, label, status as DEPLOYMENT_STATUS);
			void storage.codepush.metrics.incrementLabelStatusCount(deployment_key, label, status as DEPLOYMENT_STATUS);
		} else {
			// Record successful version transition
			const labelOrAppVersion = label || app_version;
			// await redis.recordUpdate(deployment_key, labelOrAppVersion, previousDeploymentKey, previous_label_or_app_version);
			void storage.codepush.metrics.recordUpdate(
				deployment_key,
				labelOrAppVersion,
				previousDeploymentKey,
				previous_label_or_app_version,
			);
		}

		// Clear client's active deployment state
		// await redis.removeDeploymentKeyClientActiveLabel(previousDeploymentKey, client_unique_id);
		return c.text(STRINGS.OK, HttpStatusCodes.OK);
	},
);

export { ReportDeployRoute };
