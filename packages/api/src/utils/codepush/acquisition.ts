/**
 * CodePush Acquisition Module
 *
 * This module handles the core update acquisition logic for CodePush, determining
 * which updates should be delivered to clients based on their current version,
 * rollout status, and various other factors.
 *
 * Features:
 * - Semantic version compatibility checking
 * - Rollout management
 * - Mandatory update handling
 * - Binary version compatibility
 * - Update package caching
 * - Companion app support
 *
 * Mandatory Update Behavior:
 * If a mandatory update exists between the user's current version and the latest version,
 * any newer update will be converted to mandatory. This ensures that users can't skip
 * mandatory updates by updating directly to a later optional update.
 */

import * as semver from "semver";

import { getDownloadUrlByKey } from "@rentlydev/rnota-aws";
import type { TCodePushRelease } from "@rentlydev/rnota-db";

import type {
	UpdateCheckReleaseCacheResponseType,
	UpdateCheckReleaseResponseType,
	UpdateCheckReleaseType,
} from "@rentlydev/rnota-redis/types";

import { isUnfinishedRollout } from "@/api/utils/codepush/rollout-selector";
import type { UpdateCheckRequestQueryType } from "../../schemas/update-check";

/**
 * Retrieves and processes update package information for a client request
 *
 * This function determines what update (if any) should be provided to a client,
 * handling various scenarios including:
 * - Rollout management (partial vs. full rollouts)
 * - Cache response formatting
 * - Original vs. rollout package selection
 *
 * The function considers both the current state of rollouts and the client's
 * eligibility for updates when constructing the response.
 *
 * @param {TCodePushRelease[]} releaseHistory - Array of available releases, newest first
 * @param {UpdateCheckRequestQueryType} request - Client update check request parameters
 * @returns {UpdateCheckReleaseCacheResponseType} Processed update information
 *
 * @example
 * ```typescript
 * const releases = await getReleasesFromDB();
 * const clientRequest = {
 *   app_version: "1.0.0",
 *   package_hash: "abc123",
 *   is_companion: false
 * };
 *
 * const updateInfo = getUpdatePackageInfo(releases, clientRequest);
 * // Returns:
 * // {
 * //   originalPackage: { ... },  // Base update package
 * //   rolloutPackage?: { ... },  // Optional rollout-specific package
 * //   rollout?: number          // Optional rollout percentage
 * // }
 * ```
 */
export function getUpdatePackageInfo(
	releaseHistory: TCodePushRelease[],
	request: UpdateCheckRequestQueryType,
): UpdateCheckReleaseCacheResponseType {
	const updatePackage: UpdateCheckReleaseResponseType = getUpdatePackage(
		releaseHistory,
		request,
		/*ignoreUnFinishedRolloutPackages*/ false,
	);

	let cacheResponse: UpdateCheckReleaseCacheResponseType;

	if (isUnfinishedRollout(updatePackage.rollout)) {
		const origUpdatePackage: UpdateCheckReleaseResponseType = getUpdatePackage(
			releaseHistory,
			request,
			/*ignoreUnFinishedRolloutPackages*/ true,
		);

		cacheResponse = {
			originalPackage: origUpdatePackage.response,
			rolloutPackage: updatePackage.response,
			rollout: updatePackage.rollout,
		};
	} else {
		cacheResponse = { originalPackage: updatePackage.response };
	}

	return cacheResponse;
}

/**
 * Determines the appropriate update package for a client
 *
 * This function implements the core update selection logic, analyzing the release
 * history to find the most appropriate update for a client based on multiple factors:
 *
 * Selection Criteria:
 * - Semantic version compatibility
 * - Package enablement status
 * - Rollout status
 * - Mandatory update requirements (dynamically determined)
 * - Binary version compatibility
 * - Companion app status
 *
 * Special Cases:
 * - Empty release history triggers binary version fallback
 * - Disabled packages are skipped
 * - Version incompatibility may trigger app store update recommendation
 * - Companion apps bypass version compatibility checks
 *
 * Mandatory Update Rules:
 * 1. If there is any mandatory update between client's current version and latest version,
 *    the latest version becomes mandatory
 * 2. If client is already on or past all mandatory updates, latest version stays optional
 * 3. Original mandatory flag of a release is preserved in storage, only modified during
 *    update check responses
 *
 * @param {TCodePushRelease[]} releaseHistory - Available releases, ordered newest to oldest
 * @param {UpdateCheckRequestQueryType} request - Client update check parameters
 * @param {boolean} [ignoreUnFinishedRolloutPackages] - Whether to skip packages in partial rollout
 * @returns {UpdateCheckReleaseResponseType} Selected update package information
 *
 * @example
 * ```typescript
 * const update = getUpdatePackage(
 *   releases,
 *   {
 *     app_version: "1.0.0",
 *     package_hash: "abc123",
 *     is_companion: false,
 *     label: "v1"
 *   },
 *   false
 * );
 *
 * // Returns:
 * // {
 * //   response: {
 * //     isAvailable: true,
 * //     isMandatory: false,
 * //     appVersion: "1.0.0",
 * //     packageHash: "def456",
 * //     downloadURL: "https://...",
 * //     ...
 * //   },
 * //   rollout: 50  // Optional rollout percentage
 * // }
 * ```
 *
 * @remarks
 * The function uses a sophisticated scanning algorithm to find the most appropriate
 * update while considering various factors that might affect update eligibility.
 * It handles edge cases such as missing labels/hashes and maintains backward
 * compatibility with older client plugins.
 */
function getUpdatePackage(
	releaseHistory: TCodePushRelease[],
	request: UpdateCheckRequestQueryType,
	ignoreUnFinishedRolloutPackages?: boolean,
): UpdateCheckReleaseResponseType {
	const updateDetails = {
		downloadURL: "",
		description: "",
		isAvailable: false,
		isMandatory: false,
		appVersion: "",
		packageHash: "",
		label: "",
		packageSize: 0,
		updateAppVersion: false,
	} as UpdateCheckReleaseType;

	if (!releaseHistory || releaseHistory.length === 0) {
		updateDetails.shouldRunBinaryVersion = true;
		return { response: updateDetails };
	}

	let foundRequestPackageInHistory = false;
	let latestSatisfyingEnabledPackage: TCodePushRelease | undefined = undefined;
	let latestEnabledPackage: TCodePushRelease | undefined = undefined;
	let rollout: number | null | undefined = null;
	let shouldMakeUpdateMandatory = false;
	const isBinaryRequest = !request.label && !request.package_hash; // When Client freshly installs the app, it doesn't send any label and package_hash

	// Scan the package history from newest to oldest to find the most recent release
	for (const packageEntry of releaseHistory) {
		// Check if this packageEntry is the same as the one that the client is running.
		// Note that older client plugin versions do not send the release label. If the
		// label is supplied, we use label comparison, since developers can release the
		// same update twice. Otherwise, we fall back to hash comparison.
		// If request is missing both label and hash we take the latest package
		// as we cannot determine which one the client is running (freshly installed app)
		const isCurrentPackage =
			// label is present and matches
			(request.label && packageEntry.label === request.label) ||
			// package_hash is present and matches
			(!request.label && packageEntry.packageHash === request.package_hash);

		foundRequestPackageInHistory = foundRequestPackageInHistory || isCurrentPackage;

		// If the package is disabled or is an unfinished rollout package, skip it.
		if (packageEntry.isDisabled || (ignoreUnFinishedRolloutPackages && isUnfinishedRollout(packageEntry.rollout))) {
			continue;
		}

		latestEnabledPackage = latestEnabledPackage ?? packageEntry;

		// If the client is not a companion & it doesn't satisfy the package version range , skip it.
		if (!request.is_companion && !semver.satisfies(request.app_version, packageEntry.appVersion)) {
			continue;
		}

		latestSatisfyingEnabledPackage = latestSatisfyingEnabledPackage ?? packageEntry;

		// If this release is mandatory, newer than the one the client is running,
		// and satisfies the client's binary version, we should also make the
		// latest update mandatory.
		if (packageEntry.isMandatory && (isBinaryRequest || !foundRequestPackageInHistory)) {
			// 1. If the client is freshly installed and the package is mandatory, we can stop the scan.
			// 2. If we haven't found the current package yet and this package is mandatory,
			// 		it means there's a mandatory update between current and latest
			// We got all the information we need from the history, so stop the scan.
			shouldMakeUpdateMandatory = true;
			break;
		}

		if (foundRequestPackageInHistory) {
			// Any mandatory updates older than this have already been satisfied.
			// All the releases further down the history are older than the one the
			// client is running, so we can stop the scan.
			break;
		}
	}

	// If none of the enabled releases have a range that satisfies the client's binary
	// version, tell the client to run the version bundled in the binary.
	updateDetails.shouldRunBinaryVersion = !latestSatisfyingEnabledPackage;

	if (!latestEnabledPackage) {
		// None of the releases in this deployment are enabled, so return no update.
		return { response: updateDetails };
	}

	if (updateDetails.shouldRunBinaryVersion || latestSatisfyingEnabledPackage?.packageHash === request.package_hash) {
		// Either none of the releases in this deployment satisfy the client's binary
		// version, or the client already has the latest relevant update, so return no
		// update, but also tell the client what appVersion the latest release is on and
		// whether they should trigger a store update.
		if (semver.gtr(request.app_version, latestEnabledPackage.appVersion)) {
			updateDetails.appVersion = latestEnabledPackage.appVersion;
		} else if (!semver.satisfies(request.app_version, latestEnabledPackage.appVersion)) {
			updateDetails.updateAppVersion = true;
			updateDetails.appVersion = latestEnabledPackage.appVersion;
		}

		return { response: updateDetails };
	}

	updateDetails.isAvailable = true;
	updateDetails.downloadURL = getDownloadUrlByKey(latestSatisfyingEnabledPackage?.blobId!);
	updateDetails.packageSize = latestSatisfyingEnabledPackage?.size;
	updateDetails.description = latestSatisfyingEnabledPackage?.description!;
	// If there was a mandatory update between current version and latest version,
	// make the latest version mandatory, otherwise keep its original mandatory status
	updateDetails.isMandatory = shouldMakeUpdateMandatory || latestSatisfyingEnabledPackage?.isMandatory;
	updateDetails.label = latestSatisfyingEnabledPackage?.label;
	updateDetails.packageHash = latestSatisfyingEnabledPackage?.packageHash;
	rollout = latestSatisfyingEnabledPackage?.rollout;

	// Old plugins will only work with updates with app versions that are valid semver
	// (i.e. not a range), so we return the same version string as the requested one
	updateDetails.appVersion = request.app_version;

	return { response: updateDetails, rollout: rollout };
}
