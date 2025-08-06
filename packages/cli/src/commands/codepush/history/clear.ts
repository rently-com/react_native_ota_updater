/**
 * Module for clearing release history of CodePush deployments.
 * Provides functionality to safely remove all release history for a deployment.
 * Includes confirmation prompt to prevent accidental history deletion.
 *
 * @module commands/codepush/history/clear
 */

import { Args, Flags } from "@oclif/core";

import { Listr } from "listr2";
import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import type { Platform } from "../../../services/codepush-sdk.js";
import { sdk } from "../../../services/management-sdk.js";
import { confirmTask } from "../../../tasks/confirm.js";

/**
 * Command class for clearing deployment release history.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Platform-specific history clearing
 * - Interactive confirmation
 * - Safe history deletion
 * - Clear success/failure messaging
 * - Permission validation
 */
export default class DeploymentClear extends EnsureAuthCommand {
	static override description = "Clear the release history for a CodePush deployment";

	static override examples = [
		{
			description: "Clear iOS deployment history",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Production" -p ios',
		},
		{
			description: "Clear Android deployment history",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Staging" -p android',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app containing the deployment.
	 * @property {string} deploymentName - Required. The name of the deployment to clear history for.
	 */
	static override args = {
		appName: Args.string({ description: "Name of the CodePush app containing the deployment", required: true }),

		deploymentName: Args.string({
			description: "Name of the deployment to clear history for",
			required: true,
		}),
	};

	/**
	 * Command flags definition.
	 * @property {string} platform - Required. The platform to clear history for (ios/android).
	 */
	static override flags = {
		platform: Flags.string({
			char: "p",
			description: "Platform to clear history for",
			options: ["ios", "android"],
			required: true,
		}),
	};

	/**
	 * Executes the deployment history clearing command.
	 * This method:
	 * 1. Prompts for confirmation
	 * 2. Validates user permissions
	 * 3. Clears all release history:
	 *    - Release records
	 *    - Installation metrics
	 *    - Release metadata
	 * 4. Displays success message
	 *
	 * Warning: This action is irreversible. All release history including:
	 * - Release versions
	 * - Installation data
	 * - Metrics and analytics
	 * - Release metadata
	 * will be permanently deleted.
	 *
	 * @returns {Promise<void>} A promise that resolves when history is cleared
	 * @throws {Error} If history clearing fails or user lacks permission
	 * @throws {ConfirmTaskError} If user cancels the operation
	 */
	public async run(): Promise<void> {
		const { args, flags } = await this.parse(DeploymentClear);

		const { appName, deploymentName } = args;
		const { platform } = flags;

		const tasks = new Listr([]);

		tasks.add(
			confirmTask(
				`Are you sure you want to clear the "${deploymentName}" deployment in the "${appName}" app for ${platform}?`,
				"Clear deployment cancelled",
			),
		);

		tasks.add({
			title: `Clearing Deployment: ${deploymentName} in App: ${appName} Platform: ${platform}`,
			task: async () => {
				const message = await sdk.codepush.clearDeploymentHistory(appName, deploymentName, platform as Platform);

				this.log(message);
			},
		});

		await tasks.run();

		return;
	}
}
