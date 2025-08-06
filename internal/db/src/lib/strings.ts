/**
 * Error Message String Constants
 * This module provides a centralized location for all error messages used in the application.
 * Messages are organized by entity type and operation for consistent error reporting.
 */

import type { Permission } from "../schema";

const LOGIN_STRING = `Please run "rnota login", select your environment [Production/Staging], and paste your access key to authenticate.`;

/**
 * Storage Error Messages
 * Comprehensive collection of all error messages used in storage operations.
 * Messages are organized hierarchically by entity type (User, App, etc.)
 * and then by operation type (GET, ADD, UPDATE, etc.) for easy maintenance
 * and consistent error reporting across the application.
 */
export const STORAGE_ERROR_STRINGS = {
	/**
	 * Permission-related error messages
	 * Handles access control and authorization errors
	 */
	PERMISSION: {
		/**
		 * Error when user lacks required permission level
		 * @param requiredPermission - The permission level required for the operation
		 * @returns Formatted error message with the required permission level
		 */
		FORBIDDEN: (requiredPermission: Permission) => `This action requires ${requiredPermission} permissions on the app!`,
	},

	/**
	 * User-related error messages
	 * Handles user management and authentication errors
	 */
	USER: {
		/** Error when user is not found in the system */
		NOT_FOUND: "User not found",
		/**
		 * Operation-specific failure messages for user operations
		 * Provides specific context for different types of user operation failures
		 */
		FAILED: {
			/** Error when retrieving all users fails */
			GET_ALL: "Failed to get all users",
			/** Error when retrieving a specific user by ID fails */
			GET_BY_ID: "Failed to get user by id",
			/** Error when retrieving a user by email fails */
			GET_BY_EMAIL: "Failed to get user by email",
			/** Error when retrieving a user by access token fails */
			GET_BY_ACCESS_TOKEN: "Failed to get user by access key token",
		},
	},

	/**
	 * Access Key-related error messages
	 * Handles API key and authentication token errors
	 */
	ACCESS_KEY: {
		/**
		 * Error when attempting to create an access key with a name that already exists
		 * @param name - The conflicting access key name
		 * @returns Formatted error message with the conflicting name
		 */
		CONFLICT_NAME: (name: string) => `The Access key ${name} already exists`,
		/** Error when the specified access key cannot be found */
		NOT_FOUND: `Access key not found. ${LOGIN_STRING}`,
		/** Error when attempting to use an expired access key */
		EXPIRED: `Access key has expired. ${LOGIN_STRING}`,
		/**
		 * Operation-specific failure messages for access key operations
		 * Provides specific context for different types of access key operation failures
		 */
		FAILED: {
			/** Error when adding a new access key fails */
			ADD: "Failed to add access key",
			/** Error when updating an existing access key fails */
			UPDATE: "Failed to update access key",
			/** Error when removing an access key fails */
			REMOVE: "Failed to remove access key",
			/** Error when retrieving access keys for a user fails */
			GET_BY_USER: "Failed to get access keys by user",
			/** Error when retrieving an access key by name fails */
			GET_BY_NAME: "Failed to get access key by name",
		},
	},

	/**
	 * Application-related error messages
	 * Handles application management and configuration errors
	 */
	APP: {
		/**
		 * Error when attempting to create an app with a name that already exists
		 * @param name - The conflicting application name
		 * @returns Formatted error message with the conflicting name
		 */
		CONFLICT_NAME: (name: string) => `The App ${name} already exists`,
		/**
		 * Not found error messages for application operations
		 * Distinguishes between single and multiple app not found scenarios
		 */
		NOT_FOUND: {
			/** Error when a specific application is not found */
			SINGLE: "App not found",
			/** Error when no applications are found for a query */
			MULTIPLE: "No apps found",
		},
		/**
		 * Operation-specific failure messages for application operations
		 * Provides specific context for different types of application operation failures
		 */
		FAILED: {
			/** Error when retrieving all apps for a user fails */
			GET_ALL: "Failed to get all apps for user",
			/** Error when retrieving a specific app by ID fails */
			GET_BY_ID: "Failed to get app by id",
			/** Error when retrieving an app by name fails */
			GET_BY_NAME: "Failed to get app by name",
			/** Error when adding a new application fails */
			ADD: "Failed to add app",
			/** Error when removing an application fails */
			REMOVE: "Failed to remove app",
			/** Error when updating an application fails */
			UPDATE: "Failed to update app",
		},
	},

	/**
	 * Collaborator-related error messages
	 * Handles team member and access management errors
	 */
	COLLABORATOR: {
		/** Error when attempting to add a collaborator that already exists */
		ALREADY_EXISTS: "Collaborator already exists",
		/** Error when attempting to remove the owner from app collaborators */
		REMOVE_OWNER: "Cannot remove the owner of the app from the collaborators",
		/**
		 * Not found error messages for collaborator operations
		 * Distinguishes between single and multiple collaborator not found scenarios
		 */
		NOT_FOUND: {
			/** Error when a specific collaborator is not found */
			SINGLE: "Collaborator not found",
			/** Error when no collaborators are found for a query */
			MULTIPLE: "No collaborators found",
		},
		/**
		 * Operation-specific failure messages for collaborator operations
		 * Provides specific context for different types of collaborator operation failures
		 */
		FAILED: {
			/** Error when retrieving collaborators for an app fails */
			GET_BY_APP_ID: "Failed to get collaborators by app id",
			/** Error when adding a new collaborator fails */
			ADD: "Failed to add collaborator",
			/** Error when adding an owner collaborator fails */
			ADD_OWNER: "Failed to add collaborator as owner",
			/** Error when removing a collaborator fails */
			REMOVE: "Failed to remove collaborator",
			/** Error when updating collaborator permissions fails */
			UPDATE: "Failed to update collaborator permission",
		},
	},

	/**
	 * Deployment-related error messages
	 * Handles deployment environment and configuration errors
	 */
	DEPLOYMENT: {
		/**
		 * Error when attempting to create a deployment with a name that already exists
		 * @param name - The conflicting deployment name
		 * @returns Formatted error message with the conflicting name
		 */
		CONFLICT_NAME: (name: string) => `A Deployment ${name} already exists`,
		/**
		 * Error when attempting to create a deployment with a key that already exists
		 * @param key - The conflicting deployment key
		 * @returns Formatted error message with the conflicting key
		 */
		CONFLICT_KEY: (key: string) => `A Deployment key ${key} already exists`,
		/**
		 * Not found error messages for deployment operations
		 * Distinguishes between single and multiple deployment not found scenarios
		 */
		NOT_FOUND: {
			/** Error when a specific deployment is not found */
			SINGLE: "Deployment not found",
			/** Error when no deployments are found for a query */
			MULTIPLE: "No deployments found",
		},
		/**
		 * Operation-specific failure messages for deployment operations
		 * Provides specific context for different types of deployment operation failures
		 */
		FAILED: {
			/** Error when retrieving a deployment by ID fails */
			GET_BY_ID: "Failed to get deployment by id",
			/** Error when retrieving a deployment by name fails */
			GET_BY_NAME: "Failed to get deployment by name",
			/** Error when retrieving a deployment by key fails */
			GET_BY_KEY: "Failed to get deployment by key",
			/** Error when retrieving deployments for an app fails */
			GET_BY_APP_ID: "Failed to get deployments by app id",
			/** Error when adding a new deployment fails */
			ADD: "Failed to add deployment",
			/** Error when removing a deployment fails */
			REMOVE: "Failed to remove deployment",
			/** Error when updating a deployment fails */
			UPDATE: "Failed to update deployment",
			/** Error when attempting to remove a deployment that has existing releases */
			RELEASES_EXIST: "Cannot remove deployment because releases exist",
		},
	},

	/**
	 * Release-related error messages
	 * Handles release management, rollback, and package errors
	 */
	RELEASE: {
		/**
		 * Rollback-specific error messages
		 * Comprehensive set of errors for handling release rollback scenarios
		 */
		ROLLBACK_NO_RELEASES: "Cannot perform rollback because there are no releases on this deployment.",
		ROLLBACK_NO_RELEASES_TO_ROLLBACK_TO: "Cannot perform rollback because there are no prior releases to rollback to.",
		ROLLBACK_SAME_LABEL: "Cannot perform rollback because the target release is the current release.",
		ROLLBACK_DIFFERENT_APP_VERSION:
			"Cannot perform rollback to a different app version. Please perform a new release with the desired replacement package.",
		ROLLBACK_SAME_PACKAGE_HASH: "Cannot perform rollback because the target release is the same as the source release.",
		/**
		 * Error when attempting to rollback to a non-existent release
		 * @param targetLabel - The label of the target release that wasn't found
		 * @returns Formatted error message with the target label
		 */
		ROLLBACK_LABEL_NOT_FOUND: (targetLabel: string) =>
			`Cannot perform rollback because the target release (${targetLabel}) could not be found in the deployment history.`,
		/**
		 * Not found error messages for release operations
		 * Distinguishes between single and multiple release not found scenarios
		 */
		NOT_FOUND: {
			/** Error when a specific release is not found */
			SINGLE: "Release not found",
			/** Error when no releases are found for a query */
			MULTIPLE: "No releases found",
			/** Error when no releases are found for a query */
			STATS: "No releases found",
		},
		/**
		 * Operation-specific failure messages for release operations
		 * Provides specific context for different types of release operation failures
		 */
		FAILED: {
			/** Error when retrieving a release by deployment ID fails */
			GET_BY_DEPLOYMENT_ID: "Failed to get release by deployment id",
			/** Error when retrieving releases by deployment key fails */
			GET_BY_DEPLOYMENT_KEY: "Failed to get releases by deployment key",
			/** Error when adding a new release fails */
			ADD: "Failed to add release",
			/** Error when adding a blob to storage fails */
			ADD_BLOB: "Failed to add blob",
			/** Error when copying a blob in storage fails */
			COPY_BLOB: "Failed to copy blob",
			/** Error when removing a release fails */
			REMOVE: "Failed to remove release",
			/** Error when removing a blob from storage fails */
			REMOVE_BLOB: "Failed to remove blob",
			/** Error when updating a release fails */
			UPDATE: "Failed to update release",
			/** Error when updating the rollout of a previous release fails */
			UPDATE_ROLLOUT: "Failed to update previous release rollout",
			/** Error when generating a signed URL fails */
			GENERATE_SIGNED_URL: "Failed to generate signed url",
			/** Error when verifying a release fails */
			VERIFY: "Failed to verify release",
			/** Error when retrieving a release by path fails */
			GET_BY_PATH: "Failed to get release by path",
			/** Error when retrieving release statistics fails */
			GET_STATS: "Failed to get release statistics",
		},
	},
};
