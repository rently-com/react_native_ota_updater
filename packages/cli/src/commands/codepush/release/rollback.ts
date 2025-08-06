/**
 * Module for rolling back releases in CodePush deployments.
 * Provides functionality to revert to previous releases when issues are detected.
 * Supports targeted rollbacks to specific releases or automatic rollback to previous version.
 *
 * @module commands/codepush/release/rollback
 */

import { Args, Flags } from "@oclif/core";
import { Listr } from "listr2";
import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import type { Platform } from "../../../services/codepush-sdk.js";
import { sdk } from "../../../services/management-sdk.js";

/**
 * Command class for rolling back releases in CodePush deployments.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Platform-specific rollbacks
 * - Targeted version rollback
 * - Automatic previous version rollback
 * - Safe release reversion
 * - Clear success/failure messaging
 */
export default class ReleaseRollback extends EnsureAuthCommand {
	static override description = "Roll back to a previous release for a CodePush deployment";

	static override examples = [
		{
			description: "Roll back to the previous release",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Production" -p ios',
		},
		{
			description: "Roll back to a specific release",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Staging" -p android -l v5',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app containing the deployment.
	 * @property {string} deploymentName - Required. The name of the deployment to roll back.
	 */
	static override args = {
		appName: Args.string({ description: "Name of the CodePush app containing the deployment", required: true }),
		deploymentName: Args.string({ description: "Name of the deployment to roll back", required: true }),
	};

	/**
	 * Command flags definition.
	 * @property {string} platform - Required. The platform to roll back (ios/android).
	 * @property {string} targetRelease - Optional. Specific release label to roll back to.
	 *                                   If not specified, rolls back to the previous release.
	 */
	static override flags = {
		platform: Flags.string({
			char: "p",
			description: "Platform to roll back",
			options: ["ios", "android"],
			required: true,
		}),

		targetRelease: Flags.string({
			char: "l",
			description: "Label of the release to roll back to (defaults to previous release)",
		}),
	};

	/**
	 * Executes the release rollback command.
	 * This method:
	 * 1. Validates the deployment exists
	 * 2. If target release specified:
	 *    - Verifies the target release exists
	 *    - Rolls back to that specific version
	 * 3. If no target specified:
	 *    - Identifies the previous release
	 *    - Rolls back to that version
	 * 4. Updates the deployment history
	 * 5. Displays success message
	 *
	 * Note: Rolling back creates a new release entry in the history,
	 * marking it as a rollback operation for tracking purposes.
	 *
	 * @returns {Promise<void>} A promise that resolves when rollback is complete
	 * @throws {Error} If rollback fails or user lacks permission
	 */
	public async run(): Promise<void> {
		const { args, flags } = await this.parse(ReleaseRollback);

		const { appName, deploymentName } = args;
		const { platform, targetRelease } = flags;

		const tasks = new Listr([]);

		tasks.add({
			title: `Rolling back Release for App: ${appName} Deployment: ${deploymentName} Platform: ${platform}`,
			task: async () => {
				const message = await sdk.codepush.rollback(appName, deploymentName, platform as Platform, targetRelease);

				this.log(message);
			},
		});

		await tasks.run();

		return;
	}
}
