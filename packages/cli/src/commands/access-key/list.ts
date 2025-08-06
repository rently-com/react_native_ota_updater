/**
 * Module for listing access keys in the React Native OTA Updater CLI.
 * This command displays all access keys associated with the authenticated account,
 * showing their names, creation dates, and expiration dates.
 *
 * @module commands/access-key/list
 */

import chalk from "chalk";
import CliTable3 from "cli-table3";
import { Listr } from "listr2";
import { EnsureAuthCommand } from "../../common/ensure-auth-command.js";
import { formatRelativeDateFromNow } from "../../lib/duration.js";
import { sdk } from "../../services/management-sdk.js";

/**
 * Command class for listing access keys.
 * Extends EnsureAuthCommand to require authentication before execution.
 * Displays access keys in either a formatted table or JSON format.
 * Active keys are shown in normal text, while expired keys are dimmed.
 *
 */
export default class AccessKeyList extends EnsureAuthCommand {
	static override description = "List all access keys associated with your account";

	static override examples = [
		{
			description: "List all access keys in a formatted table",
			command: "<%= config.bin %> <%= command.id %>",
		},
		{
			description: "List all access keys in JSON format for programmatic use",
			command: "<%= config.bin %> <%= command.id %> --json",
		},
	];

	/**
	 * Enables JSON output format option.
	 * When true, allows the command to output results in JSON format using the --json flag.
	 */
	static override enableJsonFlag = true;

	/**
	 * Executes the access key listing command.
	 * This method:
	 * 1. Fetches all access keys using the management SDK
	 * 2. If JSON output is requested, displays the raw data
	 * 3. Otherwise, creates a formatted table with:
	 *    - Serial numbers
	 *    - Key names
	 *    - Creation dates (relative to now)
	 *    - Expiration dates (relative to now)
	 * 4. Active keys are displayed normally, expired keys are dimmed
	 *
	 * @returns {Promise<void>} A promise that resolves when the access keys are listed
	 * @throws {Error} If fetching access keys fails
	 */
	public async run(): Promise<void> {
		const { flags } = await this.parse(AccessKeyList);
		const { json = false } = flags;

		const tasks = new Listr([]);

		tasks.add({
			title: "Fetching access keys",
			task: async () => {
				const accessKeys = await sdk.getAccessKeys();

				if (json) {
					this.logJson(accessKeys);
				} else {
					const table = new CliTable3({ head: ["S.No", "Name", "Created", "Expires"] });
					const now = new Date().getTime();

					let index = 1;

					/**
					 * Checks if an access key is expired.
					 * @param {Object} key - The access key object to check
					 * @returns {boolean} True if the key is expired, false otherwise
					 */
					function isExpired(key: (typeof accessKeys)[number]): boolean {
						return now >= new Date(key.expiresAt).getTime();
					}

					/**
					 * Converts an access key object to a table row.
					 * @param {Object} key - The access key object to convert
					 * @param {boolean} dim - Whether to dim the row (used for expired keys)
					 * @returns {string[]} Array of strings representing the table row
					 */
					function keyToTableRow(key: (typeof accessKeys)[number], dim: boolean): string[] {
						const row: string[] = [
							index.toString(),
							key.name,
							formatRelativeDateFromNow(key.createdAt),
							formatRelativeDateFromNow(key.expiresAt),
						];

						if (dim) {
							row.forEach((col: string, index: number) => {
								row[index] = chalk.dim(col);
							});
						}

						index++;
						return row;
					}

					for (const key of accessKeys) {
						if (!isExpired(key)) {
							table.push(keyToTableRow(key, /*dim*/ false));
						}
					}
					for (const key of accessKeys) {
						if (isExpired(key)) {
							table.push(keyToTableRow(key, /*dim*/ true));
						}
					}

					this.log(table.toString());
				}
			},
		});

		await tasks.run();

		return;
	}
}
