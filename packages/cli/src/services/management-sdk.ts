import os from "node:os";
import { honoApiClient } from "./api-client.js";
import { CodePushManager } from "./codepush-sdk.js";
import { credentialsVault } from "./credentials-vault.js";
import { handleError } from "./errors.js";

/**
 * Manages user account operations including authentication, access keys, and CodePush functionality.
 * Provides a centralized interface for all account-related operations in the CLI.
 *
 * Features:
 * - Authentication status checking
 * - User information retrieval
 * - Session management (logout)
 * - Access key management (CRUD operations)
 * - Integration with CodePush services
 *
 * @example
 * ```typescript
 * const accountManager = new AccountManager();
 * const isAuth = await accountManager.isAuthenticated();
 * const userInfo = await accountManager.getUserInfo();
 * ```
 */
export class AccountManager {
	public codepush: CodePushManager;

	constructor() {
		this.codepush = new CodePushManager();
	}

	/**
	 * Retrieves the base URL for the API server from credentials vault
	 * @returns {string} The server base URL
	 */
	public getBaseUrl() {
		return credentialsVault.getServerUrl();
	}

	/**
	 * Checks if the current user is authenticated
	 * @returns {Promise<boolean>} True if authenticated, false otherwise
	 * @throws {Error} If the authentication check fails
	 */
	public async isAuthenticated() {
		const res = await honoApiClient.api.management.authenticated.$get();

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}

	/**
	 * Retrieves information about the currently logged in user
	 * @returns {Promise<Object>} User information object
	 * @throws {Error} If user information cannot be retrieved
	 */
	public async getUserInfo() {
		const res = await honoApiClient.api.management.user.$get();

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.user;
	}

	/**
	 * Logs out the current user by invalidating their CLI access token
	 * @returns {Promise<Object>} Logout operation result
	 * @throws {Error} If logout operation fails
	 */
	public async logout() {
		const res = await honoApiClient.api.management["cli-logout"].$get();

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}

	/**
	 * Creates a new access key for API authentication
	 * @param {string} name - Unique name for the access key
	 * @param {number} [ttl] - Optional time-to-live in seconds for the access key
	 * @returns {Promise<Object>} Created access key details
	 * @throws {Error} If access key creation fails
	 *
	 * @example
	 * ```typescript
	 * // Create 60 days CLI access key
	 * const key = await accountManager.addAccessKey("prod-server");
	 *
	 * // Create 1 hour CLI access key
	 * const tempKey = await accountManager.addAccessKey("temp-key", 3600);
	 * ```
	 */
	public async addAccessKey(name: string, ttl?: number) {
		const res = await honoApiClient.api.management.accessKey.$post({
			json: {
				createdBy: os.hostname(),
				name,
				ttl,
			},
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.accessKey;
	}

	/**
	 * Retrieves all access keys associated with the current account
	 * @returns {Promise<Array>} List of access keys
	 * @throws {Error} If access keys cannot be retrieved
	 */
	public async getAccessKeys() {
		const res = await honoApiClient.api.management.accessKeys.$get();

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.accessKeys;
	}

	/**
	 * Updates an existing access key's properties
	 * @param {string} oldName - Current name of the access key
	 * @param {string} [newName] - Optional new name for the access key
	 * @param {number} [ttl] - Optional new time-to-live in seconds
	 * @returns {Promise<Object>} Update operation result
	 * @throws {Error} If access key update fails
	 *
	 * @example
	 * ```typescript
	 * // Rename an access key
	 * await accountManager.patchAccessKey("old-name", "new-name");
	 *
	 * // Update TTL only
	 * await accountManager.patchAccessKey("key-name", undefined, 3600);
	 * ```
	 */
	public async patchAccessKey(oldName: string, newName?: string, ttl?: number) {
		const res = await honoApiClient.api.management.accessKey.$patch({
			json: { oldName, newName, ttl },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}

	/**
	 * Removes an access key by name
	 * @param {string} name - Name of the access key to remove
	 * @returns {Promise<Object>} Removal operation result
	 * @throws {Error} If access key removal fails
	 */
	public async removeAccessKey(name: string) {
		const res = await honoApiClient.api.management.accessKey.$delete({
			json: { name },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}

	/**
	 * Removes all access keys associated with the current account
	 * @returns {Promise<Object>} Bulk removal operation result
	 * @throws {Error} If access key removal fails
	 *
	 * @example
	 * ```typescript
	 * // Remove all access keys (use with caution)
	 * await accountManager.removeAllAccessKeys();
	 * ```
	 */
	public async removeAllAccessKeys() {
		const res = await honoApiClient.api.management.accessKeys.$delete();

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}

	/**
	 * Removes all access keys created by a specific source
	 * @param {string} createdBy - Source identifier (e.g., hostname) that created the access keys
	 * @returns {Promise<Object>} Bulk removal operation result
	 * @throws {Error} If access key removal fails
	 *
	 * @example
	 * ```typescript
	 * // Remove all access keys created by a specific machine
	 * await accountManager.removeAccessKeyCreatedBy("MacBookPro.local");
	 * ```
	 */
	public async removeAccessKeyCreatedBy(createdBy: string) {
		const res = await honoApiClient.api.management.accessKeys[":createdBy"].$delete({
			param: { createdBy },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}
}

/**
 * Default instance of the AccountManager for convenient access to account management functionality
 * @type {AccountManager}
 *
 * @example
 * ```typescript
 * import { sdk } from "./management-sdk";
 *
 * // Use the default instance
 * const isAuth = await sdk.isAuthenticated();
 * ```
 */
export const sdk = new AccountManager();
