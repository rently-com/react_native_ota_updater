/**
 * CodePush Storage Manager Module
 *
 * This module provides comprehensive management of CodePush-related storage operations,
 * including apps, deployments, releases, and metrics tracking. It handles all database
 * operations related to the CodePush functionality of the application.
 *
 * Key Features:
 * - App management (CRUD operations)
 * - Deployment management
 * - Release management and versioning
 * - Collaborator access control
 * - Package blob storage integration
 * - Metrics tracking
 *
 * @module CodePushStorageManager
 */

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "../client";

import { copyObjectToDestination, deleteObjects, getPresignedPostUrl } from "@rentlydev/rnota-aws";
import type {
	TCodePushApp,
	TCodePushAppWithPlatformsAndDeployments,
	TCodePushCollaboratorWithApp,
	TCodePushCollaboratorWithUser,
	TCodePushDeployment,
	TCodePushPlatform,
	TCodePushRelease,
	TCodePushReleaseStats,
	TCodePushReleaseWithUserAndMetrics,
	TInsertCodePushRelease,
	TPreCommitCodePushRelease,
	TUpdateCodePushRelease,
	TUser,
} from "../schema";
import {
	Permission,
	Platform,
	codepush_app,
	codepush_collaborator,
	codepush_deployment,
	codepush_platform,
	codepush_release,
	user,
} from "../schema";
import { ADMIN_USER_EMAILS, generateId, lower, slugifyName } from "../schema/_table";

import { InternalStorageError, StorageError, queryWrapper } from "../lib/errors";
import { STORAGE_ERROR_STRINGS } from "../lib/strings";
import { MetricsManager } from "./metrics";

/**
 * Default deployment environments available for each platform
 * These are automatically created when a new app is added
 */
export enum DEFAULT_CODEPUSH_DEPLOYMENT_NAMES {
	/** Staging environment for testing releases */
	STAGING = "Staging",
	/** Production environment for live releases */
	PRODUCTION = "Production",
}

/**
 * Response interface for pre-commit package operations
 * Contains the release ID and pre-signed URL for package upload
 */
interface PreCommitPackageResponse {
	/** Unique identifier for the release */
	releaseId: TCodePushRelease["id"];
	/** Pre-signed URL for uploading the package */
	preSignedUrl: string;
}

/**
 * Parameters for generating a CodePush object key
 * Used to create unique identifiers for package storage
 */
interface GenerateCodePushObjectKeyParams {
	/** Next release label in sequence */
	nextLabel: string;
	/** Target platform (iOS/Android) */
	platform: Platform;
	/** Deployment environment name */
	deploymentName: string;
	/** Application name */
	appName: string;
	/** Package content hash */
	packageHash: string;
}

/**
 * CodePush Storage Manager Class
 * Manages all CodePush-related storage operations including apps,
 * deployments, releases, and metrics tracking.
 */
export class CodePushStorageManager {
	/** Maximum number of releases to keep in history per deployment */
	private static MAX_RELEASE_HISTORY_LENGTH = 50;

	/** Metrics tracking manager instance */
	public metrics: MetricsManager;

	/**
	 * Initializes a new CodePush storage manager instance
	 * Creates a metrics manager for tracking deployment statistics
	 */
	constructor() {
		this.metrics = new MetricsManager();
	}

	/**
	 * App Management Methods
	 * These methods handle CRUD operations for CodePush applications
	 */

	/**
	 * Checks if an app name already exists in the database
	 * Performs a case-insensitive check to prevent duplicate names
	 *
	 * @param appName - The name to check for duplication
	 * @throws {StorageError} If an app with the same name exists (409 Conflict)
	 * @throws {InternalStorageError} If the database query fails
	 */
	public async throwIfAppNameDuplicate(appName: TCodePushApp["name"]): Promise<void> {
		const [error, appInDb] = await queryWrapper(
			db.query.codepush_app.findFirst({
				where: eq(lower(codepush_app.name), appName.toLowerCase()),
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.APP.FAILED.GET_BY_NAME, error);
		}

		if (appInDb) {
			throw new StorageError(STORAGE_ERROR_STRINGS.APP.CONFLICT_NAME(appName), HttpStatusCodes.CONFLICT);
		}

		return;
	}

	/**
	 * Validates user permissions for app operations
	 * Checks if the user has sufficient permissions for the requested operation
	 *
	 * @param collaboratorApp - The app and user's collaboration details
	 * @param requiredPermission - The permission level required for the operation
	 * @throws {StorageError} If user lacks required permissions (403 Forbidden)
	 */
	public throwIfInvalidPermissions(
		collaboratorApp: TCodePushCollaboratorWithApp,
		requiredPermission: Permission,
	): void {
		const userPermission = collaboratorApp.permission;

		// Admin has all permissions
		if (userPermission === Permission.ADMIN) {
			return;
		}

		// Check if the user has the required permission level
		const permissionHierarchy = [Permission.COLLABORATOR, Permission.OWNER, Permission.ADMIN];

		const userPermissionIndex = permissionHierarchy.indexOf(userPermission);
		const requiredPermissionIndex = permissionHierarchy.indexOf(requiredPermission);

		// If userPermission is less than requiredPermission, throw an error
		if (userPermissionIndex < requiredPermissionIndex) {
			throw new StorageError(STORAGE_ERROR_STRINGS.PERMISSION.FORBIDDEN(requiredPermission), HttpStatusCodes.FORBIDDEN);
		}

		return;
	}

	/**
	 * Creates a new CodePush application with default platforms and deployments
	 * Also sets up initial collaborator permissions for the creator and admin users
	 *
	 * @param appName - Name of the new application
	 * @param appIcon - URL of the app's icon
	 * @param userId - ID of the user creating the app (will be set as owner)
	 * @returns The newly created app with its platforms and deployments
	 * @throws {StorageError} If app name already exists
	 * @throws {InternalStorageError} If creation fails
	 *
	 * @remarks
	 * This method:
	 * 1. Creates the app entry
	 * 2. Sets up iOS and Android platforms
	 * 3. Creates Staging and Production deployments for each platform
	 * 4. Sets up owner and admin collaborators
	 */
	public async addApp(
		appName: TCodePushApp["name"],
		appIcon: TCodePushApp["iconUrl"],
		userId: TUser["id"],
	): Promise<TCodePushAppWithPlatformsAndDeployments> {
		// Step 1: Check if the app name is a duplicate
		await this.throwIfAppNameDuplicate(appName);

		const [createAppError, appWithPlatformsAndDeployments] = await queryWrapper(
			db.transaction(async (tx) => {
				// Step 2: Fetch Admin Users
				const adminUsers = await tx.query.user.findMany({
					where: inArray(user.email, ADMIN_USER_EMAILS as unknown as string[]),
				});

				// Step 3: Create the app
				const [insertAppResult] = await tx
					.insert(codepush_app)
					.values({
						name: appName,
						iconUrl: appIcon,
					})
					.returning({ appId: codepush_app.id });

				// Step 4: Create the Platforms
				const insertPlatformsResult = await tx
					.insert(codepush_platform)
					.values([
						{
							name: Platform.IOS,
							appId: insertAppResult!.appId,
						},
						{
							name: Platform.ANDROID,
							appId: insertAppResult!.appId,
						},
					])
					.returning();

				// Step 5: Create the Deployments for each Platform
				await tx.transaction(async (tx) => {
					insertPlatformsResult.forEach(async (platform) => {
						const appNameSlug = slugifyName(appName);
						const platformNameSlug = slugifyName(platform.name);

						await tx.insert(codepush_deployment).values([
							{
								name: DEFAULT_CODEPUSH_DEPLOYMENT_NAMES.PRODUCTION,
								platformId: platform.id,
								key: `${appNameSlug}_${platformNameSlug}_${slugifyName(DEFAULT_CODEPUSH_DEPLOYMENT_NAMES.PRODUCTION)}_${generateId(12)}`,
							},
							{
								name: DEFAULT_CODEPUSH_DEPLOYMENT_NAMES.STAGING,
								platformId: platform.id,
								key: `${appNameSlug}_${platformNameSlug}_${slugifyName(DEFAULT_CODEPUSH_DEPLOYMENT_NAMES.STAGING)}_${generateId(12)}`,
							},
						]);
					});
				});

				// Step 6: Create the Collaborator with appropriate permission
				await tx.insert(codepush_collaborator).values({
					permission: Permission.OWNER,
					userId: userId,
					appId: insertAppResult!.appId,
				});

				// Step 7: Add Admin Collaborators
				const adminCollaborators = adminUsers.map((adminUser) => ({
					permission: Permission.ADMIN,
					userId: adminUser.id,
					appId: insertAppResult!.appId,
				}));

				if (adminCollaborators.length !== 0) {
					await tx
						.insert(codepush_collaborator)
						.values(adminCollaborators)
						.onConflictDoUpdate({
							target: [codepush_collaborator.userId, codepush_collaborator.appId],
							set: {
								permission: Permission.ADMIN,
							},
						});
				}

				const result = await tx.query.codepush_app.findFirst({
					where: eq(codepush_app.id, insertAppResult!.appId),
					with: {
						platforms: {
							with: {
								deployments: true,
							},
						},
					},
				});

				if (!result) {
					tx.rollback();
				}

				return result;
			}),
		);

		// Handle error for app creation
		if (createAppError) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.APP.FAILED.ADD, createAppError);
		}

		return appWithPlatformsAndDeployments!;
	}

	/**
	 * Retrieves all apps associated with a user
	 * Returns apps where the user is a collaborator with any permission level
	 *
	 * Features:
	 * - Includes all apps user has access to
	 * - Returns collaboration details and permissions
	 * - Supports admin, owner, and collaborator roles
	 * - Provides app metadata and configuration
	 *
	 * @param userId - ID of the user to get apps for
	 * @returns Array of apps with collaboration details
	 * @throws {InternalStorageError} If retrieval fails
	 */
	public async getAppsForUserId(userId: TUser["id"]): Promise<TCodePushCollaboratorWithApp[]> {
		const [error, collaboratorApps] = await queryWrapper(
			db.query.codepush_collaborator.findMany({
				where: eq(codepush_collaborator.userId, userId),
				with: {
					app: true,
				},
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.APP.FAILED.GET_ALL, error);
		}

		// Sort apps alphabetically by name
		collaboratorApps.sort((a, b) => a.app.name.localeCompare(b.app.name));

		return collaboratorApps;
	}

	/**
	 * Retrieves a specific app by name for a user
	 * Verifies user has access to the requested app
	 *
	 * Features:
	 * - Case-insensitive name matching
	 * - Access permission validation
	 * - Returns app details with collaboration info
	 * - Handles non-existent apps
	 *
	 * @param userId - ID of the user requesting the app
	 * @param appName - Name of the app to retrieve
	 * @returns App object with collaboration details
	 * @throws {StorageError} If app not found or user lacks access
	 * @throws {InternalStorageError} If retrieval fails
	 */
	public async getAppByNameForUserId(
		userId: TUser["id"],
		appName: TCodePushApp["name"],
	): Promise<TCodePushCollaboratorWithApp> {
		const [error, appInDb] = await queryWrapper(
			db.query.codepush_collaborator.findFirst({
				where: and(
					eq(codepush_collaborator.userId, userId),
					eq(
						codepush_collaborator.appId,
						db
							.select({ id: codepush_app.id })
							.from(codepush_app)
							.where(eq(lower(codepush_app.name), appName.toLowerCase())),
					),
				),
				with: {
					app: true,
				},
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.APP.FAILED.GET_BY_NAME, error);
		}

		if (!appInDb) {
			throw new StorageError(STORAGE_ERROR_STRINGS.APP.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		return appInDb;
	}

	/**
	 * Retrieves detailed overview of an application
	 * Includes platforms, deployments, and configuration
	 *
	 * Features:
	 * - Complete app configuration details
	 * - Platform-specific settings
	 * - Deployment environment status
	 * - Hierarchical data structure
	 *
	 * @param appId - ID of the application to retrieve
	 * @returns Detailed app object with platforms and deployments
	 * @throws {StorageError} If app not found
	 * @throws {InternalStorageError} If retrieval fails
	 */
	public async getAppOverView(appId: TCodePushApp["id"]): Promise<TCodePushAppWithPlatformsAndDeployments> {
		const [error, appWithPlatformsAndDeployment] = await queryWrapper(
			db.query.codepush_app.findFirst({
				where: eq(codepush_app.id, appId),
				with: {
					platforms: {
						with: {
							deployments: true,
						},
					},
				},
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.APP.FAILED.GET_BY_ID, error);
		}

		if (!appWithPlatformsAndDeployment) {
			throw new StorageError(STORAGE_ERROR_STRINGS.APP.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		return appWithPlatformsAndDeployment;
	}

	/**
	 * Deletes an app by name
	 * Handles cleanup of app data and associations
	 *
	 * Features:
	 * - Removes collaboration entry
	 * - Preserves app data for other users
	 * - Validates app existence
	 * - Handles permission cleanup
	 *
	 * @param userId - ID of the user losing access
	 * @param appName - Name of the app to remove
	 * @throws {StorageError} If app not found
	 * @throws {InternalStorageError} If removal fails
	 */
	public async deleteAppByName(appName: TCodePushApp["name"]): Promise<void> {
		const [error, appDeleted] = await queryWrapper(
			db.delete(codepush_app).where(eq(codepush_app.name, appName)).returning(),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.APP.FAILED.GET_BY_NAME, error);
		}

		if (!appDeleted) {
			throw new StorageError(STORAGE_ERROR_STRINGS.APP.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		return;
	}

	/**
	 * Collaborator Management Methods
	 * These methods handle user access control for applications
	 */

	/**
	 * Retrieves all collaborators for an application
	 * Includes user details and permission levels
	 *
	 * @param appId - ID of the application
	 * @returns Array of collaborators with user details
	 * @throws {StorageError} If app not found
	 * @throws {InternalStorageError} If retrieval fails
	 */
	public async getCollaboratorsByAppId(appId: TCodePushApp["id"]): Promise<TCodePushCollaboratorWithUser[]> {
		const [error, collaborators] = await queryWrapper(
			db.query.codepush_collaborator.findMany({
				where: eq(codepush_collaborator.appId, appId),
				orderBy: asc(codepush_collaborator.permission),
				with: {
					user: true,
				},
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.COLLABORATOR.FAILED.GET_BY_APP_ID, error);
		}

		if (!collaborators) {
			throw new StorageError(STORAGE_ERROR_STRINGS.COLLABORATOR.NOT_FOUND.MULTIPLE, HttpStatusCodes.NOT_FOUND);
		}

		// Sort collaborators first by permission (already done in the query)
		// and then alphabetically by user name within each permission level
		collaborators.sort((a, b) => {
			// If permissions are the same, sort by name
			if (a.permission === b.permission) {
				return a.user.name.localeCompare(b.user.name);
			}
			// Otherwise, maintain the existing permission-based sort
			return 0;
		});

		return collaborators;
	}

	/**
	 * Adds a new collaborator to an application
	 * Sets up user access with specified permission level
	 *
	 * @param userId - ID of the user to add
	 * @param appId - ID of the application
	 * @param permission - Permission level to grant
	 * @throws {StorageError} If collaborator already exists
	 * @throws {InternalStorageError} If addition fails
	 */
	public async addCollaboratorByUserId(
		userId: TUser["id"],
		appId: TCodePushApp["id"],
		permission: Permission,
	): Promise<void> {
		const [error] = await queryWrapper(
			db.transaction(async (tx) => {
				// Check if collaborator already exists
				const existingCollaborator = await tx.query.codepush_collaborator.findFirst({
					where: and(eq(codepush_collaborator.userId, userId), eq(codepush_collaborator.appId, appId)),
				});

				if (existingCollaborator) {
					// If collaborator exists, update their permission
					await tx
						.update(codepush_collaborator)
						.set({ permission })
						.where(and(eq(codepush_collaborator.userId, userId), eq(codepush_collaborator.appId, appId)));
				} else {
					// If collaborator doesn't exist, create new entry
					await tx.insert(codepush_collaborator).values({
						userId,
						appId,
						permission,
					});
				}
			}),
		);

		if (error) {
			if (error instanceof StorageError) {
				throw error;
			}

			throw new InternalStorageError(STORAGE_ERROR_STRINGS.COLLABORATOR.FAILED.ADD, error);
		}

		return;
	}

	/**
	 * Removes a collaborator from an application
	 * Prevents removal of app owners
	 *
	 * @param userId - ID of the user to remove
	 * @param appId - ID of the application
	 * @throws {StorageError} If collaborator not found
	 * @throws {InternalStorageError} If removal fails
	 */
	public async removeCollaboratorByUserId(userId: TUser["id"], appId: TCodePushApp["id"]): Promise<void> {
		const [error] = await queryWrapper(
			db.transaction(async (tx) => {
				const collaborator = await tx.query.codepush_collaborator.findFirst({
					where: and(eq(codepush_collaborator.userId, userId), eq(codepush_collaborator.appId, appId)),
				});

				if (!collaborator) {
					throw new StorageError(STORAGE_ERROR_STRINGS.COLLABORATOR.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
				}

				await tx
					.delete(codepush_collaborator)
					.where(and(eq(codepush_collaborator.userId, userId), eq(codepush_collaborator.appId, appId)));
			}),
		);

		if (error) {
			if (error instanceof StorageError) {
				throw error;
			}

			throw new InternalStorageError(STORAGE_ERROR_STRINGS.COLLABORATOR.FAILED.REMOVE, error);
		}

		return;
	}

	/**
	 * Deployment Management Methods
	 * These methods handle operations related to deployment environments
	 */

	/**
	 * Retrieves all deployments for an application
	 * Includes platform information for each deployment
	 *
	 * @param appId - ID of the application to get deployments for
	 * @returns Application object with platforms and their deployments
	 * @throws {StorageError} If app not found
	 * @throws {InternalStorageError} If retrieval fails
	 */
	public async getDeploymentsByAppId(appId: TCodePushApp["id"]): Promise<TCodePushAppWithPlatformsAndDeployments> {
		const [error, appWithDeployments] = await queryWrapper(
			db.query.codepush_app.findFirst({
				where: eq(codepush_app.id, appId),
				with: {
					platforms: {
						with: {
							deployments: true,
						},
					},
				},
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.DEPLOYMENT.FAILED.GET_BY_APP_ID, error);
		}

		if (!appWithDeployments) {
			throw new StorageError(STORAGE_ERROR_STRINGS.APP.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		return appWithDeployments;
	}

	/**
	 * Retrieves a specific deployment for an app and platform
	 *
	 * @param appId - ID of the application
	 * @param platformName - Target platform (iOS/Android)
	 * @param deploymentName - Name of the deployment to retrieve
	 * @returns Deployment object with details
	 * @throws {StorageError} If deployment not found
	 * @throws {InternalStorageError} If retrieval fails
	 */
	public async getDeploymentForAppIdAndPlatform(
		appId: TCodePushApp["id"],
		platformName: TCodePushPlatform["name"],
		deploymentName: TCodePushDeployment["name"],
	): Promise<TCodePushDeployment> {
		const [error, result] = await queryWrapper(
			db
				.select({ deployment: codepush_deployment })
				.from(codepush_deployment)
				.innerJoin(codepush_platform, eq(codepush_platform.id, codepush_deployment.platformId))
				.innerJoin(codepush_app, eq(codepush_app.id, codepush_platform.appId))
				.where(
					and(
						eq(codepush_platform.name, platformName),
						eq(codepush_app.id, appId),
						eq(codepush_deployment.name, deploymentName),
					),
				),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.APP.FAILED.GET_BY_ID, error);
		}

		const deployment = result[0]?.deployment;

		if (!deployment) {
			throw new StorageError(STORAGE_ERROR_STRINGS.DEPLOYMENT.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		return deployment;
	}

	/**
	 * Validates uniqueness of deployment names within an app
	 * Performs a case-insensitive check across all platforms
	 *
	 * @param deploymentName - Name to check for duplication
	 * @param appId - ID of the application
	 * @throws {StorageError} If deployment name exists (409 Conflict)
	 * @throws {InternalStorageError} If validation fails
	 */
	public async throwIfDeploymentNameDuplicate(
		deploymentName: TCodePushDeployment["name"],
		appId: TCodePushApp["id"],
	): Promise<void> {
		const [error, appWithPlatformsAndDeployments] = await queryWrapper(
			db.query.codepush_app.findFirst({
				where: eq(codepush_app.id, appId),
				with: {
					platforms: {
						with: {
							deployments: {
								where: eq(lower(codepush_deployment.name), deploymentName.toLowerCase()),
							},
						},
					},
				},
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.DEPLOYMENT.FAILED.GET_BY_NAME, error);
		}

		if (appWithPlatformsAndDeployments?.platforms.some((platform) => platform.deployments.length !== 0)) {
			throw new StorageError(STORAGE_ERROR_STRINGS.DEPLOYMENT.CONFLICT_NAME(deploymentName), HttpStatusCodes.CONFLICT);
		}

		return;
	}

	/**
	 * Creates a new deployment for all platforms of an app
	 * Generates unique deployment keys for each platform
	 *
	 * @param deploymentName - Name of the new deployment
	 * @param appId - ID of the application
	 * @returns Updated app object with new deployments
	 * @throws {StorageError} If deployment name exists
	 * @throws {InternalStorageError} If creation fails
	 */
	public async addDeploymentByAppId(
		deploymentName: TCodePushDeployment["name"],
		appId: TCodePushApp["id"],
	): Promise<TCodePushAppWithPlatformsAndDeployments> {
		const [error, result] = await queryWrapper(
			db.transaction(async (tx) => {
				const appWithPlatformsAndDeployments = await tx.query.codepush_app.findFirst({
					where: eq(codepush_app.id, appId),
					with: {
						platforms: {
							with: {
								deployments: true,
							},
						},
					},
				});

				if (!appWithPlatformsAndDeployments) {
					return tx.rollback();
				}

				appWithPlatformsAndDeployments.platforms.forEach(async (platform) => {
					const appNameSlug = slugifyName(appWithPlatformsAndDeployments.name);
					const platformNameSlug = slugifyName(platform.name);

					await tx.insert(codepush_deployment).values({
						name: deploymentName,
						platformId: platform.id,
						key: `${appNameSlug}_${platformNameSlug}_${slugifyName(deploymentName)}_${generateId(12)}`,
					});
				});

				const result = await tx.query.codepush_app.findFirst({
					where: eq(codepush_app.id, appId),
					with: {
						platforms: {
							with: {
								deployments: {
									where: eq(codepush_deployment.name, deploymentName),
								},
							},
						},
					},
				});

				return result;
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.DEPLOYMENT.FAILED.ADD, error);
		}

		return result!;
	}

	/**
	 * Deletes a deployment from all platforms of an app
	 * Verifies no releases exist before deletion
	 *
	 * @param deploymentName - Name of the deployment to delete
	 * @param appId - ID of the application
	 * @throws {StorageError} If deployment not found or has releases
	 * @throws {InternalStorageError} If deletion fails
	 */
	public async deleteDeploymentByAppId(
		deploymentName: TCodePushDeployment["name"],
		appId: TCodePushApp["id"],
	): Promise<void> {
		const [error, appWithPlatformsAndDeployments] = await queryWrapper(
			db.query.codepush_app.findFirst({
				where: eq(codepush_app.id, appId),
				with: {
					platforms: {
						with: {
							deployments: {
								where: eq(codepush_deployment.name, deploymentName),
								with: {
									releases: true,
								},
							},
						},
					},
				},
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.DEPLOYMENT.FAILED.GET_BY_NAME, error);
		}

		if (
			!appWithPlatformsAndDeployments ||
			appWithPlatformsAndDeployments.platforms.every((platform) => platform.deployments.length === 0)
		) {
			throw new StorageError(STORAGE_ERROR_STRINGS.DEPLOYMENT.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		if (
			appWithPlatformsAndDeployments.platforms.some((platform) =>
				platform.deployments.some((deployment) => deployment.releases.length !== 0),
			)
		) {
			throw new StorageError(STORAGE_ERROR_STRINGS.DEPLOYMENT.FAILED.RELEASES_EXIST, HttpStatusCodes.FORBIDDEN);
		}

		await queryWrapper(
			db.transaction(async (tx) => {
				for (const platform of appWithPlatformsAndDeployments.platforms) {
					await tx
						.delete(codepush_deployment)
						.where(and(eq(codepush_deployment.platformId, platform.id), eq(codepush_deployment.name, deploymentName)));
				}
			}),
		);
	}

	/**
	 * Rolls (regenerates) the deployment key for a specific platform deployment
	 *
	 * @param appName - Name of the application
	 * @param platformName - Target platform (iOS/Android)
	 * @param deploymentName - Name of the deployment to roll key for
	 * @param existingKey - Existing key of the deployment
	 * @throws {StorageError} If deployment not found
	 * @throws {InternalStorageError} If key rolling fails
	 */
	public async rollDeploymentKey(
		appName: TCodePushApp["name"],
		platformName: TCodePushPlatform["name"],
		deploymentName: TCodePushDeployment["name"],
		existingKey: TCodePushDeployment["key"],
	): Promise<void> {
		// Generate new deployment key
		const appNameSlug = slugifyName(appName);
		const platformNameSlug = slugifyName(platformName);
		const deploymentNameSlug = slugifyName(deploymentName);
		const newKey = `${appNameSlug}_${platformNameSlug}_${deploymentNameSlug}_${generateId(12)}`;

		// Update the deployment key
		const [updateError, updatedDeployment] = await queryWrapper(
			db.update(codepush_deployment).set({ key: newKey }).where(eq(codepush_deployment.key, existingKey)).returning(),
		);

		if (updateError) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.DEPLOYMENT.FAILED.UPDATE, updateError);
		}

		if (updatedDeployment.length === 0) {
			throw new StorageError(STORAGE_ERROR_STRINGS.DEPLOYMENT.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		return;
	}

	/**
	 * Sets a custom deployment key for a specific platform deployment
	 *
	 * @param deploymentKey - Key of the deployment
	 * @param customKey - Custom key to set for the deployment
	 * @throws {StorageError} If deployment not found or key is invalid
	 * @throws {InternalStorageError} If key update fails
	 */
	public async setCustomDeploymentKey(deploymentKey: TCodePushDeployment["key"], customKey: string): Promise<void> {
		// Validate custom key
		if (customKey.length < 16 || customKey.length > 64) {
			throw new StorageError("Custom key must be between 16 and 64 characters", HttpStatusCodes.BAD_REQUEST);
		}

		// Update the deployment key with the custom key
		const [updateError, updatedDeployment] = await queryWrapper(
			db
				.update(codepush_deployment)
				.set({ key: customKey })
				.where(eq(codepush_deployment.key, deploymentKey))
				.returning(),
		);

		if (updateError) {
			if (updateError.message?.includes("duplicate")) {
				throw new StorageError(STORAGE_ERROR_STRINGS.DEPLOYMENT.CONFLICT_KEY(customKey), HttpStatusCodes.CONFLICT);
			}

			throw new InternalStorageError(STORAGE_ERROR_STRINGS.DEPLOYMENT.FAILED.UPDATE, updateError);
		}

		if (updatedDeployment.length === 0) {
			throw new StorageError(STORAGE_ERROR_STRINGS.DEPLOYMENT.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		return;
	}

	/**
	 * Release Management Methods
	 * These methods handle the lifecycle of CodePush releases
	 */

	/**
	 * Retrieves release history for a deployment
	 * Returns releases sorted by creation date, with latest first
	 *
	 * @param deploymentKey - Key of the deployment to get history for
	 * @returns Array of releases with user and metrics information
	 * @throws {StorageError} If deployment not found
	 * @throws {InternalStorageError} If retrieval fails
	 */
	public async getReleaseHistoryByDeploymentKey(
		deploymentKey: TCodePushDeployment["key"],
	): Promise<TCodePushReleaseWithUserAndMetrics[]> {
		const [error, releaseHistory] = await queryWrapper(
			db.query.codepush_release.findMany({
				where: eq(codepush_release.deploymentId, deploymentKey),
				orderBy: [desc(codepush_release.createdAt)],
				with: {
					releasedByUser: true,
					metrics: true,
				},
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.GET_BY_DEPLOYMENT_KEY, error);
		}

		return releaseHistory;
	}

	/**
	 * Retrieves a specific release by its label
	 * Includes user and metrics information
	 *
	 * @param deploymentKey - Key of the deployment
	 * @param label - Label of the release to retrieve
	 * @returns Release object with user and metrics details
	 * @throws {StorageError} If release not found
	 * @throws {InternalStorageError} If retrieval fails
	 */
	public async getReleaseByDeploymentKeyAndLabel(
		deploymentKey: TCodePushDeployment["key"],
		label: TCodePushRelease["label"],
	): Promise<TCodePushReleaseWithUserAndMetrics> {
		const [error, release] = await queryWrapper(
			db.query.codepush_release.findFirst({
				where: and(eq(codepush_release.deploymentId, deploymentKey), eq(codepush_release.label, label)),
				with: {
					releasedByUser: true,
					metrics: true,
				},
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.GET_BY_DEPLOYMENT_KEY, error);
		}

		if (!release) {
			throw new StorageError(STORAGE_ERROR_STRINGS.RELEASE.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		return release;
	}

	/**
	 * Retrieves verified releases for a deployment
	 * Returns only releases that have been verified and are ready for use
	 *
	 * @param deploymentKey - Key of the deployment
	 * @returns Array of verified releases with user and metrics
	 * @throws {StorageError} If deployment not found
	 * @throws {InternalStorageError} If retrieval fails
	 */
	public async getVerifiedReleaseHistoryByDeploymentKey(
		deploymentKey: TCodePushDeployment["key"],
	): Promise<TCodePushReleaseWithUserAndMetrics[]> {
		const [error, releases] = await queryWrapper(
			db.query.codepush_release.findMany({
				where: and(eq(codepush_release.deploymentId, deploymentKey), eq(codepush_release.isVerified, true)),
				orderBy: desc(codepush_release.createdAt),
				with: {
					releasedByUser: true,
					metrics: true,
				},
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.GET_BY_DEPLOYMENT_KEY, error);
		}

		return releases;
	}

	/**
	 * Clears all releases for a deployment
	 * Removes both database entries and associated package blobs
	 *
	 * @param deploymentKey - Key of the deployment to clear
	 * @throws {StorageError} If no releases found
	 * @throws {InternalStorageError} If deletion fails
	 */
	public async clearReleaseHistoryByDeploymentKey(deploymentKey: TCodePushDeployment["key"]): Promise<void> {
		const [getReleasesError, releasesToDelete] = await queryWrapper(
			db.query.codepush_release.findMany({
				where: eq(codepush_release.deploymentId, deploymentKey),
			}),
		);

		if (getReleasesError) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.GET_BY_DEPLOYMENT_KEY, getReleasesError);
		}

		if (releasesToDelete.length === 0) {
			throw new StorageError(STORAGE_ERROR_STRINGS.RELEASE.NOT_FOUND.MULTIPLE, HttpStatusCodes.NOT_FOUND);
		}

		const blobIdsToDelete = releasesToDelete.map((release) => release.blobId);

		const [blobDeleteError] = await queryWrapper(deleteObjects(blobIdsToDelete));

		if (blobDeleteError) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.REMOVE_BLOB, blobDeleteError);
		}

		const [releaseDeleteError] = await queryWrapper(
			db.delete(codepush_release).where(eq(codepush_release.deploymentId, deploymentKey)),
		);

		if (releaseDeleteError) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.REMOVE, releaseDeleteError);
		}

		return;
	}

	/**
	 * Deletes a release by deployment key and label
	 * Removes both database entries and associated package blobs
	 *
	 * @param deploymentKey - Key of the deployment
	 * @param label - Label of the release to delete
	 * @throws {StorageError} If release not found
	 * @throws {InternalStorageError} If deletion fails
	 */
	public async deleteReleaseByDeploymentKeyAndLabel(
		deploymentKey: TCodePushDeployment["key"],
		label: TCodePushRelease["label"],
	): Promise<void> {
		const [getReleaseError, releaseToDelete] = await queryWrapper(
			db.query.codepush_release.findFirst({
				where: and(eq(codepush_release.deploymentId, deploymentKey), eq(codepush_release.label, label)),
			}),
		);

		if (getReleaseError) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.GET_BY_DEPLOYMENT_KEY, getReleaseError);
		}

		if (!releaseToDelete) {
			throw new StorageError(STORAGE_ERROR_STRINGS.RELEASE.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		const blobIdsToDelete = [releaseToDelete.blobId];

		const [blobDeleteError] = await queryWrapper(deleteObjects(blobIdsToDelete));

		if (blobDeleteError) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.REMOVE_BLOB, blobDeleteError);
		}

		const [releaseDeleteError] = await queryWrapper(
			db
				.delete(codepush_release)
				.where(and(eq(codepush_release.deploymentId, deploymentKey), eq(codepush_release.label, label))),
		);

		if (releaseDeleteError) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.REMOVE, releaseDeleteError);
		}

		return;
	}

	/**
	 * Generates the next release label in sequence
	 * Labels follow the format v1, v2, v3, etc.
	 *
	 * Features:
	 * - Maintains consistent version numbering scheme
	 * - Handles empty release history (starts with v1)
	 * - Extracts and increments version numbers
	 * - Preserves vX format for compatibility
	 *
	 * @param unverifiedReleaseHistory - Array of existing releases, sorted by creation date
	 * @returns Next sequential version label (e.g., "v1", "v2", etc.)
	 */
	public getNextLabel(unverifiedReleaseHistory: TCodePushRelease[]): string {
		// Package History is sorted by createdAt in descending order
		const latestUnverifiedRelease = unverifiedReleaseHistory.at(0);

		if (unverifiedReleaseHistory.length === 0 || !latestUnverifiedRelease) {
			return "v1";
		}

		const latestLabel = latestUnverifiedRelease.label;

		const latestVersion = Number.parseInt(latestLabel.substring(1)); // Trim 'v' from the front
		const nextVersion = latestVersion + 1;

		return `v${nextVersion}`;
	}

	/**
	 * Generates a unique object key for package storage
	 * Creates a deterministic path based on app and release details
	 *
	 * Path Structure:
	 * CodePush/<appName>/<platform>/<deploymentName>/<version>/<hash>
	 *
	 * Features:
	 * - Hierarchical organization for easy navigation
	 * - Platform-specific grouping
	 * - Version tracking
	 * - Content verification via hash
	 * - Consistent and predictable paths
	 *
	 * @param params - Parameters for key generation including app details and version info
	 * @returns Fully qualified storage path for the package
	 */
	public generateCodePushObjectKey({
		nextLabel,
		platform,
		deploymentName,
		appName,
		packageHash,
	}: GenerateCodePushObjectKeyParams): string {
		return `CodePush/${appName}/${platform}/${deploymentName}/${nextLabel}/${packageHash}`;
	}

	/**
	 * Package Management Methods
	 * These methods handle CodePush package storage and retrieval
	 */

	/**
	 * Generates a temporary pre-signed URL for package upload
	 *
	 * @param blobId - Unique identifier of the package blob
	 * @returns Pre-signed URL for package upload
	 * @throws {InternalStorageError} If URL generation fails
	 */
	public async getPresignedUrl(blobId: string): Promise<string> {
		const [error, url] = await queryWrapper(getPresignedPostUrl(blobId));

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.GENERATE_SIGNED_URL, error);
		}

		return url;
	}

	/**
	 * Copies a package blob to a new location
	 * Used when promoting releases between deployments
	 *
	 * @param sourceBlobURL - URL of the source package
	 * @param destinationBlobId - Target blob ID for the copy
	 * @throws {InternalStorageError} If copy operation fails
	 */
	public async copyBlob(sourceBlobURL: string, destinationBlobId: string): Promise<void> {
		const [error] = await queryWrapper(copyObjectToDestination(sourceBlobURL, destinationBlobId));

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.COPY_BLOB, error);
		}

		return;
	}

	/**
	 * Pre-commits a release for validation
	 * Creates a temporary release entry and generates upload URL
	 *
	 * Features:
	 * - Creates unverified release entry
	 * - Generates pre-signed upload URL
	 * - Stores initial package metadata
	 * - Enables package validation before final commit
	 *
	 * @param appPackage - Package metadata for pre-commit
	 * @returns Release ID and pre-signed upload URL
	 * @throws {StorageError} If validation fails
	 * @throws {InternalStorageError} If database operation fails
	 */
	public async preCommitRelease(appPackage: TPreCommitCodePushRelease): Promise<PreCommitPackageResponse> {
		const preSignedUrl = await this.getPresignedUrl(appPackage.blobId);

		// CREATE [Pre Commit]
		const [error, preCommittedPackage] = await queryWrapper(
			db
				.insert(codepush_release)
				.values({
					label: appPackage.label,
					appVersion: appPackage.appVersion,

					releasedByUserId: appPackage.releasedByUserId,
					deploymentId: appPackage.deploymentId,

					description: appPackage.description,
					isDisabled: appPackage.isDisabled,
					isMandatory: appPackage.isMandatory,
					releaseMethod: appPackage.releaseMethod,
					rollout: appPackage.rollout,

					size: appPackage.size,
					blobId: appPackage.blobId,
					packageHash: appPackage.packageHash,

					isVerified: false,
				})
				.returning(),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.ADD, error);
		}

		return {
			releaseId: preCommittedPackage[0]!.id,
			preSignedUrl,
		};
	}

	/**
	 * Verifies a release after package upload
	 * Updates release status and makes it available for deployment
	 *
	 * Features:
	 * - Validates package upload completion
	 * - Updates release verification status
	 * - Manages rollout values for previous releases
	 * - Enforces release history size limits
	 * - Cleans up old releases if needed
	 *
	 * @param deploymentKey - Key of the target deployment
	 * @param releaseId - ID of the release to verify
	 * @returns Verified release object
	 * @throws {StorageError} If release not found
	 * @throws {InternalStorageError} If verification fails
	 */
	public async verifyReleaseById(
		deploymentKey: TCodePushDeployment["key"],
		releaseId: TCodePushRelease["id"],
	): Promise<TCodePushRelease> {
		const releaseHistory = await this.getReleaseHistoryByDeploymentKey(deploymentKey);
		// Returns in desc order and only verified releases, so the pre-committed release is not included.
		const verifiedReleaseHistory = releaseHistory.filter((release) => release.isVerified);

		// Remove the rollout value for the previous Release.
		// UPDATE
		const previousRelease = verifiedReleaseHistory.at(0);
		if (previousRelease) {
			const [error] = await queryWrapper(
				db.update(codepush_release).set({ rollout: null }).where(eq(codepush_release.id, previousRelease.id)),
			);

			if (error) {
				throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.UPDATE_ROLLOUT, error);
			}
		}

		// UPDATE
		const [error, committedRelease] = await queryWrapper(
			db.update(codepush_release).set({ isVerified: true }).where(eq(codepush_release.id, releaseId)).returning(),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.VERIFY, error);
		}

		if (committedRelease.length === 0) {
			throw new StorageError(STORAGE_ERROR_STRINGS.RELEASE.NOT_FOUND.SINGLE, HttpStatusCodes.NOT_FOUND);
		}

		// DELETE
		if (releaseHistory.length > CodePushStorageManager.MAX_RELEASE_HISTORY_LENGTH) {
			const packageToDelete = releaseHistory.at(-1)!;

			const blobIdsToDelete = [packageToDelete.blobId];

			const [blobDeleteError] = await queryWrapper(deleteObjects(blobIdsToDelete));

			if (blobDeleteError) {
				throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.REMOVE_BLOB, blobDeleteError);
			}

			const [releaseDeleteError] = await queryWrapper(
				db.delete(codepush_release).where(eq(codepush_release.id, packageToDelete.id)),
			);

			if (releaseDeleteError) {
				throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.REMOVE, releaseDeleteError);
			}
		}

		return committedRelease[0]!;
	}

	/**
	 * Commits a release for deployment
	 * Finalizes the release and makes it available to users
	 *
	 * @param appPackage - Package metadata for commit
	 * @returns Committed release object
	 * @throws {StorageError} If validation fails
	 * @throws {InternalStorageError} If commit fails
	 */
	public async commitRelease(appPackage: TInsertCodePushRelease): Promise<TCodePushRelease> {
		const releaseHistory = await this.getReleaseHistoryByDeploymentKey(appPackage.deploymentId);
		const verifiedReleaseHistory = releaseHistory.filter((release) => release.isVerified);

		// Remove the rollout value for the latestPackage.
		// UPDATE
		const latestRelease = verifiedReleaseHistory.at(0);
		if (latestRelease) {
			const [error] = await queryWrapper(
				db.update(codepush_release).set({ rollout: null }).where(eq(codepush_release.id, latestRelease.id)),
			);

			if (error) {
				throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.UPDATE_ROLLOUT, error);
			}
		}

		// CREATE
		const [error, updatedPackageHistory] = await queryWrapper(
			db.transaction(async (tx) => {
				await tx.insert(codepush_release).values({
					...appPackage,
				});

				const updatedPackageHistory = await tx.query.codepush_release.findMany({
					where: and(eq(codepush_release.deploymentId, appPackage.deploymentId), eq(codepush_release.isVerified, true)),
					orderBy: desc(codepush_release.createdAt),
				});

				return updatedPackageHistory;
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.ADD, error);
		}

		if (!updatedPackageHistory) {
			throw new StorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.ADD, HttpStatusCodes.INTERNAL_SERVER_ERROR);
		}

		// DELETE
		if (releaseHistory.length > CodePushStorageManager.MAX_RELEASE_HISTORY_LENGTH) {
			const packageToDelete = updatedPackageHistory.at(-1)!;

			const blobIdsToDelete = [packageToDelete.blobId];

			const [blobDeleteError] = await queryWrapper(deleteObjects(blobIdsToDelete));

			if (blobDeleteError) {
				throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.REMOVE_BLOB, blobDeleteError);
			}

			const [packageDeleteError] = await queryWrapper(
				db.delete(codepush_release).where(eq(codepush_release.id, packageToDelete.id)),
			);

			if (packageDeleteError) {
				throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.REMOVE, packageDeleteError);
			}
		}

		const committedPackage = updatedPackageHistory.at(0)!;

		return committedPackage;
	}

	/**
	 * Updates release history with new data
	 * Handles rollout updates and status changes
	 *
	 * @param updatedRelease - Release update data
	 * @throws {StorageError} If release not found
	 * @throws {InternalStorageError} If update fails
	 */
	public async updateReleaseHistory(updatedRelease: Omit<TUpdateCodePushRelease, "label">): Promise<void> {
		const [error] = await queryWrapper(
			db
				.update(codepush_release)
				.set({
					rollout: updatedRelease.rollout,
					appVersion: updatedRelease.appVersion,
					description: updatedRelease.description,
					isDisabled: updatedRelease.isDisabled,
					isMandatory: updatedRelease.isMandatory,
				})
				.where(eq(codepush_release.id, updatedRelease.id)),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.UPDATE, error);
		}

		return;
	}

	/**
	 * Retrieves release statistics for all apps, platforms, and deployments
	 *
	 * @returns Array of release statistics
	 * @throws {StorageError} If no releases are found
	 * @throws {InternalStorageError} If retrieval fails
	 */
	public async getReleaseStats(): Promise<TCodePushReleaseStats[]> {
		const [error, releaseStats] = await queryWrapper(
			db
				.select({
					appName: codepush_app.name,
					platformName: codepush_platform.name,
					deploymentName: codepush_deployment.name,
					releaseCount: sql<number>`COUNT(${codepush_release.id})`,
				})
				.from(codepush_app)
				.leftJoin(codepush_platform, eq(codepush_platform.appId, codepush_app.id))
				.leftJoin(codepush_deployment, eq(codepush_deployment.platformId, codepush_platform.id))
				.leftJoin(codepush_release, eq(codepush_release.deploymentId, codepush_deployment.key))
				.groupBy(
					codepush_app.id,
					codepush_app.name,
					codepush_platform.id,
					codepush_platform.name,
					codepush_deployment.key,
					codepush_deployment.name,
				)
				.orderBy(codepush_app.name, codepush_platform.name, codepush_deployment.name),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.RELEASE.FAILED.GET_STATS, error);
		}

		if (!releaseStats) {
			throw new StorageError(STORAGE_ERROR_STRINGS.RELEASE.NOT_FOUND.STATS, HttpStatusCodes.NOT_FOUND);
		}

		// We are sure that the values are non-nullable
		return releaseStats as TCodePushReleaseStats[];
	}
}
