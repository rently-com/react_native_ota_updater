/**
 * CodePush Release Management Routes Module
 *
 * This module implements functionality for managing releases in CodePush applications.
 * It provides endpoints for creating, verifying, promoting, and rolling back releases
 * across different platforms and deployments.
 *
 * Features:
 * - Release verification and creation
 * - Release promotion between deployments
 * - Rollback functionality
 * - Release details management
 * - Rollout management
 *
 * Security:
 * - Owner/Admin permission validation
 * - User-scoped operations
 * - Package hash validation
 * - Version control
 *
 * Performance:
 * - Optimized release queries
 * - Cache invalidation
 * - Efficient rollout management
 * - Version comparison optimization
 *
 * @module routes/codepush/management/release
 */

import * as semver from "semver";

import { createRouter } from "@/api/lib/create/router";
import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentOneOf, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";

import { Permission, ReleaseMethod, type TCodePushRelease } from "@rentlydev/rnota-db";

import { createMessageSchema, textContent } from "@/api/lib/openapi/schemas";
import {
	AppNamePlatformDeploymentQuerySchema,
	GetReleaseResponseSchema,
	PromoteReleaseBodySchema,
	ReleaseDetailsQuerySchema,
	ReleaseDownloadUrlQuerySchema,
	ReleaseResponseSchema,
	ReleaseVerifiedResponseSchema,
	RollbackQuerySchema,
	UpdateReleaseBodySchema,
	VerifyReleaseBodySchema,
} from "@/api/schemas/common";
import { isUnfinishedRollout } from "@/api/utils/codepush/rollout-selector";
import { STRINGS } from "@/api/utils/strings";

import { getDownloadUrlByKey } from "@rentlydev/rnota-aws";
import { DEFAULT_CODEPUSH_DEPLOYMENT_NAMES } from "@rentlydev/rnota-db";
import { APP_NOT_FOUND_RESPONSE, PERMISSION_ERROR_RESPONSE } from "../app/app.routes";
import { invalidateCachedPackage } from "../history/history.routes";

/**
 * Retrieves a release by its label from the verified release history
 *
 * @param {TCodePushRelease[]} verifiedReleaseHistory - Array of verified releases
 * @param {string} label - Label to search for
 * @returns {TCodePushRelease | null} Matching release or null if not found
 */
function getReleaseFromLabel(verifiedReleaseHistory: TCodePushRelease[], label: string): TCodePushRelease | null {
	if (!verifiedReleaseHistory.length) return null;

	for (const release of verifiedReleaseHistory) {
		if (release.label === label) {
			return release;
		}
	}

	return null;
}

/**
 * Finds the latest package hash for a specific app version
 *
 * @param {TCodePushRelease[]} verifiedReleaseHistory - Array of verified releases
 * @param {string} appVersion - Target app version
 * @returns {string | null} Package hash or null if not found
 */
function getLastPackageHashWithSameAppVersion(
	verifiedReleaseHistory: TCodePushRelease[],
	appVersion: string,
): string | null {
	if (!verifiedReleaseHistory.length) return null;

	// appVersion is not a range, only fixed
	for (const release of verifiedReleaseHistory) {
		if (semver.satisfies(appVersion, release.appVersion)) {
			return release.packageHash;
		}
	}

	return null;
}

const tags = ["Management/CodePush/Release"];

/**
 * Route Configuration for Release Verification
 * Verifies and prepares a new release for deployment
 *
 * Features:
 * - Package hash validation
 * - Version compatibility check
 * - Rollout status verification
 *
 * Endpoint: POST /release
 * Authentication: Required
 *
 * @throws {404} When app or deployment is not found
 * @throws {409} When package hash exists or rollout is incomplete
 * @returns {Object} Verified release details
 */
const PostReleaseVerifyRoute = createRoute({
	tags,
	path: "/release",
	method: "post",
	description: "Verifies and prepares a new release for deployment",
	request: {
		query: AppNamePlatformDeploymentQuerySchema,
		body: jsonContentRequired(VerifyReleaseBodySchema, "The new release details"),
	},
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		...PERMISSION_ERROR_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
			[createErrorSchema(AppNamePlatformDeploymentQuerySchema), createErrorSchema(VerifyReleaseBodySchema)],
			"Returns an error if the query parameters or payload are missing or invalid",
		),
		[HttpStatusCodes.CONFLICT]: textContent(
			createMessageSchema(STRINGS.APP_PACKAGE_IDENTICAL),
			"Package hash already exists or rollout not complete",
		),
		[HttpStatusCodes.OK]: jsonContent(ReleaseVerifiedResponseSchema, "Returns the newly created release"),
	},
});

/**
 * Route Configuration for Release Confirmation
 * Confirms and activates a previously verified release
 *
 * Features:
 * - Release activation
 * - Cache invalidation
 * - Deployment update
 *
 * Endpoint: POST /release/verify
 * Authentication: Required
 *
 * @throws {404} When app or deployment is not found
 * @returns {Object} Activated release details
 */
const PostReleaseVerifiedRoute = createRoute({
	tags,
	path: "/release/verify",
	method: "post",
	description: "Confirms and activates a previously verified release",
	request: {
		query: AppNamePlatformDeploymentQuerySchema,
		body: jsonContentRequired(
			z.object({ releaseId: z.number().openapi({ description: "The release id" }) }),
			"The release id to verify",
		),
	},
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		...PERMISSION_ERROR_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
			[
				createErrorSchema(AppNamePlatformDeploymentQuerySchema),
				createErrorSchema(z.object({ releaseId: z.number().openapi({ description: "The release id" }) })),
			],
			"Returns an error if the query parameters or payload are missing or invalid",
		),
		[HttpStatusCodes.OK]: jsonContent(ReleaseResponseSchema, "Returns the newly created release"),
	},
});

/**
 * Route Configuration for Getting Release Details
 * Retrieves detailed information about a specific release
 *
 * Features:
 * - Release information retrieval
 * - Version details
 * - Deployment status
 *
 * Endpoint: GET /release
 * Authentication: Required
 *
 * @throws {404} When release is not found
 * @returns {Object} Release details
 */
const GetReleaseDetailsRoute = createRoute({
	tags,
	path: "/release",
	method: "get",
	description: "Retrieves detailed information about a specific release",
	request: { query: ReleaseDetailsQuerySchema },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		...PERMISSION_ERROR_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
			[createErrorSchema(ReleaseDetailsQuerySchema)],
			"Returns an error if the query parameters are missing or invalid",
		),
		[HttpStatusCodes.OK]: jsonContent(GetReleaseResponseSchema, "Returns the release details"),
	},
});

/**
 * Route Configuration for Updating Release Details
 * Modifies existing release information
 *
 * Features:
 * - Release metadata updates
 * - Rollout adjustment
 * - Status modification
 *
 * Endpoint: PATCH /release
 * Authentication: Required
 *
 * @throws {404} When release is not found
 * @throws {409} When rollout update is invalid
 * @returns {Object} Success message
 */
const PatchReleaseDetailsRoute = createRoute({
	tags,
	path: "/release",
	method: "patch",
	description: "Modifies existing release information",
	request: {
		query: AppNamePlatformDeploymentQuerySchema,
		body: jsonContentRequired(UpdateReleaseBodySchema, "The updated release details"),
	},
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		...PERMISSION_ERROR_RESPONSE,
		[HttpStatusCodes.CONFLICT]: textContent(
			createMessageSchema("Cannot Update rollout of a completed rollout release"),
			"Rollout out of bounds",
		),
		[HttpStatusCodes.NOT_MODIFIED]: { description: "No changes were made" },
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema("Successfully Updated the release"),
			"Returns the success message",
		),
	},
});

/**
 * Route Configuration for Release Promotion
 * Promotes a release from one deployment to another
 *
 * Features:
 * - Cross-deployment promotion
 * - Rollout status check
 * - Version compatibility
 *
 * Endpoint: POST /release/promote
 * Authentication: Required
 *
 * @throws {404} When source/target deployment not found
 * @throws {409} When promotion is invalid
 * @returns {Object} Success message
 */
const PromoteReleaseRoute = createRoute({
	tags,
	path: "/release/promote",
	method: "post",
	description: "Promotes a release from one deployment to another",
	request: {
		query: AppNamePlatformDeploymentQuerySchema,
		body: jsonContentRequired(PromoteReleaseBodySchema, "The new release details"),
	},
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		...PERMISSION_ERROR_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
			[createErrorSchema(AppNamePlatformDeploymentQuerySchema), createErrorSchema(PromoteReleaseBodySchema)],
			"Returns an error if the query parameters or payload are missing or invalid",
		),
		[HttpStatusCodes.CONFLICT]: textContent(
			createMessageSchema("Cannot Promote"),
			"Unfinished rollout release unless it is already disabled or identical to the destination deployment's current release",
		),
		[HttpStatusCodes.CREATED]: jsonContent(
			createMessageObjectSchema("Release Promoted Successfully"),
			"Returns success if promoted",
		),
	},
});

/**
 * Route Configuration for Release Rollback
 * Reverts a deployment to a previous release
 *
 * Features:
 * - Version rollback
 * - Rollout status check
 * - Cache invalidation
 *
 * Endpoint: POST /release/rollback
 * Authentication: Required
 *
 * @throws {404} When deployment not found
 * @throws {409} When rollback is invalid
 * @returns {Object} Success message
 */
const RollbackReleaseRoute = createRoute({
	tags,
	path: "/release/rollback",
	method: "post",
	description: "Reverts a deployment to a previous release",
	request: { query: RollbackQuerySchema },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		...PERMISSION_ERROR_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
			[createErrorSchema(RollbackQuerySchema)],
			"Returns an error if the query parameters are missing or invalid",
		),
		[HttpStatusCodes.CONFLICT]: textContent(
			createMessageSchema("Cannot Rollback"),
			"Unfinished rollout release unless it is already disabled or identical to the destination deployment's current release",
		),
		[HttpStatusCodes.CREATED]: jsonContent(
			createMessageObjectSchema("Successfully Rolled back Release"),
			"Returns success if rolled back",
		),
	},
});

/**
 * Route Configuration for Release Download URL
 * Retrieves the download URL for a specific release
 *
 * Features:
 * - Release download URL retrieval
 *
 * Endpoint: GET /release/download
 * Authentication: Required
 *
 * @throws {404} When release is not found
 * @returns {Object} Release download URL
 */
const GetReleaseDownloadUrlRoute = createRoute({
	tags,
	path: "/release/download",
	method: "get",
	description: "Gets the download url for a release",
	request: { query: ReleaseDownloadUrlQuerySchema },
	responses: {
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
			[createErrorSchema(ReleaseDownloadUrlQuerySchema)],
			"Returns an error if the query parameters are missing or invalid",
		),
		[HttpStatusCodes.OK]: jsonContent(z.object({ url: z.string().url() }), "Returns the download url for the release"),
	},
});

/**
 * Route Configuration for Deleting a Deployment Release
 * Deletes a release by deployment key and label
 *
 * Features:
 * - Release deletion
 * - Cache invalidation
 * - Permission validation
 *
 * Endpoint: DELETE /release
 * Authentication: Required (Admin only)
 *
 * @throws {404} When app or deployment is not found
 * @throws {403} When user lacks required permissions
 * @returns {Object} Success message confirming release deleted
 */
const DeleteReleaseRoute = createRoute({
	tags,
	path: "/release",
	method: "delete",
	description: "Deletes a release by deployment key and label",
	request: { query: ReleaseDetailsQuerySchema },
	responses: {
		...APP_NOT_FOUND_RESPONSE,
		...PERMISSION_ERROR_RESPONSE,
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(ReleaseDetailsQuerySchema),
			"Invalid query parameters",
		),
		[HttpStatusCodes.OK]: jsonContent(createMessageObjectSchema(STRINGS.RELEASE_DELETED), "Returns success message"),
	},
});

/**
 * Release Management Router Implementation
 * Combines all release management routes with their handlers
 *
 * Features:
 * - Release lifecycle management
 * - Version control
 * - Deployment coordination
 * - Release deletion
 *
 * Security:
 * - Permission-based access control
 * - Version validation
 * - Rollout safety
 *
 * @throws {401} When authentication fails
 * @throws {403} When permission check fails
 * @throws {404} When app/deployment not found
 * @throws {409} When operation conflicts
 */
const ReleaseRouter = createRouter()
	.openapi(PostReleaseVerifyRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName, platform } = c.req.valid("query");
		const { packageInfo } = c.req.valid("json");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		const deployment = await storage.codepush.getDeploymentForAppIdAndPlatform(
			collaboratorApp.appId,
			platform,
			deploymentName,
		);

		if (!deployment) {
			return c.text(STRINGS.DEPLOYMENT.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		if (deployment.name === DEFAULT_CODEPUSH_DEPLOYMENT_NAMES.PRODUCTION) {
			storage.codepush.throwIfInvalidPermissions(collaboratorApp, Permission.OWNER);
		}

		// Unverified releases
		const unverifiedReleaseHistory = await storage.codepush.getReleaseHistoryByDeploymentKey(deployment.key);
		const verifiedReleaseHistory = unverifiedReleaseHistory.filter((release) => release.isVerified);

		const latestRelease = verifiedReleaseHistory.at(0);

		if (latestRelease && isUnfinishedRollout(latestRelease.rollout) && !latestRelease.isDisabled) {
			return c.text(STRINGS.APP_PACKAGE_ROLLOUT_CONFLICT, HttpStatusCodes.CONFLICT);
		}

		const latestPackageHashWithSameAppVersion = getLastPackageHashWithSameAppVersion(
			verifiedReleaseHistory,
			packageInfo.appVersion,
		);

		if (packageInfo.packageHash === latestPackageHashWithSameAppVersion) {
			return c.text(STRINGS.APP_PACKAGE_IDENTICAL, HttpStatusCodes.CONFLICT);
		}

		const nextLabel = storage.codepush.getNextLabel(unverifiedReleaseHistory);
		const nextReleaseBlobId = storage.codepush.generateCodePushObjectKey({
			nextLabel,
			appName,
			platform: platform,
			deploymentName,
			packageHash: packageInfo.packageHash,
		});

		const response = await storage.codepush.preCommitRelease({
			...packageInfo,

			label: nextLabel,
			blobId: nextReleaseBlobId,
			releaseMethod: ReleaseMethod.UPLOAD,
			deploymentId: deployment.key,
			releasedByUserId: userId,
		});

		return c.json({ verified: response }, HttpStatusCodes.OK);
	})
	.openapi(PostReleaseVerifiedRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName, platform } = c.req.valid("query");
		const { releaseId } = c.req.valid("json");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		const deployment = await storage.codepush.getDeploymentForAppIdAndPlatform(
			collaboratorApp.appId,
			platform,
			deploymentName,
		);

		if (!deployment) {
			return c.text(STRINGS.DEPLOYMENT.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		if (deployment.name === DEFAULT_CODEPUSH_DEPLOYMENT_NAMES.PRODUCTION) {
			storage.codepush.throwIfInvalidPermissions(collaboratorApp, Permission.OWNER);
		}

		const committedRelease = await storage.codepush.verifyReleaseById(deployment.key, releaseId);

		await invalidateCachedPackage(deployment.key, c);

		return c.json({ release: committedRelease }, HttpStatusCodes.OK);
	})
	.openapi(GetReleaseDetailsRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName, platform, label } = c.req.valid("query");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		const deployment = await storage.codepush.getDeploymentForAppIdAndPlatform(
			collaboratorApp.appId,
			platform,
			deploymentName,
		);

		const release = await storage.codepush.getReleaseByDeploymentKeyAndLabel(deployment.key, label);

		return c.json({ release }, HttpStatusCodes.OK);
	})
	.openapi(PatchReleaseDetailsRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName, platform } = c.req.valid("query");
		const { packageInfo } = c.req.valid("json");

		let updateRelease = false;

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		const deployment = await storage.codepush.getDeploymentForAppIdAndPlatform(
			collaboratorApp.appId,
			platform,
			deploymentName,
		);

		if (deployment.name === DEFAULT_CODEPUSH_DEPLOYMENT_NAMES.PRODUCTION) {
			storage.codepush.throwIfInvalidPermissions(collaboratorApp, Permission.OWNER);
		}

		const verifiedReleaseHistory = await storage.codepush.getVerifiedReleaseHistoryByDeploymentKey(deployment.key);

		if (!verifiedReleaseHistory.length) {
			return c.text("Deployment has no releases.", HttpStatusCodes.NOT_FOUND);
		}

		const releaseToUpdate = packageInfo.label
			? getReleaseFromLabel(verifiedReleaseHistory, packageInfo.label)
			: verifiedReleaseHistory[0];

		if (!releaseToUpdate) {
			return c.text("Release not found for given label.", HttpStatusCodes.NOT_FOUND);
		}

		if (packageInfo.isDisabled !== undefined && packageInfo.isDisabled !== null) {
			if (releaseToUpdate.isDisabled !== packageInfo.isDisabled) {
				releaseToUpdate.isDisabled = packageInfo.isDisabled;
				updateRelease = true;
			}
		}

		if (packageInfo.isMandatory !== undefined && packageInfo.isMandatory !== null) {
			if (releaseToUpdate.isMandatory !== packageInfo.isMandatory) {
				releaseToUpdate.isMandatory = packageInfo.isMandatory;
				updateRelease = true;
			}
		}

		if (packageInfo.description && releaseToUpdate.description !== packageInfo.description) {
			releaseToUpdate.description = packageInfo.description;
			updateRelease = true;
		}

		if (packageInfo.rollout) {
			// let errorMessage = "";

			// // if null
			// if (!isUnfinishedRollout(releaseToUpdate.rollout)) {
			// 	errorMessage = "Cannot update rollout value for a completed rollout release.";
			// } else if (Number(releaseToUpdate.rollout) > packageInfo.rollout) {
			// 	errorMessage = `Rollout value must be greater than "${releaseToUpdate.rollout}", the existing value.`;
			// }

			// if (errorMessage) {
			// 	return c.text(errorMessage, HttpStatusCodes.CONFLICT);
			// }

			if (releaseToUpdate.rollout !== packageInfo.rollout) {
				releaseToUpdate.rollout = packageInfo.rollout === 100 ? null : Number(packageInfo.rollout);
				updateRelease = true;
			}
		}

		if (packageInfo.appVersion && releaseToUpdate.appVersion !== packageInfo.appVersion) {
			releaseToUpdate.appVersion = packageInfo.appVersion;
			updateRelease = true;
		}

		if (updateRelease) {
			await storage.codepush.updateReleaseHistory({
				id: releaseToUpdate.id,
				rollout: releaseToUpdate.rollout,
				description: releaseToUpdate.description,
				appVersion: releaseToUpdate.appVersion,
				isDisabled: releaseToUpdate.isDisabled,
				isMandatory: releaseToUpdate.isMandatory,
			});

			await invalidateCachedPackage(deployment.key, c);

			return c.json({ message: "Successfully updated release" }, HttpStatusCodes.OK);
		}

		return c.json(HttpStatusCodes.NOT_MODIFIED);
	})
	.openapi(PromoteReleaseRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName, platform } = c.req.valid("query");
		const { packageInfo, targetDeployment } = c.req.valid("json");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		const sourceDeployment = await storage.codepush.getDeploymentForAppIdAndPlatform(
			collaboratorApp.appId,
			platform,
			deploymentName,
		);
		const destinationDeployment = await storage.codepush.getDeploymentForAppIdAndPlatform(
			collaboratorApp.appId,
			platform,
			targetDeployment,
		);

		if (destinationDeployment.name === DEFAULT_CODEPUSH_DEPLOYMENT_NAMES.PRODUCTION) {
			storage.codepush.throwIfInvalidPermissions(collaboratorApp, Permission.OWNER);
		}

		const sourceDeploymentVerifiedReleaseHistory = await storage.codepush.getVerifiedReleaseHistoryByDeploymentKey(
			sourceDeployment.key,
		);
		const destDeploymentReleaseHistory = await storage.codepush.getReleaseHistoryByDeploymentKey(
			destinationDeployment.key,
		);
		const destDeploymentVerifiedReleaseHistory = destDeploymentReleaseHistory.filter((release) => release.isVerified);

		const sourceRelease = packageInfo.label
			? getReleaseFromLabel(sourceDeploymentVerifiedReleaseHistory, packageInfo.label)
			: sourceDeploymentVerifiedReleaseHistory[0];

		const destRelease = destDeploymentVerifiedReleaseHistory[0];

		if (!sourceRelease) {
			return c.text("Cannot promote from a deployment with no enabled releases.", HttpStatusCodes.NOT_FOUND);
		}

		if (destRelease && isUnfinishedRollout(destRelease.rollout) && !destRelease.isDisabled) {
			return c.text(
				"Cannot promote to an unfinished rollout release unless it is already disabled.",
				HttpStatusCodes.CONFLICT,
			);
		}

		if (
			sourceRelease.packageHash ===
			getLastPackageHashWithSameAppVersion(destDeploymentVerifiedReleaseHistory, sourceRelease.appVersion)
		) {
			return c.text(
				"The uploaded package was not promoted because it is identical to the contents of the targeted deployment's current release.",
				HttpStatusCodes.CONFLICT,
			);
		}

		const nextDestinationLabel = storage.codepush.getNextLabel(destDeploymentReleaseHistory);
		const nextDestinationBlobId = storage.codepush.generateCodePushObjectKey({
			nextLabel: nextDestinationLabel,
			appName,
			platform: platform,
			deploymentName: destinationDeployment.name,
			packageHash: sourceRelease.packageHash,
		});
		await storage.codepush.copyBlob(sourceRelease.blobId, nextDestinationBlobId);

		await storage.codepush.commitRelease({
			deploymentId: destinationDeployment.key,
			releasedByUserId: userId,

			packageHash: sourceRelease.packageHash,

			label: nextDestinationLabel,
			appVersion: packageInfo.appVersion ?? sourceRelease.appVersion,
			description: packageInfo.description ?? sourceRelease.description,
			isDisabled: packageInfo.isDisabled != null ? !!packageInfo.isDisabled : sourceRelease.isDisabled,
			isMandatory: packageInfo.isMandatory != null ? !!packageInfo.isMandatory : sourceRelease.isMandatory,
			rollout: packageInfo.rollout,

			size: sourceRelease.size,
			blobId: nextDestinationBlobId,
			isVerified: true,

			releaseMethod: ReleaseMethod.PROMOTE,
			originalLabel: sourceRelease.label,
			originalDeploymentName: sourceDeployment.name,
		});

		await invalidateCachedPackage(destinationDeployment.key, c);

		return c.json(
			{ message: `Successfully Promoted ${sourceRelease.label} Release from ${deploymentName} to ${targetDeployment}` },
			HttpStatusCodes.CREATED,
		);
	})
	.openapi(RollbackReleaseRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName, platform, targetReleaseLabel } = c.req.valid("query");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		const deployment = await storage.codepush.getDeploymentForAppIdAndPlatform(
			collaboratorApp.appId,
			platform,
			deploymentName,
		);

		if (deployment.name === DEFAULT_CODEPUSH_DEPLOYMENT_NAMES.PRODUCTION) {
			storage.codepush.throwIfInvalidPermissions(collaboratorApp, Permission.OWNER);
		}

		const releaseHistory = await storage.codepush.getReleaseHistoryByDeploymentKey(deployment.key);
		const verifiedReleaseHistory = releaseHistory.filter((release) => release.isVerified);

		const sourceRelease = verifiedReleaseHistory[0];
		if (!sourceRelease) {
			return c.text(STRINGS.RELEASE.ROLLBACK_NO_RELEASES, HttpStatusCodes.NOT_FOUND);
		}

		let destinationRelease: TCodePushRelease | null = null;

		if (!targetReleaseLabel) {
			destinationRelease = verifiedReleaseHistory[1] ?? null;

			if (!destinationRelease) {
				return c.text(STRINGS.RELEASE.ROLLBACK_NO_RELEASES_TO_ROLLBACK_TO, HttpStatusCodes.NOT_FOUND);
			}
		} else {
			if (targetReleaseLabel === sourceRelease.label) {
				return c.text(STRINGS.RELEASE.ROLLBACK_SAME_LABEL, HttpStatusCodes.CONFLICT);
			}

			destinationRelease =
				verifiedReleaseHistory.find((packageEntry) => packageEntry.label === targetReleaseLabel) ?? null;

			if (!destinationRelease) {
				return c.text(STRINGS.RELEASE.ROLLBACK_LABEL_NOT_FOUND(targetReleaseLabel), HttpStatusCodes.NOT_FOUND);
			}
		}

		if (sourceRelease.appVersion !== destinationRelease.appVersion) {
			return c.text(STRINGS.RELEASE.ROLLBACK_DIFFERENT_APP_VERSION, HttpStatusCodes.CONFLICT);
		}

		if (sourceRelease.packageHash === destinationRelease.packageHash) {
			return c.text(STRINGS.RELEASE.ROLLBACK_SAME_PACKAGE_HASH, HttpStatusCodes.CONFLICT);
		}

		const nextDestinationLabel = storage.codepush.getNextLabel(releaseHistory);
		const nextDestinationBlobId = storage.codepush.generateCodePushObjectKey({
			nextLabel: nextDestinationLabel,
			appName,
			platform: platform,
			deploymentName,
			packageHash: destinationRelease.packageHash,
		});
		await storage.codepush.copyBlob(destinationRelease.blobId, nextDestinationBlobId);

		const committedPackage = await storage.codepush.commitRelease({
			label: nextDestinationLabel,
			deploymentId: deployment.key,
			releasedByUserId: userId,

			appVersion: destinationRelease.appVersion,
			description: destinationRelease.description,
			isDisabled: destinationRelease.isDisabled,
			isMandatory: destinationRelease.isMandatory,
			packageHash: destinationRelease.packageHash,
			originalLabel: destinationRelease.label,

			size: destinationRelease.size,
			blobId: nextDestinationBlobId,
			isVerified: true,

			releaseMethod: ReleaseMethod.ROLLBACK,
		});

		await invalidateCachedPackage(deployment.key, c);

		return c.json(
			{ message: `Successfully Rolled back ${destinationRelease.label} to ${committedPackage.label}` },
			HttpStatusCodes.CREATED,
		);
	})
	.openapi(GetReleaseDownloadUrlRoute, async (c) => {
		const { blobId } = c.req.valid("query");

		const url = getDownloadUrlByKey(blobId);

		return c.json({ url }, HttpStatusCodes.OK);
	})
	.openapi(DeleteReleaseRoute, async (c) => {
		const storage = c.get("storage");
		const userId = c.get("user").id;

		const { appName, deploymentName, platform, label } = c.req.valid("query");

		const collaboratorApp = await storage.codepush.getAppByNameForUserId(userId, appName);

		storage.codepush.throwIfInvalidPermissions(collaboratorApp, Permission.ADMIN);

		const deploymentToDeleteRelease = await storage.codepush.getDeploymentForAppIdAndPlatform(
			collaboratorApp.appId,
			platform,
			deploymentName,
		);

		if (!deploymentToDeleteRelease) {
			return c.text(STRINGS.DEPLOYMENT.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		await storage.codepush.deleteReleaseByDeploymentKeyAndLabel(deploymentToDeleteRelease.key, label);

		await invalidateCachedPackage(deploymentToDeleteRelease.key, c);

		return c.json({ message: STRINGS.RELEASE_DELETED }, HttpStatusCodes.OK);
	});

export { ReleaseRouter };
