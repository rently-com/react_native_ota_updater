/**
 * Rollout Selection Module
 *
 * This module provides utilities for managing gradual rollouts of CodePush updates.
 * It implements a deterministic selection algorithm that consistently determines
 * whether a specific client should receive an update based on their ID and the
 * release information.
 *
 * Features:
 * - Deterministic client selection
 * - Percentage-based rollout control
 * - Consistent hash generation
 * - Release tag support
 * - Rollout status checking
 */

/**
 * Delimiter used to separate client ID and release tag in hash generation
 * @constant {string}
 * @private
 */
const DELIMITER = "-";

/**
 * Generates a deterministic hash code for a given string input
 *
 * This function implements a simple but effective hash algorithm that:
 * - Processes each character in the input string
 * - Uses bitwise operations for efficient computation
 * - Produces consistent results for the same input
 * - Distributes hash values relatively evenly
 *
 * The algorithm uses a left shift and subtraction approach to generate
 * a hash value that can be used for deterministic selection.
 *
 * @param {string} input - The string to hash
 * @returns {number} A numeric hash code
 *
 * @example
 * ```typescript
 * const hash = getHashCode("user123-v1.0.0");
 * // Returns a consistent numeric value for the same input
 * ```
 *
 * @private
 */
function getHashCode(input: string): number {
	let hash = 0;

	if (input.length === 0) {
		return hash;
	}

	for (let i = 0; i < input.length; i++) {
		const chr = input.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
	}

	return hash;
}

/**
 * Determines if a client should receive an update based on rollout settings
 *
 * This function uses a deterministic algorithm to decide whether a specific client
 * should receive an update during a gradual rollout. The decision is based on:
 * - Client ID (for consistent per-client selection)
 * - Rollout percentage (controls the size of the rollout)
 * - Release tag (ensures different releases have different selection patterns)
 *
 * The selection is deterministic, meaning:
 * - The same client will always get the same decision for the same release
 * - Different releases may select different clients due to the release tag
 * - The distribution of selected clients approximates the rollout percentage
 *
 * @param {string} clientId - Unique identifier for the client
 * @param {number | null | undefined} rollout - Percentage of clients to include (1-100)
 * @param {string} releaseTag - Identifier for the release
 * @returns {boolean} True if the client should receive the update
 *
 * @example
 * ```typescript
 * // Check if a client should get the update
 * const shouldUpdate = isSelectedForRollout(
 *   "device-123",
 *   25, // 25% rollout
 *   "v1"
 * );
 *
 * // Full rollout (always returns true)
 * const fullRollout = isSelectedForRollout(
 *   "device-123",
 *   null,
 *   "v1"
 * );
 * ```
 */
export function isSelectedForRollout(
	clientId: string,
	rollout: number | null | undefined,
	releaseTag: string,
): boolean {
	if (!rollout) return true;

	const identifier = `${clientId}${DELIMITER}${releaseTag}`;
	const hashValue: number = getHashCode(identifier);

	return Math.abs(hashValue) % 100 < rollout;
}

/**
 * Checks if a rollout is incomplete (not at 100%)
 *
 * This function determines if a rollout is still in progress by checking if:
 * - The rollout value is a number (not null/undefined)
 * - The rollout percentage is less than 100%
 *
 * @param {unknown} rollout - The rollout value to check
 * @returns {boolean} True if the rollout is incomplete
 *
 * @example
 * ```typescript
 * // Incomplete rollout
 * isUnfinishedRollout(25); // true
 *
 * // Complete rollout
 * isUnfinishedRollout(100); // false
 *
 * // Invalid rollout values
 * isUnfinishedRollout(null); // false
 * isUnfinishedRollout("50"); // false
 * ```
 */
export function isUnfinishedRollout(rollout: unknown): boolean {
	return typeof rollout === "number" && rollout !== 100;
}
