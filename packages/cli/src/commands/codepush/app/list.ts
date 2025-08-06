/**
 * Module for listing CodePush applications in the React Native OTA Updater service.
 * Displays all CodePush apps the authenticated user has access to, along with permission levels.
 * Supports both formatted table and JSON output formats.
 *
 * @module commands/codepush/app/list
 */

import CliTable3 from "cli-table3";
import { Listr } from "listr2";
import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import { sdk } from "../../../services/management-sdk.js";

/**
 * Command class for listing CodePush applications.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Lists all accessible CodePush apps
 * - Shows permission levels
 * - Supports JSON output
 * - Formatted table display
 * - Empty state handling
 */
export default class AppList extends EnsureAuthCommand {
	static override description = "List all CodePush applications you have access to";

	static override examples = [
		{
			description: "List CodePush apps in table format",
			command: "<%= config.bin %> <%= command.id %>",
		},
		{
			description: "List CodePush apps in JSON format",
			command: "<%= config.bin %> <%= command.id %> --json",
		},
	];

	/**
	 * Enables JSON output format option.
	 * When true, allows the command to output results in JSON format using the --json flag.
	 */
	static override enableJsonFlag = true;

	/**
	 * Executes the CodePush app listing command.
	 * This method:
	 * 1. Fetches all CodePush apps the user has access to
	 * 2. If no CodePush apps found, displays appropriate message
	 * 3. If JSON output requested, displays raw data
	 * 4. Otherwise, creates a formatted table with:
	 *    - Serial numbers
	 *    - App names
	 *    - Permission levels (Owner/Collaborator/etc.)
	 *
	 * The table format provides a clear overview of:
	 * - Which CodePush apps you have access to
	 * - Your role/permissions for each CodePush app
	 * - Quick reference for CodePush app names
	 *
	 * @returns {Promise<void>} A promise that resolves when CodePush apps are listed
	 * @throws {Error} If fetching CodePush apps fails
	 */
	public async run(): Promise<void> {
		const { flags } = await this.parse(AppList);
		const { json = false } = flags;

		const tasks = new Listr([]);

		tasks.add({
			title: "Fetching apps",
			task: async () => {
				const collaboratorApps = await sdk.codepush.getApps();

				if (!collaboratorApps.length) {
					this.log("No apps found");
					return;
				}

				if (json) {
					this.logJson(collaboratorApps);
				} else {
					const table = new CliTable3({ head: ["S.No", "Name", "Permission"] });

					let index = 1;

					/**
					 * Converts an app object to a table row.
					 * @param {Object} collaboratorApp - The app object with collaboration info
					 * @returns {string[]} Array of strings representing the table row
					 */
					function appToTableRow(collaboratorApp: (typeof collaboratorApps)[number]): string[] {
						const row: string[] = [index.toString(), collaboratorApp.app.name, collaboratorApp.permission];

						index++;
						return row;
					}

					for (const app of collaboratorApps) {
						table.push(appToTableRow(app));
					}

					this.log(table.toString());
				}
			},
		});

		await tasks.run();

		return;
	}
}
