/**
 * Module for removing deployments from CodePush applications.
 * Provides functionality to safely delete deployment environments.
 * Includes confirmation prompt to prevent accidental deletions.
 *
 * @module commands/codepush/deployment/remove
 */

import { Args } from "@oclif/core";
import { Listr } from "listr2";

import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import { sdk } from "../../../services/management-sdk.js";
import { confirmTask } from "../../../tasks/confirm.js";

/**
 * Command class for removing deployments from CodePush applications.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Safe deployment deletion
 * - Interactive confirmation
 * - Resource cleanup
 * - Clear success/failure messaging
 * - Permission validation
 */
export default class DeploymentRemove extends EnsureAuthCommand {
	static override description = "Remove a deployment from a CodePush application";

	static override examples = [
		{
			description: "Remove a deployment from an app",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Beta"',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app to remove the deployment from.
	 * @property {string} deploymentName - Required. The name of the deployment to remove.
	 */
	static override args = {
		appName: Args.string({
			description: "Name of the CodePush app to remove deployment from",
			required: true,
		}),

		deploymentName: Args.string({
			description: "Name of the deployment to remove",
			required: true,
		}),
	};

	/**
	 * Executes the deployment removal command.
	 * This method:
	 * 1. Prompts for confirmation
	 * 2. Validates user permissions
	 * 3. Removes the deployment and associated resources:
	 *    - Deployment configuration
	 *    - Release history
	 *    - Deployment keys
	 * 4. Displays success message
	 *
	 * Warning: This action is irreversible. All deployment data including:
	 * - Release history
	 * - Metrics and analytics
	 * - Deployment keys
	 * will be permanently deleted.
	 *
	 * @returns {Promise<void>} A promise that resolves when the deployment is removed
	 * @throws {Error} If deployment removal fails or user lacks permission
	 * @throws {ConfirmTaskError} If user cancels the removal
	 */
	public async run(): Promise<void> {
		const { args } = await this.parse(DeploymentRemove);
		const { appName, deploymentName } = args;

		const tasks = new Listr([]);

		tasks.add(
			confirmTask(`Are you sure you want to remove ${deploymentName} from ${appName}?`, "Deployment Removal Cancelled"),
		);

		tasks.add({
			title: `Removing Deployment: ${deploymentName} from ${appName}`,
			task: async () => {
				const message = await sdk.codepush.removeDeployment(appName, deploymentName);

				this.log(message);
			},
		});

		await tasks.run();

		return;
	}
}
