/**
 * Module for promoting releases between CodePush deployments.
 * Enables promotion of releases from one deployment to another (e.g., Staging to Production).
 * Supports customization of release properties during promotion.
 *
 * @module commands/codepush/release/promote
 */

import { Args, Flags } from "@oclif/core";
// @ts-expect-error
import backslash from "backslash";
import { Listr } from "listr2";
import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import type { Platform } from "../../../services/codepush-sdk.js";
import { sdk } from "../../../services/management-sdk.js";

/**
 * Command class for promoting releases between deployments.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Cross-deployment promotion
 * - Release property customization
 * - Rollout control
 * - Version targeting
 * - Mandatory update flags
 * - Release descriptions
 */
export default class ReleasePromote extends EnsureAuthCommand {
	static override description = "Promote a release from one deployment to another";

	static override examples = [
		{
			description: "Promote from Staging to Production",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Staging" "Production" -p ios',
		},
		{
			description: "Promote with custom rollout",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Staging" "Production" -p android -r 25%',
		},
		{
			description: "Promote as mandatory update",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Staging" "Production" -p ios -m',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app containing the deployments.
	 * @property {string} sourceDeploymentName - Required. The deployment to promote from.
	 * @property {string} targetDeploymentName - Required. The deployment to promote to.
	 */
	static override args = {
		appName: Args.string({ description: "Name of the CodePush app containing the deployments", required: true }),
		sourceDeploymentName: Args.string({ description: "Name of the source deployment to promote from", required: true }),
		targetDeploymentName: Args.string({ description: "Name of the target deployment to promote to", required: true }),
	};

	/**
	 * Command flags definition.
	 * @property {string} platform - Required. The platform to promote for (ios/android).
	 * @property {string} description - Optional. Description of changes in this promotion.
	 * @property {string} label - Optional. Specific release label to promote.
	 * @property {boolean} disabled - Optional. Whether the promoted release should be disabled.
	 * @property {boolean} mandatory - Optional. Whether the promoted release should be mandatory.
	 * @property {string} rollout - Optional. Percentage of users to roll out to (e.g., "25%").
	 * @property {string} targetBinaryVersion - Optional. Semver expression for target app version.
	 */
	static override flags = {
		platform: Flags.string({
			char: "p",
			description: "Platform to promote for",
			options: ["ios", "android"],
			required: true,
		}),
		description: Flags.string({
			char: "d",
			aliases: ["des"],
			description: "Description of the changes made to the app in this promotion",
		}),
		label: Flags.string({
			char: "l",
			description: "Label of the release to promote",
		}),
		disabled: Flags.boolean({
			char: "x",
			description: "Whether this release should be immediately downloadable",
		}),
		mandatory: Flags.boolean({
			char: "m",
			description: "Whether this release should be considered mandatory",
		}),
		rollout: Flags.string({
			char: "r",
			description: "Percentage of users this release should be available to",
		}),
		targetBinaryVersion: Flags.string({
			char: "t",
			description: "Semver expression that specifies the binary app version this release is targeting",
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
	 * Executes the release promotion command.
	 * This method:
	 * 1. Validates source and target deployments exist
	 * 2. Processes promotion options:
	 *    - Description sanitization
	 *    - Rollout percentage parsing
	 *    - Release targeting
	 * 3. Creates the promoted release with specified:
	 *    - Mandatory status
	 *    - Disabled status
	 *    - Target version
	 *    - Rollout percentage
	 * 4. Displays success message
	 *
	 * The promotion creates a new release in the target deployment,
	 * copying the content from the source deployment while applying
	 * any specified modifications to release properties.
	 *
	 * @returns {Promise<void>} A promise that resolves when promotion is complete
	 * @throws {Error} If promotion fails or user lacks permission
	 */
	public async run(): Promise<void> {
		const { args, flags } = await this.parse(ReleasePromote);

		const { appName, sourceDeploymentName, targetDeploymentName } = args;
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

		const tasks = new Listr([]);

		tasks.add({
			title: `Promoting Release for App: ${appName} Deployment: ${sourceDeploymentName} Platform: ${platform}`,
			task: async () => {
				const message = await sdk.codepush.promote(
					appName,
					sourceDeploymentName,
					targetDeploymentName,
					platform as Platform,
					packageInfo,
				);

				this.log(message);
			},
		});

		await tasks.run();

		return;
	}
}
