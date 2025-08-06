/**
 * CodePush Update Check Route Module
 *
 * This module implements the update check endpoint for CodePush applications.
 * It handles client requests to check for available updates, managing both
 * cached and fresh responses, and handles rollout deployments.
 *
 * Features:
 * - Redis-based response caching
 * - Rollout percentage management
 * - Version compatibility checking
 * - Flexible version format support
 * - Client-specific update targeting
 *
 * @module CodePushUpdateCheck
 */

import { createRouter } from "@/api/lib/create/router";
import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import type { StorageManager } from "@rentlydev/rnota-db";
import { type CacheableResponse, RedisUtilities } from "@rentlydev/rnota-redis";
import { UpdateCheckResponseSchema, type UpdateCheckResponseType } from "@rentlydev/rnota-redis/types";

import { INTERNAL_SERVER_ERROR_RESPONSE } from "@/api/lib/openapi/open-api-responses";
import { createMessageSchema, textContent } from "@/api/lib/openapi/schemas";

import { UpdateCheckRequestQuerySchema, type UpdateCheckRequestQueryType } from "@/api/schemas/update-check";
import { getUpdatePackageInfo } from "@/api/utils/codepush/acquisition";
import { convertObjectToSnakeCase } from "@/api/utils/codepush/convert-snakecase";
import { isSelectedForRollout } from "@/api/utils/codepush/rollout-selector";
import { STRINGS } from "@/api/utils/strings";

/**
 * Generates a cache key from the request URL
 * Removes client-specific parameters to enable shared caching
 *
 * @param {string} originalUrl - The original request URL
 * @returns {string} A normalized URL string for caching
 *
 * @example
 * const url = "https://api.example.com/update_check?deployment_key=123&client_unique_id=456"
 * getUrlKey(url) // Returns "/update_check?deployment_key=123"
 */
function getUrlKey(originalUrl: string): string {
	const parsedUrl = new URL(originalUrl);
	parsedUrl.searchParams.delete("client_unique_id");
	return `${parsedUrl.pathname}?${parsedUrl.searchParams.toString()}`;
}

/**
 * Creates an update check response using the storage manager
 * Handles version format normalization and compatibility checks
 *
 * @param {UpdateCheckRequestQueryType} updateRequest - The client's update check request
 * @param {StorageManager} storage - The storage manager instance
 * @returns {Promise<CacheableResponse>} The response object with update information
 * @throws {Error} If deployment is not found or server error occurs
 *
 * Features:
 * - Handles plain integer versions (e.g., "1" → "1.0.0")
 * - Supports missing patch versions (e.g., "2.0" → "2.0.0")
 * - Preserves original version format in response
 * - Validates deployment key and retrieves release history
 */
const createResponseUsingStorage = async (
	updateRequest: UpdateCheckRequestQueryType,
	storage: StorageManager,
): Promise<CacheableResponse> => {
	let originalAppVersion = "";

	// Handle plain integer version numbers (e.g., "1" → "1.0.0")
	const isPlainIntegerNumber = /^\d+$/.test(updateRequest.app_version);
	if (isPlainIntegerNumber) {
		originalAppVersion = updateRequest.app_version;
		updateRequest.app_version = `${originalAppVersion}.0.0`;
	}

	// Handle missing patch versions (e.g., "2.0" or "2.0-prerelease")
	const isMissingPatchVersion = /^\d+\.\d+([\+\-].*)?$/.test(updateRequest.app_version);
	if (isMissingPatchVersion) {
		originalAppVersion = updateRequest.app_version;
		const semverTagIndex = originalAppVersion.search(/[\+\-]/);

		if (semverTagIndex === -1) {
			updateRequest.app_version += ".0";
		} else {
			updateRequest.app_version = `${originalAppVersion.slice(0, semverTagIndex)}.0${originalAppVersion.slice(semverTagIndex)}`;
		}
	}

	const releaseHistory = await storage.codepush.getVerifiedReleaseHistoryByDeploymentKey(updateRequest.deployment_key);
	const updateObject = getUpdatePackageInfo(releaseHistory, updateRequest);

	// Restore original version format if no changes were needed
	// && updateObject.originalPackage.appVersion === updateRequest.app_version
	if (isMissingPatchVersion || isPlainIntegerNumber) {
		updateObject.originalPackage.appVersion = originalAppVersion;

		if (updateObject.rolloutPackage) {
			updateObject.rolloutPackage.appVersion = originalAppVersion;
		}
	}

	const cacheableResponse: CacheableResponse = { body: updateObject };

	return cacheableResponse;
};

const publicTag = ["Acquisition/CodePush/Public"];

/**
 * Update Check Route Handler
 * Implements the main update check endpoint for CodePush clients
 *
 * Endpoint: GET /update_check
 *
 * Features:
 * - Redis-based response caching for performance
 * - Rollout percentage management
 * - Client-specific update targeting
 * - Version compatibility validation
 *
 * Response Codes:
 * - 200: Successful update check with update info
 * - 404: Deployment not found or no update available
 * - 422: Invalid request parameters
 * - 500: Internal server error
 */
const UpdateCheckRoute = createRouter().openapi(
	createRoute({
		tags: publicTag,
		path: "/update_check",
		method: "get",
		description:
			"Check for available updates for a CodePush application. Returns update information if a newer version is available.",
		request: { query: UpdateCheckRequestQuerySchema },
		responses: {
			...INTERNAL_SERVER_ERROR_RESPONSE,
			[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
				createErrorSchema(UpdateCheckRequestQuerySchema),
				"Validation errors in request parameters",
			),
			[HttpStatusCodes.NOT_FOUND]: textContent(
				createMessageSchema(STRINGS.DEPLOYMENT.NOT_FOUND.SINGLE).or(createMessageSchema(STRINGS.NO_RESPONSE)),
				"Deployment key not found or no update available",
			),
			[HttpStatusCodes.OK]: jsonContent(UpdateCheckResponseSchema, "Update check successful with update information"),
		},
	}),
	async (c) => {
		const redis = c.get("redis");
		const storage = c.get("storage");

		const url = getUrlKey(c.req.url);
		const updateRequest = c.req.valid("query");

		// Generate Redis key from deployment key
		const key = RedisUtilities.getDeploymentKeyHash(updateRequest.deployment_key);

		let fromCache = true;

		// Try to get cached response first
		const cachedRedisResponse = await redis.getCachedResponse(key, url);
		fromCache = !!cachedRedisResponse;

		// Fall back to storage if cache miss
		const finalResponse = cachedRedisResponse ?? (await createResponseUsingStorage(updateRequest, storage));

		if (!finalResponse) {
			return c.text(STRINGS.NO_RESPONSE, HttpStatusCodes.NOT_FOUND);
		}

		let giveRolloutPackage = false;

		const cachedResponseObject = finalResponse.body;

		// Check if client should receive rollout package
		if (cachedResponseObject.rolloutPackage && updateRequest.client_unique_id) {
			const releaseSpecificString =
				cachedResponseObject.rolloutPackage.label || cachedResponseObject.rolloutPackage.packageHash;

			if (releaseSpecificString) {
				giveRolloutPackage = isSelectedForRollout(
					updateRequest.client_unique_id,
					cachedResponseObject.rollout,
					releaseSpecificString,
				);
				console.log("giveRolloutPackage:", giveRolloutPackage);
			}
		}

		// Prepare final response
		const updateCheckBody: UpdateCheckResponseType = {
			fromCache: fromCache,
			updateInfo: giveRolloutPackage ? cachedResponseObject.rolloutPackage! : cachedResponseObject.originalPackage,
		};

		// Maintain compatibility with new API format
		updateCheckBody.updateInfo.target_binary_range = updateCheckBody.updateInfo.appVersion;

		// Cache the response if it was a cache miss
		if (!fromCache) {
			await redis.setCachedResponse(key, url, finalResponse);
		}

		return c.json(convertObjectToSnakeCase(updateCheckBody), HttpStatusCodes.OK);
	},
);

export { UpdateCheckRoute };
