/**
 * String Constants Module
 * Provides centralized string management for messages and responses
 * @module Strings
 */

import { STORAGE_ERROR_STRINGS } from "@rentlydev/rnota-db";

/**
 * Application-wide string constants
 * Includes messages for responses, errors, and notifications
 *
 * Categories:
 * - Status Messages: OK, HEALTHY, etc.
 * - Authentication: UNAUTHORIZED, AUTHENTICATED, etc.
 * - Access Keys: Creation, updates, removal messages
 * - Apps: App management messages
 * - Collaborators: Collaboration management messages
 * - Deployments: Deployment management messages
 * - Package Management: Package-related messages
 *
 * @const {Object}
 *
 * @example
 * ```typescript
 * import { STRINGS } from './utils/strings';
 *
 * // Simple message
 * return c.text(STRINGS.UNAUTHORIZED);
 *
 * // Template message
 * const message = STRINGS.APP_TRANSFERRED('MyApp', 'user@example.com');
 * // => "App MyApp transferred to user@example.com successfully."
 * ```
 */
export const STRINGS = {
	...STORAGE_ERROR_STRINGS,

	// CLI Version Checker
	CLI_VERSION_CHECKER: {
		UPGRADE_REQUIRED: (cliVersion: string, serverVersion: string) =>
			`Your CLI version (${cliVersion}) is older than the latest version (${serverVersion}). Please refer to updating CLI instructions in the Repository's README.md file or run "npm update -g @rentlydev/rnota-cli" to update & continue.`,
	},

	// Status Messages
	OK: "OK",
	HEALTHY: "Healthy",
	NO_RESPONSE: "No response",
	UNAUTHORIZED: "Unauthorized",
	AUTHENTICATED: "Authenticated",
	LOGOUT: "Logged out",
	INTERNAL_SERVER_ERROR: "Internal Server Error",

	// Welcome Messages
	WELCOME_CODEPUSH: "Welcome to CodePush Open API",

	// Deployment Status
	DEPLOY_STATUS_REPORT_BAD_REQUEST: "A deploy status report for a labelled package must contain a valid status.",

	// Access Key Management
	ACCESS_KEY_UPDATED: "Access key updated successfully.",
	ACCESS_KEY_REMOVED: (name: string) => `Access key ${name} removed successfully.`,
	ACCESS_KEYS_CREATED_BY_NOT_FOUND: (createdBy: string) => `Access keys with createdBy ${createdBy} not found`,
	ACCESS_KEYS_CREATED_BY_REMOVED: (name: string) => `Access keys created by ${name} removed successfully.`,
	ACCESS_KEYS_REMOVED: "Access keys removed successfully.",

	// App Management
	APP_NAME_UPDATED: (oldName: string, newName: string) => `App name updated from ${oldName} to ${newName}.`,
	APP_NAME_REMOVED: (name: string) => `App ${name} removed successfully.`,
	APP_TRANSFERRED: (name: string, email: string) => `App ${name} transferred to ${email} successfully.`,

	// Collaborator Management
	COLLABORATOR_ADDED: (email: string, appName: string) => `Collaborator ${email} added successfully to ${appName}.`,
	COLLABORATOR_REMOVED: (email: string, appName: string) =>
		`Collaborator ${email} removed successfully from ${appName}.`,

	// Deployment Management
	DEPLOYMENT_REMOVED: (name: string, appName: string) => `Deployment ${name} removed successfully from ${appName}.`,
	DEPLOYMENT_UPDATED: "Deployment updated successfully.",
	DEPLOYMENT_HISTORY_CLEARED: (name: string, appName: string, platform: string) =>
		`Deployment history & Packages cleared for ${name} in ${appName} for ${platform}.`,
	DEPLOYMENT_KEY_ROLLED: (name: string, platform: string) => `${name} key in ${platform} rolled.`,
	DEPLOYMENT_KEY_SET: (name: string, platform: string) => `${name} key in ${platform} updated.`,

	// Release Management
	RELEASE_DELETED: "Release deleted successfully.",

	// Package Management
	APP_PACKAGE_IDENTICAL:
		"The uploaded package was not released because it is identical to the contents of the specified deployment's current release.",
	APP_PACKAGE_ROLLOUT_CONFLICT:
		"Please update the previous release to 100% rollout or consider disabling it before releasing a new package.",
} as const;
