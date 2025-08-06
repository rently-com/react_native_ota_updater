/**
 * CodePush SDK implementation for managing over-the-air updates.
 * Provides comprehensive functionality for managing apps, deployments, and releases.
 *
 * Features:
 * - App management (CRUD operations)
 * - Deployment management
 * - Release management (upload, promote, rollback)
 * - Collaborator management
 * - Platform-specific update handling
 * - Package file processing
 *
 * @module codepush-sdk
 */

import fs from "node:fs";
import path from "node:path";
import type { InferRequestType, InferResponseType } from "hono";
import slash from "slash";

import { isIgnored, readDirectoryRecursive } from "../lib/file-system.js";
import { honoApiClient } from "./api-client.js";
import { handleError } from "./errors.js";

import yazl from "yazl";

/**
 * Represents a package file in the CodePush system
 * @interface PackageFile
 */
interface PackageFile {
	/** Whether the file is temporary and should be cleaned up */
	isTemporary: boolean;
	/** Path to the package file */
	path: string;
}

/**
 * Supported platforms for CodePush updates
 * @enum {string}
 */
export enum Platform {
	/** Android platform */
	ANDROID = "android",
	/** iOS platform */
	IOS = "ios",
}

/**
 * Permission levels for app collaborators
 * @enum {string}
 */
export enum Permission {
	/** Full administrative access */
	ADMIN = "admin",
	/** Full ownership access */
	OWNER = "owner",
	/** Limited collaborative access */
	COLLABORATOR = "collaborator",
}

/**
 * Methods for releasing updates
 * @enum {string}
 */
export enum ReleaseMethod {
	/** Direct upload of a new release */
	UPLOAD = "upload",
	/** Promote a release from one deployment to another */
	PROMOTE = "promote",
	/** Rollback to a previous release */
	ROLLBACK = "rollback",
}

/** Type for update release request body */
type UpdateReleaseBody = InferRequestType<
	typeof honoApiClient.api.codepush.management.release.$patch
>["json"]["packageInfo"];

/** Type for verify release request body */
type VerifyReleaseBody = InferRequestType<
	typeof honoApiClient.api.codepush.management.release.$post
>["json"]["packageInfo"];

/** Type for release history response */
export type ReleaseHistory = InferResponseType<
	typeof honoApiClient.api.codepush.management.history.$get,
	200
>["history"];

/** Type for release stats response */
export type ReleaseStats = InferResponseType<
	typeof honoApiClient.api.codepush.management.stats.releases.$get,
	200
>["stats"];

/**
 * Manages CodePush operations including apps, deployments, releases, and collaborators.
 * Provides methods for all CodePush-related operations in the CLI.
 *
 * @example
 * ```typescript
 * const codePush = new CodePushManager();
 *
 * // Create a new app
 * await codePush.addApp("MyApp");
 *
 * // Add a deployment
 * await codePush.addDeployment("MyApp", "Production");
 *
 * // Release an update
 * await codePush.release("MyApp", "Production", Platform.IOS, {
 *   packagePath: "./dist",
 *   targetBinaryVersion: "1.0.0"
 * });
 * ```
 */
export class CodePushManager {
	/**
	 * Retrieves all apps registered with CodePush
	 * @returns {Promise<Array>} List of registered apps
	 * @throws {Error} If apps cannot be retrieved
	 */
	public async getApps() {
		const res = await honoApiClient.api.codepush.management.apps.$get();

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.apps;
	}

	/**
	 * Registers a new app with CodePush
	 * @param {string} appName - Name of the app to register
	 * @returns {Promise<Object>} Created app details
	 * @throws {Error} If app creation fails
	 *
	 * @example
	 * ```typescript
	 * await codePush.addApp("MyAwesomeApp");
	 * ```
	 */
	public async addApp(appName: string) {
		const res = await honoApiClient.api.codepush.management.app.$post({
			json: { appName, appIcon: "" },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.app;
	}

	/**
	 * Removes an app from CodePush
	 * @param {string} appName - Name of the app to remove
	 * @returns {Promise<Object>} Removal operation result
	 * @throws {Error} If app removal fails
	 *
	 * @example
	 * ```typescript
	 * await codePush.removeApp("DeprecatedApp");
	 * ```
	 */
	public async removeApp(appName: string) {
		const res = await honoApiClient.api.codepush.management.app.$delete({
			json: { appName },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}

	/**
	 * Lists all collaborators for an app
	 * @param {string} appName - Name of the app
	 * @returns {Promise<Array>} List of collaborators
	 * @throws {Error} If collaborators cannot be retrieved
	 */
	public async getCollaborators(appName: string) {
		const res = await honoApiClient.api.codepush.management.collaborators.$get({
			query: { appName },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.collaborators;
	}

	/**
	 * Adds a collaborator to an app
	 * @param {string} appName - Name of the app
	 * @param {string} email - Email of the collaborator
	 * @param {Permission} permission - Permission level for the collaborator
	 * @returns {Promise<Object>} Operation result
	 * @throws {Error} If collaborator addition fails
	 *
	 * @example
	 * ```typescript
	 * await codePush.addCollaborator("MyApp", "dev@example.com", Permission.COLLABORATOR);
	 * ```
	 */
	public async addCollaborator(appName: string, email: string, permission: Permission) {
		const res = await honoApiClient.api.codepush.management.collaborator.$post({
			json: { appName, email, permission },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}

	/**
	 * Removes a collaborator from an app
	 * @param {string} appName - Name of the app
	 * @param {string} email - Email of the collaborator to remove
	 * @returns {Promise<Object>} Operation result
	 * @throws {Error} If collaborator removal fails
	 */
	public async removeCollaborator(appName: string, email: string) {
		const res = await honoApiClient.api.codepush.management.collaborator.$delete({
			json: { appName, email },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}

	/**
	 * Lists all deployments for an app
	 * @param {string} appName - Name of the app
	 * @returns {Promise<Array>} List of deployments
	 * @throws {Error} If deployments cannot be retrieved
	 */
	public async getDeployments(appName: string) {
		const res = await honoApiClient.api.codepush.management.deployments.$get({
			query: { appName },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.app;
	}

	/**
	 * Gets details of a specific deployment
	 * @param {string} appName - Name of the app
	 * @param {string} deploymentName - Name of the deployment
	 * @param {Platform} platform - Target platform
	 * @returns {Promise<Object>} Deployment details
	 * @throws {Error} If deployment cannot be retrieved
	 */
	public async getDeployment(appName: string, deploymentName: string, platform: Platform) {
		const res = await honoApiClient.api.codepush.management.deployment.$get({
			query: { appName, deploymentName, platform },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.deployment;
	}

	/**
	 * Creates a new deployment for an app
	 * @param {string} appName - Name of the app
	 * @param {string} deploymentName - Name for the new deployment
	 * @returns {Promise<Object>} Created deployment details
	 * @throws {Error} If deployment creation fails
	 *
	 * @example
	 * ```typescript
	 * await codePush.addDeployment("MyApp", "Staging");
	 * ```
	 */
	public async addDeployment(appName: string, deploymentName: string) {
		const res = await honoApiClient.api.codepush.management.deployment.$post({
			json: { appName, deploymentName },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.app;
	}

	/**
	 * Removes a deployment from an app
	 * @param {string} appName - Name of the app
	 * @param {string} deploymentName - Name of the deployment to remove
	 * @returns {Promise<Object>} Operation result
	 * @throws {Error} If deployment removal fails
	 */
	public async removeDeployment(appName: string, deploymentName: string) {
		const res = await honoApiClient.api.codepush.management.deployment.$delete({
			json: { appName, deploymentName },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}

	/**
	 * Retrieves the release history for a deployment
	 * @param {string} appName - Name of the app
	 * @param {string} deploymentName - Name of the deployment
	 * @param {Platform} platform - Target platform
	 * @returns {Promise<ReleaseHistory>} Release history
	 * @throws {Error} If history cannot be retrieved
	 */
	public async getDeploymentHistory(appName: string, deploymentName: string, platform: Platform) {
		const res = await honoApiClient.api.codepush.management.history.$get({
			query: { appName, deploymentName, platform },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.history;
	}

	/**
	 * Retrieves the release statistics for all apps, platforms, and deployments
	 * @returns {Promise<ReleaseStats>} Release statistics
	 * @throws {Error} If statistics cannot be retrieved
	 */
	public async getReleaseStats() {
		const res = await honoApiClient.api.codepush.management.stats.releases.$get();

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();

		return data.stats;
	}

	/**
	 * Clears the release history for a deployment
	 * @param {string} appName - Name of the app
	 * @param {string} deploymentName - Name of the deployment
	 * @param {Platform} platform - Target platform
	 * @returns {Promise<Object>} Operation result
	 * @throws {Error} If history clearing fails
	 */
	public async clearDeploymentHistory(appName: string, deploymentName: string, platform: Platform) {
		const res = await honoApiClient.api.codepush.management.history.$delete({
			query: { appName, deploymentName, platform },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}

	/**
	 * Updates metadata for an existing release
	 * @param {string} appName - Name of the app
	 * @param {string} deploymentName - Name of the deployment
	 * @param {"ios" | "android"} platform - Target platform
	 * @param {UpdateReleaseBody} updateMetadata - New metadata for the release
	 * @returns {Promise<Object>} Updated release details
	 * @throws {Error} If release update fails
	 *
	 * @example
	 * ```typescript
	 * await codePush.patchRelease("MyApp", "Production", "ios", {
	 *   description: "Bug fixes and improvements",
	 *   rollout: 25
	 * });
	 * ```
	 */
	public async patchRelease(
		appName: string,
		deploymentName: string,
		platform: "ios" | "android",
		updateMetadata: UpdateReleaseBody,
	) {
		const res = await honoApiClient.api.codepush.management.release.$patch({
			query: { appName, deploymentName, platform },
			json: {
				packageInfo: {
					label: updateMetadata.label,
					description: updateMetadata.description,
					rollout: updateMetadata.rollout,
					appVersion: updateMetadata.appVersion,
					isDisabled: updateMetadata.isDisabled,
					isMandatory: updateMetadata.isMandatory,
				},
			},
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}

	/**
	 * Promotes a release from one deployment to another
	 * @param {string} appName - Name of the app
	 * @param {string} sourceDeploymentName - Source deployment name
	 * @param {string} destinationDeploymentName - Target deployment name
	 * @param {Platform} platform - Target platform
	 * @param {UpdateReleaseBody} updateMetadata - Optional metadata updates for the promoted release
	 * @returns {Promise<Object>} Promotion operation result
	 * @throws {Error} If promotion fails
	 *
	 * @example
	 * ```typescript
	 * await codePush.promote("MyApp", "Staging", "Production", Platform.ANDROID, {
	 *   rollout: 25,
	 *   description: "Promoting staging to production"
	 * });
	 * ```
	 */
	public async promote(
		appName: string,
		sourceDeploymentName: string,
		destinationDeploymentName: string,
		platform: Platform,
		updateMetadata: UpdateReleaseBody,
	) {
		const res = await honoApiClient.api.codepush.management.release.promote.$post({
			query: { appName, deploymentName: sourceDeploymentName, platform },
			json: {
				targetDeployment: destinationDeploymentName,
				packageInfo: {
					label: updateMetadata.label,
					description: updateMetadata.description,
					rollout: updateMetadata.rollout,
					appVersion: updateMetadata.appVersion,
					isDisabled: updateMetadata.isDisabled,
					isMandatory: updateMetadata.isMandatory,
				},
			},
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}

	/**
	 * Rolls back a deployment to a previous release
	 * @param {string} appName - Name of the app
	 * @param {string} deploymentName - Name of the deployment
	 * @param {Platform} platform - Target platform
	 * @param {string} [targetRelease] - Optional specific release to roll back to
	 * @returns {Promise<Object>} Rollback operation result
	 * @throws {Error} If rollback fails
	 *
	 * @example
	 * ```typescript
	 * // Rollback to previous release
	 * await codePush.rollback("MyApp", "Production", Platform.IOS);
	 *
	 * // Rollback to specific release
	 * await codePush.rollback("MyApp", "Production", Platform.IOS, "v5");
	 * ```
	 */
	public async rollback(appName: string, deploymentName: string, platform: Platform, targetRelease?: string) {
		const res = await honoApiClient.api.codepush.management.release.rollback.$post({
			query: { appName, deploymentName, platform, targetReleaseLabel: targetRelease },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.message;
	}

	/**
	 * Initiates a new release
	 * @param {string} appName - Name of the app
	 * @param {string} deploymentName - Target deployment name
	 * @param {Platform} platform - Target platform
	 * @param {VerifyReleaseBody} updateMetadata - Metadata for the new release
	 * @returns {Promise<Object>} Release verification result
	 * @throws {Error} If release initiation fails
	 */
	public async release(appName: string, deploymentName: string, platform: Platform, updateMetadata: VerifyReleaseBody) {
		const res = await honoApiClient.api.codepush.management.release.$post({
			query: { appName, deploymentName, platform },
			json: {
				packageInfo: {
					packageHash: updateMetadata.packageHash,
					size: updateMetadata.size,
					packageName: updateMetadata.packageName,

					appVersion: updateMetadata.appVersion,
					description: updateMetadata.description,
					rollout: updateMetadata.rollout,
					isDisabled: updateMetadata.isDisabled,
					isMandatory: updateMetadata.isMandatory,
				},
			},
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.verified;
	}

	/**
	 * Marks a release as verified after upload
	 * @param {string} appName - Name of the app
	 * @param {string} deploymentName - Target deployment name
	 * @param {Platform} platform - Target platform
	 * @param {number} releaseId - ID of the verified release
	 * @returns {Promise<Object>} Release completion result
	 * @throws {Error} If release completion fails
	 */
	public async releaseVerified(appName: string, deploymentName: string, platform: Platform, releaseId: number) {
		const res = await honoApiClient.api.codepush.management.release.verify.$post({
			query: { appName, deploymentName, platform },
			json: { releaseId },
		});

		if (!res.ok) {
			return handleError(res);
		}

		const data = await res.json();
		return data.release;
	}

	/**
	 * Creates a package file from a directory path
	 * @param {string} filePath - Path to the directory or file to package
	 * @returns {Promise<PackageFile>} Created package file information
	 * @throws {Error} If package creation fails
	 *
	 * @example
	 * ```typescript
	 * const packageFile = await codePush.packageFileFromPath("./dist");
	 * ```
	 */
	public async packageFileFromPath(filePath: string) {
		// Check if the provided path is a directory
		if (fs.lstatSync(filePath).isDirectory()) {
			const files: string[] = await readDirectoryRecursive(filePath);
			const fileName: string = `${this.generateRandomFilename(15)}.zip`;
			const writeStream: fs.WriteStream = fs.createWriteStream(fileName);
			const finalPath = path.join(process.cwd(), fileName);

			try {
				const zipFile = new yazl.ZipFile();
				const baseDirectoryPath = path.dirname(filePath);

				// Create a promise to handle the zip file creation
				return new Promise<PackageFile>((resolve, reject) => {
					zipFile.outputStream
						.pipe(writeStream)
						.on("error", reject)
						.on("close", () => {
							resolve({ isTemporary: true, path: finalPath });
						});

					// Add files to the zip
					for (const file of files) {
						// yazl does not like backslash (\) in the metadata path.
						const relativePath: string = slash(path.relative(baseDirectoryPath, file));

						if (isIgnored(relativePath)) {
							// We don't want to add ignored files to the zip, especially .map files which increase the size of the zip file.
							continue;
						}

						zipFile.addFile(file, relativePath);
					}

					zipFile.end();
				});
			} catch (error) {
				// Clean up if something fails outside the promise
				if (writeStream) {
					writeStream.destroy();
				}
				if (finalPath) {
					fs.unlinkSync(finalPath);
				}

				throw new Error(`Error occurred while Zipping: ${error}`);
			}
		} else {
			// If it's not a directory, return the file path directly
			return { isTemporary: false, path: filePath };
		}
	}

	/**
	 * Generates a random filename for temporary package files
	 * @param {number} length - Length of the random string
	 * @returns {string} Random filename
	 * @private
	 */
	private generateRandomFilename(length: number): string {
		let filename = "";
		const validChar: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for (let i = 0; i < length; i++) {
			filename += validChar.charAt(Math.floor(Math.random() * validChar.length));
		}

		return filename;
	}
}
