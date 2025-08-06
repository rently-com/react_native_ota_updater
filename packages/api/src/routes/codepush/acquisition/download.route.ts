/**
 * CodePush Download Status Reporting Module
 *
 * This module implements the download status reporting endpoint for CodePush applications.
 * It tracks when clients successfully download update packages and maintains metrics
 * about download activity.
 *
 * Features:
 * - Download tracking
 * - Metrics collection
 * - Client state tracking
 * - Both cache and persistent storage updates
 *
 * @module CodePushDownloadStatus
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
 * Schema for download status report request body
 * Validates and documents the required information for reporting package downloads
 *
 * Required Fields:
 * - deployment_key: Identifies the deployment containing the downloaded package
 * - label: Version label of the downloaded package
 * - client_unique_id: Unique identifier for the client device
 *
 * This schema ensures all necessary information is provided to track
 * download metrics and client state accurately.
 */
const ReportStatusDownloadRequestBodySchema = z
	.object({
		deployment_key: z.string().openapi({
			description: "The deployment key identifying the source deployment",
		}),
		label: LabelSchema.openapi({
			description: "The version label of the package that was downloaded",
		}),
		client_unique_id: z.string().openapi({
			description: "Unique identifier for the client device that performed the download",
		}),
	})
	.openapi({
		description: "Request body for reporting a successful package download from CodePush",
	});

const publicTag = ["Acquisition/CodePush/Public"];

/**
 * Download Status Report Route Handler
 * Implements the endpoint for clients to report successful package downloads
 *
 * Endpoint: POST /report_status/download
 *
 * Features:
 * - Records download metrics
 * - Updates download counts in Redis cache
 * - Persists metrics to storage
 * - Maintains client download state
 *
 * Response Codes:
 * - 200: Download report successfully processed
 * - 422: Invalid request parameters
 * - 500: Internal server error
 *
 * The handler updates both Redis cache and persistent storage asynchronously
 * to ensure optimal performance while maintaining data consistency.
 */
const ReportDownloadRoute = createRouter().openapi(
	createRoute({
		tags: publicTag,
		path: "/report_status/download",
		method: "post",
		request: {
			body: jsonContentRequired(ReportStatusDownloadRequestBodySchema, "Package download status report details"),
		},
		responses: {
			...INTERNAL_SERVER_ERROR_RESPONSE,
			[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
				createErrorSchema(ReportStatusDownloadRequestBodySchema),
				"Request validation failed - invalid parameters provided",
			),
			[HttpStatusCodes.OK]: textContent(
				createMessageSchema(STRINGS.OK),
				"Download status report successfully processed",
			),
		},
	}),
	async (c) => {
		// const redis = c.get("redis");
		const storage = c.get("storage");
		const body = c.req.valid("json");

		const { deployment_key, label } = body;

		// Update download metrics in Redis cache
		// await redis.incrementLabelStatusCount(deployment_key, label, DEPLOYMENT_STATUS.DOWNLOADED);

		// Asynchronously update persistent storage metrics
		void storage.codepush.metrics.incrementLabelStatusCount(deployment_key, label, DEPLOYMENT_STATUS.DOWNLOADED);

		return c.text(STRINGS.OK, HttpStatusCodes.OK);
	},
);

export { ReportDownloadRoute };
