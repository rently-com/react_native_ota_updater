/**
 * Module for listing collaborators of CodePush applications in the React Native OTA Updater service.
 * Displays all users who have access to a CodePush app along with their permission levels.
 * Supports both formatted table and JSON output formats.
 *
 * @module commands/codepush/collaborator/list
 */

import { Args } from "@oclif/core";
import CliTable3 from "cli-table3";
import { Listr } from "listr2";
import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import { sdk } from "../../../services/management-sdk.js";

/**
 * Command class for listing CodePush application collaborators.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Lists all collaborators
 * - Shows permission levels
 * - Supports JSON output
 * - Formatted table display
 * - Permission visibility
 */
export default class CollaboratorList extends EnsureAuthCommand {
	static override description = "List all collaborators for a CodePush application";

	static override examples = [
		{
			description: "List collaborators in table format",
			command: '<%= config.bin %> <%= command.id %> "MyApp"',
		},
		{
			description: "List collaborators in JSON format",
			command: '<%= config.bin %> <%= command.id %> "MyApp" --json',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app to list collaborators for.
	 */
	static override args = {
		appName: Args.string({
			description: "Name of the CodePush app to list collaborators for",
			required: true,
		}),
	};

	/**
	 * Enables JSON output format option.
	 * When true, allows the command to output results in JSON format using the --json flag.
	 */
	static override enableJsonFlag = true;

	/**
	 * Executes the CodePush collaborator listing command.
	 * This method:
	 * 1. Verifies the CodePush app exists
	 * 2. Fetches all collaborators
	 * 3. If JSON output requested, displays raw data
	 * 4. Otherwise, creates a formatted table with:
	 *    - Serial numbers
	 *    - Collaborator email addresses
	 *    - Permission levels
	 *
	 * The table format provides a clear overview of:
	 * - Who has access to the CodePush app
	 * - What level of access each person has
	 * - Quick reference for access management
	 *
	 * @returns {Promise<void>} A promise that resolves when collaborators are listed
	 * @throws {Error} If app doesn't exist or user lacks permission
	 */
	public async run(): Promise<void> {
		const { args, flags } = await this.parse(CollaboratorList);
		const { appName } = args;
		const { json = false } = flags;

		const tasks = new Listr([]);

		tasks.add({
			title: `Fetching Collaborators for App: ${appName}`,
			task: async () => {
				const collaborators = await sdk.codepush.getCollaborators(appName);

				if (json) {
					this.logJson(collaborators);
				} else {
					const table = new CliTable3({ head: ["S.No", "Email", "Permission"] });

					let index = 1;

					for (const collaborator of collaborators) {
						const row = [index.toString(), collaborator.user.email, collaborator.permission];

						table.push(row);

						index++;
					}

					this.log(table.toString());
				}
			},
		});

		await tasks.run();

		return;
	}
}
