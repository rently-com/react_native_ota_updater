/**
 * Module for removing CodePush applications from the React Native OTA Updater service.
 * Provides functionality to safely delete CodePush apps and their associated resources.
 * Includes confirmation prompt to prevent accidental deletions.
 *
 * @module commands/codepush/app/remove
 */

import { Args } from "@oclif/core";
import { Listr } from "listr2";

import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import { sdk } from "../../../services/management-sdk.js";
import { confirmTask } from "../../../tasks/confirm.js";

/**
 * Command class for removing CodePush applications.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Safe CodePush app deletion
 * - Interactive confirmation
 * - Resource cleanup
 * - Clear success/failure messaging
 * - Permission validation
 */
export default class AppRemove extends EnsureAuthCommand {
	static override description = "Remove a CodePush application and all of its data";

	static override examples = [
		{
			description: "Remove a CodePush app by name",
			command: '<%= config.bin %> <%= command.id %> "MyApp"',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app to remove.
	 *                              Must match an existing CodePush app name exactly.
	 */
	static override args = {
		appName: Args.string({
			description: "Name of the CodePush app to remove",
			required: true,
		}),
	};

	/**
	 * Executes the CodePush app removal command.
	 * This method:
	 * 1. Prompts for confirmation
	 * 2. Validates user permissions
	 * 3. Removes the CodePush app and associated resources:
	 *    - All deployments
	 *    - Release history
	 *    - Collaborator access
	 *    - Associated metadata
	 * 4. Displays success message
	 *
	 * Warning: This action is irreversible. All CodePush app data including:
	 * - Deployment configurations
	 * - Release history
	 * - Metrics and analytics
	 * - Access controls
	 * will be permanently deleted.
	 *
	 * @returns {Promise<void>} A promise that resolves when the CodePush app is removed
	 * @throws {Error} If CodePush app removal fails or user lacks permission
	 * @throws {ConfirmTaskError} If user cancels the removal
	 */
	public async run(): Promise<void> {
		const { args } = await this.parse(AppRemove);
		const { appName } = args;

		const tasks = new Listr([]);

		tasks.add(confirmTask(`Are you sure you want to remove ${appName}?`, "CodePush App Removal Cancelled"));

		tasks.add({
			title: `Removing CodePush App: ${appName}`,
			task: async () => {
				const message = await sdk.codepush.removeApp(appName);

				this.log(message);
			},
		});

		await tasks.run();

		return;
	}
}
