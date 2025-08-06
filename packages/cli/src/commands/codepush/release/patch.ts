/**
 * Module for patching existing releases in CodePush deployments.
 * Enables modification of release properties without creating new releases.
 * Supports updating metadata, targeting, and distribution settings.
 *
 * @module commands/codepush/release/patch
 */

import { Args, Flags } from "@oclif/core";
// @ts-expect-error
import backslash from "backslash";
import { Listr } from "listr2";
import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import type { Platform } from "../../../services/codepush-sdk.js";
import { sdk } from "../../../services/management-sdk.js";

/**
 * Command class for patching existing releases.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Release property updates
 * - Rollout adjustments
 * - Version targeting changes
 * - Mandatory status updates
 * - Description modifications
 * - Release enabling/disabling
 */
export default class ReleasePatch extends EnsureAuthCommand {
	static override description = "Modify metadata for an existing CodePush release";

	static override examples = [
		{
			description: "Update release description",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Production" -p ios -d "Fixed critical bug"',
		},
		{
			description: "Make release mandatory",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Staging" -p android -m',
		},
		{
			description: "Adjust rollout percentage",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Production" -p ios -r 50%',
		},
		{
			description: "Disable a release",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Production" -p ios -x',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app containing the release.
	 * @property {string} deploymentName - Required. The name of the deployment containing the release.
	 */
	static override args = {
		appName: Args.string({ description: "Name of the CodePush app containing the release", required: true }),
		deploymentName: Args.string({ description: "Name of the deployment containing the release", required: true }),
	};

	/**
	 * Command flags definition.
	 * @property {string} platform - Required. The platform to patch the release for (ios/android).
	 * @property {string} description - Optional. Updated description for the release.
	 * @property {string} label - Optional. Label of the release to patch.
	 * @property {boolean} disabled - Optional. Whether to disable the release.
	 * @property {boolean} mandatory - Optional. Whether to make the release mandatory.
	 * @property {string} rollout - Optional. Updated rollout percentage (e.g., "50%").
	 * @property {string} targetBinaryVersion - Optional. Updated target app version.
	 */
	static override flags = {
		platform: Flags.string({
			char: "p",
			description: "Platform to patch the release for",
			options: ["ios", "android"],
			required: true,
		}),
		description: Flags.string({
			char: "d",
			aliases: ["des"],
			description: "Updated description for the release",
		}),
		label: Flags.string({
			char: "l",
			description: "Label of the release to patch",
		}),
		disabled: Flags.boolean({
			char: "x",
			description: "Whether to disable the release",
		}),
		mandatory: Flags.boolean({
			char: "m",
			description: "Whether to make the release mandatory",
		}),
		rollout: Flags.string({
			char: "r",
			description: "Updated percentage of users this release should be available to",
		}),
		targetBinaryVersion: Flags.string({
			char: "t",
			description: "Updated semver expression for the target app version",
		}),
	};

	/**
	 * Parses rollout percentage value from string input.
	 * Handles percentage signs and converts to number.
	 *
	 * @param {string | undefined} input - The rollout value to parse
	 * @returns {number | undefined} Parsed rollout percentage or undefined
	 */
	public getRolloutValue(input: string | undefined): number | undefined {
		return input ? Number.parseInt(input.replace("%", "")) : undefined;
	}

	/**
	 * Executes the release patch command.
	 * This method:
	 * 1. Validates at least one property is being updated
	 * 2. Processes patch options:
	 *    - Description sanitization
	 *    - Rollout percentage parsing
	 *    - Property validation
	 * 3. Updates the release with specified changes:
	 *    - Mandatory status
	 *    - Disabled status
	 *    - Target version
	 *    - Rollout percentage
	 *    - Description
	 * 4. Displays success message
	 *
	 * Note: At least one property must be specified to patch.
	 * The command will fail if no properties are provided for update.
	 *
	 * @returns {Promise<void>} A promise that resolves when patch is applied
	 * @throws {Error} If patch fails, no properties specified, or user lacks permission
	 */
	public async run(): Promise<void> {
		const { args, flags } = await this.parse(ReleasePatch);

		const { appName, deploymentName } = args;
		const { platform, description, disabled, label, mandatory, rollout, targetBinaryVersion } = flags;

		const sanitizedRollout = this.getRolloutValue(rollout);
		const sanitizedDescription = description ? backslash(description) : undefined;

		const packageInfo = {
			label: label,
			appVersion: targetBinaryVersion,
			description: sanitizedDescription,
			isDisabled: disabled,
			isMandatory: mandatory,
			rollout: sanitizedRollout,
		};

		const isAnyPropertyDefined = Object.values(packageInfo).some((value) => value !== undefined);

		if (!isAnyPropertyDefined) {
			this.error("At least one property must be defined.");
		}

		const tasks = new Listr([]);

		tasks.add({
			title: `Patching Release for App: ${appName} Deployment: ${deploymentName} Platform: ${platform}`,
			task: async () => {
				const message = await sdk.codepush.patchRelease(appName, deploymentName, platform as Platform, packageInfo);

				this.log(message);
			},
		});

		await tasks.run();

		return;
	}
}
