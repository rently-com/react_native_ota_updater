/**
 * Module for creating new deployments in CodePush applications.
 * Creates deployment environments for both iOS and Android platforms.
 * Generates unique deployment keys for each platform-deployment combination.
 *
 * @module commands/codepush/deployment/add
 */

import { Args } from "@oclif/core";
import CliTable3 from "cli-table3";
import { Listr } from "listr2";
import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import { sdk } from "../../../services/management-sdk.js";

/**
 * Command class for adding new deployments to CodePush applications.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Multi-platform deployment creation (iOS & Android)
 * - Automatic deployment key generation
 * - Formatted output display
 * - Immediate deployment configuration
 * - Platform-specific key management
 */
export default class DeploymentAdd extends EnsureAuthCommand {
	static override description = "Create a new deployment for a CodePush application";

	static override examples = [
		{
			description: "Create a new deployment for both platforms",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "Beta"',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app to add the deployment to.
	 * @property {string} deploymentName - Required. The name for the new deployment (e.g., Staging, Beta, Production).
	 */
	static override args = {
		appName: Args.string({ description: "Name of the CodePush app to add deployment to", required: true }),
		deploymentName: Args.string({ description: "Name for the new deployment", required: true }),
	};

	/**
	 * Executes the deployment creation command.
	 * This method:
	 * 1. Creates a new deployment with the specified name
	 * 2. Generates deployment keys for both iOS and Android platforms
	 * 3. Displays a formatted table with deployment information
	 *
	 * The command creates:
	 * - iOS deployment with unique key
	 * - Android deployment with unique key
	 * - Deployment configuration for both platforms
	 *
	 * @returns {Promise<void>} A promise that resolves when the deployment is created
	 * @throws {Error} If deployment creation fails or name is already taken
	 */
	public async run(): Promise<void> {
		const { args } = await this.parse(DeploymentAdd);
		const { appName, deploymentName } = args;

		const tasks = new Listr([]);

		tasks.add({
			title: `Creating Deployment: ${deploymentName} for both Platforms for App: ${appName}`,
			task: async () => {
				const appWithPlatformsAndDeployments = await sdk.codepush.addDeployment(appName, deploymentName);

				this.log(`Deployment ${deploymentName} created successfully!`);

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
