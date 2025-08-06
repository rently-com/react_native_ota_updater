/**
 * Module for registering new CodePush applications with the React Native OTA Updater service.
 * Creates new CodePush apps with default deployments for both iOS and Android platforms.
 * Provides deployment keys for immediate use in React Native projects.
 *
 * @module commands/codepush/app/add
 */

import { Args } from "@oclif/core";
import CliTable3 from "cli-table3";
import { Listr } from "listr2";
import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import { sdk } from "../../../services/management-sdk.js";

/**
 * Command class for adding new CodePush applications.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Automatic deployment creation
 * - Multi-platform support (iOS & Android)
 * - Deployment key generation
 * - Formatted output display
 * - Immediate app configuration
 */
export default class AppAdd extends EnsureAuthCommand {
	static override description = "Register a new CodePush application with the React Native OTA Updater service";

	static override examples = [
		{
			description: "Create a new CodePush application with default deployments",
			command: '<%= config.bin %> <%= command.id %> "MyNewApp"',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name for the new CodePush application.
	 *                              Must be unique within your account.
	 */
	static override args = {
		appName: Args.string({
			description: "Name for the new CodePush application (must be unique)",
			required: true,
		}),
	};

	/**
	 * Executes the CodePush app creation command.
	 * This method:
	 * 1. Creates a new CodePush app with the specified name
	 * 2. Automatically creates default deployments for iOS and Android
	 * 3. Generates deployment keys for each platform/deployment combination
	 * 4. Displays a formatted table with deployment information
	 *
	 * The command creates the following for each new CodePush app:
	 * - iOS Production and Staging deployments
	 * - Android Production and Staging deployments
	 * - Unique deployment keys for each deployment
	 *
	 * @returns {Promise<void>} A promise that resolves when the CodePush app is created
	 * @throws {Error} If CodePush app creation fails or name is already taken
	 */
	public async run(): Promise<void> {
		const { args } = await this.parse(AppAdd);
		const { appName } = args;

		const tasks = new Listr([]);

		tasks.add({
			title: `Creating CodePush App: ${appName} with Default Deployments for both Platforms`,
			task: async () => {
				const appWithPlatformsAndDeployments = await sdk.codepush.addApp(appName);

				this.log(`CodePush App ${appName} created successfully!`);

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
