/**
 * API client configuration and instance management for CodePush CLI.
 * Provides a configured Hono API client with authentication and version headers.
 *
 * Features:
 * - Automatic header configuration
 * - Authentication token management
 * - Version tracking for CLI and SDK
 * - Dynamic client recreation on credential changes
 *
 * @module api-client
 */

import apiClient from "@rentlydev/rnota-api-client";

import { CODEPUSH_CLI_VERSION, CODEPUSH_SDK_VERSION } from "../config/constants.js";
import { credentialsVault } from "./credentials-vault.js";

/**
 * Creates a new instance of the Hono API client with proper configuration
 * @returns {ReturnType<typeof apiClient.default>} Configured API client instance
 *
 * @example
 * ```typescript
 * const client = createHonoApiClientInstance();
 * const response = await client.api.someEndpoint.$get();
 * ```
 */
function createHonoApiClientInstance() {
	return apiClient.default(credentialsVault.getServerUrl(), {
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			"X-CodePush-SDK-Version": CODEPUSH_SDK_VERSION,
			"X-CodePush-CLI-Version": CODEPUSH_CLI_VERSION,
			Authorization: `Bearer ${credentialsVault.getAccessKey()}`,
		},
	});
}

/**
 * The active Hono API client instance.
 * This instance is automatically recreated when credentials change.
 */
let honoApiClient = createHonoApiClientInstance();

// Recreate client instance when credentials change to ensure valid authentication
credentialsVault.onDidAnyChange(() => {
	honoApiClient = createHonoApiClientInstance();
});

/**
 * Export the configured API client instance.
 * This instance automatically handles:
 * - Authentication headers
 * - Version tracking
 * - Content type negotiation
 * - Server URL configuration
 *
 * @example
 * ```typescript
 * import { honoApiClient } from "./api-client";
 *
 * // Make an authenticated API call
 * const response = await honoApiClient.api.someEndpoint.$get();
 * ```
 */
export { honoApiClient };
