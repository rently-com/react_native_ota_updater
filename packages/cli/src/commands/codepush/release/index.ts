/**
 * Module for creating new releases in CodePush deployments.
 * Handles packaging, uploading, and releasing updates to CodePush applications.
 * Supports various release configurations and metadata settings.
 *
 * @module commands/codepush/release
 */

import fs from "node:fs";
import path from "node:path";
import { Args, Flags } from "@oclif/core";
import { CLIError } from "@oclif/core/errors";
import axios from "axios";
import { Listr } from "listr2";
import semver from "semver";
import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import { isBinaryOrZip } from "../../../lib/file-system.js";
import { generatePackageManifestFromZip } from "../../../lib/hash-utils.js";
import type { Platform } from "../../../services/codepush-sdk.js";
import { sdk } from "../../../services/management-sdk.js";

/**
 * Context interface for release task execution.
 * Tracks state during the multi-step release process.
 *
 * @interface Ctx
 * @property {boolean} isTemporary - Whether the release file is temporary
 * @property {string} releaseZipFilePath - Path to the release ZIP file
 * @property {string} packageName - Name of the package being released
 * @property {string} packageHash - Hash of the package contents
 * @property {number} size - Size of the release package
 * @property {string} preSignedUrl - URL for secure file upload
 * @property {number} releaseId - ID of the created release
 */
interface Ctx {
	isTemporary: boolean;
	releaseZipFilePath: string;
	packageName: string;
	packageHash: string;
	size: number;
	preSignedUrl: string;
	releaseId: number;
}

/**
 * Command class for creating new CodePush releases.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Update package creation
 * - Secure file upload
 * - Release verification
 * - Version targeting
 * - Rollout control
 * - Mandatory updates
 * - Release descriptions
 */
export default class Release extends EnsureAuthCommand {
	static override description = "Create a new release for a CodePush application";

	static override examples = [
		{
			description: "Release an update to staging",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "./dist" "1.0.0" -p ios',
		},
		{
			description: "Release mandatory update",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "./dist" "1.0.0" -p android -d Production -m',
		},
		{
			description: "Release with rollout",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "./dist" "^1.0.0" -p ios -r 25%',
		},
		{
			description: "Release with description",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "./dist" "1.0.0" -p ios --des "Bug fixes and improvements"',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app to release to.
	 * @property {string} updateContentsPath - Required. Path to the update contents (e.g., bundled JS).
	 * @property {string} targetBinaryVersion - Required. Semver expression for target app version.
	 */
	static override args = {
		appName: Args.string({ description: "Name of the CodePush app to release to", required: true }),
		updateContentsPath: Args.string({ description: "Path to the update contents (e.g., bundled JS)", required: true }),
		targetBinaryVersion: Args.string({
			description: "Semver expression for the target binary version (e.g., 1.0.0 or ^1.2.3)",
			required: true,
		}),
	};

	/**
	 * Command flags definition.
	 * @property {string} platform - Required. The platform to release for (ios/android).
	 * @property {string} deploymentName - Optional. The deployment to release to (defaults to Staging).
	 * @property {string} description - Optional. Description of the changes in this release.
	 * @property {boolean} disabled - Optional. Whether to disable the release initially.
	 * @property {boolean} mandatory - Optional. Whether to mark the release as mandatory.
	 * @property {string} rollout - Optional. Percentage of users to roll out to (e.g., "25%").
	 */
	static override flags = {
		platform: Flags.string({
			char: "p",
			description: "Platform to release for",
			options: ["ios", "android"],
			required: true,
		}),
		deploymentName: Flags.string({
			char: "d",
			description: "Deployment to release to",
			default: "Staging",
			required: true,
		}),
		description: Flags.string({
			aliases: ["des"],
			description: "Description of the changes in this release",
		}),
		disabled: Flags.boolean({
			char: "x",
			description: "Whether to disable this release initially",
			default: false,
		}),
		mandatory: Flags.boolean({
			char: "m",
			description: "Whether this release should be mandatory",
			default: false,
		}),
		rollout: Flags.string({
			char: "r",
			description: "Percentage of users to roll out to",
		}),
	};

	/**
	 * Parses rollout percentage value from string input.
	 * Handles percentage signs and converts to number.
	 *
	 * @param {string | undefined} input - The rollout value to parse
	 * @returns {number | undefined} Parsed rollout percentage or undefined
	 * @private
	 */
	private parseRolloutValue(input: string | undefined): number | undefined {
		return input ? Number.parseInt(input.replace("%", ""), 10) : undefined;
	}

	/**
	 * Validates that the provided version range is semver-compliant.
	 * Ensures proper version targeting for the release.
	 *
	 * @param {string} semverRange - The version range to validate
	 * @throws {CLIError} If the version range is invalid
	 * @private
	 */
	private throwForInvalidSemverRange(semverRange: string): void {
		if (!semver.validRange(semverRange)) {
			throw new CLIError('Invalid target binary version. Use a semver-compliant range like "1.0.0", "*", or "^1.2.3".');
		}
	}

	/**
	 * Gets file statistics for the update package.
	 * Retrieves size and name information for the release file.
	 *
	 * @param {string} filePath - Path to the file to analyze
	 * @returns {Promise<{size: number, name: string}>} File statistics
	 * @private
	 */
	private async handleFileStats(filePath: string): Promise<{ size: number; name: string }> {
		const stats = await fs.promises.stat(filePath);
		return { size: stats.size, name: path.basename(filePath) };
	}

	/**
	 * Uploads the release package to storage.
	 * Handles secure file transfer with progress tracking.
	 *
	 * @param {string} filePath - Path to the file to upload
	 * @param {string} preSignedUrl - Pre-signed URL for upload
	 * @param {number} fileSize - Size of the file in bytes
	 * @returns {Promise<void>} A promise that resolves when upload is complete
	 * @private
	 */
	private async uploadWithProgress(filePath: string, preSignedUrl: string, fileSize: number): Promise<void> {
		const fileStream = fs.createReadStream(filePath);

		await axios.put(preSignedUrl, fileStream, {
			headers: {
				"Content-Type": "application/zip",
				"Content-Length": fileSize,
			},
		});
	}

	/**
	 * Executes the release command.
	 * This method:
	 * 1. Validates input parameters
	 * 2. Creates the release package:
	 *    - Bundles update contents
	 *    - Generates manifest
	 *    - Calculates hashes
	 * 3. Verifies release data
	 * 4. Uploads the package
	 * 5. Confirms release success
	 *
	 * The release process includes several safety checks:
	 * - Version validation
	 * - File type verification
	 * - Upload verification
	 * - Release confirmation
	 *
	 * @returns {Promise<void>} A promise that resolves when release is complete
	 * @throws {CLIError} If release fails at any stage
	 */
	public async run(): Promise<void> {
		const { args, flags } = await this.parse(Release);
		const { appName, updateContentsPath, targetBinaryVersion } = args;
		const { platform, deploymentName, description, disabled, mandatory, rollout } = flags;

		const sanitizedRollout = this.parseRolloutValue(rollout);
		this.throwForInvalidSemverRange(targetBinaryVersion);

		if (isBinaryOrZip(updateContentsPath)) {
			throw new CLIError("Direct path required for update contents (e.g., /path/to/main.jsbundle or directory).");
		}

		const updateMetadata = {
			appVersion: targetBinaryVersion,
			rollout: sanitizedRollout,
			description,
			isDisabled: disabled,
			isMandatory: mandatory,
		};

		const tasks = new Listr<Ctx>(
			[
				{
					title: `[${platform}] Creating Zip package`,
					task: async (ctx, task) => {
						const releaseZipFile = await sdk.codepush.packageFileFromPath(updateContentsPath);
						ctx.releaseZipFilePath = releaseZipFile.path;
						ctx.isTemporary = releaseZipFile.isTemporary;

						const releaseManifest = await generatePackageManifestFromZip(ctx.releaseZipFilePath);
						ctx.packageHash = releaseManifest?.computePackageHash()!;

						const fileStats = await this.handleFileStats(ctx.releaseZipFilePath);
						ctx.size = fileStats.size;
						ctx.packageName = fileStats.name;

						task.output = this.chalk.cyan(
							`[${platform}] Created zip package for ${ctx.packageName} with size ${ctx.size} bytes and hash ${ctx.packageHash}`,
						);
					},
					rendererOptions: {
						persistentOutput: true,
					},
				},
				{
					title: `[${platform}] Verifying Release Data`,
					task: async (ctx) => {
						try {
							const response = await sdk.codepush.release(appName, deploymentName, platform as Platform, {
								...updateMetadata,
								packageHash: ctx.packageHash,
								size: ctx.size,
								packageName: ctx.packageName,
							});

							ctx.preSignedUrl = response.preSignedUrl;
							ctx.releaseId = response.releaseId;
						} catch (error) {
							if (ctx.isTemporary) {
								fs.unlinkSync(ctx.releaseZipFilePath);
							}

							throw error;
						}
					},
				},
				{
					title: `[${platform}] Uploading Release`,
					task: async (ctx) => {
						try {
							await this.uploadWithProgress(ctx.releaseZipFilePath, ctx.preSignedUrl, ctx.size);

							if (ctx.isTemporary) {
								fs.unlinkSync(ctx.releaseZipFilePath);
							}

							const res = await sdk.codepush.releaseVerified(
								appName,
								deploymentName,
								platform as Platform,
								ctx.releaseId,
							);

							if (res) {
								this.log(
									`Successfully released an update containing "${updateContentsPath}" to the ${platform} "${deploymentName}" deployment of the "${appName}" app.`,
								);
							}
						} catch {
							if (ctx.isTemporary) {
								fs.unlinkSync(ctx.releaseZipFilePath);
							}
							throw new CLIError("Failed to upload release file");
						}
					},
				},
			],
			{
				exitOnError: true,
			},
		);

		await tasks.run();
	}
}
