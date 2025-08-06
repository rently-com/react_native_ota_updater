/**
 * Module for listing deployments in CodePush applications.
 * Displays all deployments for both iOS and Android platforms.
 * Shows deployment names and their associated deployment keys.
 *
 * @module commands/codepush/deployment/list
 */

import { Args } from "@oclif/core";
import { Listr } from "listr2";

import CliTable3 from "cli-table3";
import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import { sdk } from "../../../services/management-sdk.js";

/**
 * Command class for listing deployments in CodePush applications.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Multi-platform deployment listing
 * - Deployment key visibility
 * - Formatted table output
 * - Platform-specific grouping
 * - Clear deployment overview
 */
export default class DeploymentList extends EnsureAuthCommand {
	static override description = "List all deployments for a CodePush application";

	static override examples = [
		{
			description: "List all deployments for an app",
			command: '<%= config.bin %> <%= command.id %> "MyApp"',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app to list deployments for.
	 */
	static override args = {
		appName: Args.string({ description: "Name of the CodePush app to list deployments for", required: true }),
	};

	/**
	 * Executes the deployment listing command.
	 * This method:
	 * 1. Fetches all deployments for the specified app
	 * 2. Creates a formatted table showing:
	 *    - Platform (iOS/Android)
	 *    - Deployment names
	 *    - Deployment keys
	 * 3. Displays the deployment information
	 *
	 * The table format provides:
	 * - Clear platform separation
	 * - Easy key reference
	 * - Deployment environment overview
	 *
	 * @returns {Promise<void>} A promise that resolves when deployments are listed
	 * @throws {Error} If app doesn't exist or user lacks permission
	 */
	public async run(): Promise<void> {
		const { args } = await this.parse(DeploymentList);

		const { appName } = args;

		const tasks = new Listr([]);

		tasks.add({
			title: `Fetching Deployments for App: ${appName}`,
			task: async () => {
				const appWithPlatformsAndDeployments = await sdk.codepush.getDeployments(appName);

				const table = new CliTable3({ head: ["Platform", "Deployment Name", "Deployment Key"] });

				for (const platform of appWithPlatformsAndDeployments.platforms) {
					for (const deployment of platform.deployments) {
						table.push([platform.name, deployment.name, deployment.key]);
					}
				}

				this.log(table.toString());
			},
		});

		await tasks.run();

		return;
	}
}
