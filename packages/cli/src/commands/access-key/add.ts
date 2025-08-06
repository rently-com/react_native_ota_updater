/**
 * Module for creating new access keys in the React Native OTA Updater CLI.
 * This command allows users to generate new access keys with customizable names and expiration times.
 * Access keys are used for authentication with the React Native OTA Updater service.
 *
 * @module commands/access-key/add
 */

import { Args } from "@oclif/core";
import { Listr } from "listr2";

import { AccessKeyCommand } from "../../common/access-key-command.js";
import { formatRelativeDateFromNow, parseDurationMilliseconds } from "../../lib/duration.js";
import { sdk } from "../../services/management-sdk.js";

/**
 * Command class for creating new access keys.
 * Extends the base AccessKeyCommand to inherit authentication and TTL functionality.
 */
export default class AccessKeyAdd extends AccessKeyCommand {
	static override description =
		"Create a new access key associated with your account. Access keys are used to authenticate with the React Native OTA Updater service and can be configured with custom names and expiration times.";

	static override examples = [
		{
			description: "Create a new access key with default expiration (30 days)",
			command: '<%= config.bin %> <%= command.id %> "MyNewKey"',
		},
		{
			description: "Create a new access key that expires in 7 days",
			command: '<%= config.bin %> <%= command.id %> "WeeklyKey" --ttl 7d',
		},
		{
			description: "Create a new access key that expires in 12 hours",
			command: '<%= config.bin %> <%= command.id %> "TempKey" --ttl 12h',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} accessKeyName - Required. The display name for the new access key.
	 *                                    This name helps identify the key in listings and management.
	 */
	static override args = {
		accessKeyName: Args.string({
			description: "Name to identify this access key in listings and management",
			required: true,
		}),
	};

	/**
	 * Executes the access key creation command.
	 * This method:
	 * 1. Parses command arguments and flags
	 * 2. Converts the TTL duration string to milliseconds
	 * 3. Creates the access key using the management SDK
	 * 4. Displays the new access key token and expiration information
	 *
	 * @returns {Promise<void>} A promise that resolves when the access key is created
	 * @throws {Error} If the access key creation fails
	 */
	public async run(): Promise<void> {
		const { args, flags } = await this.parse(AccessKeyAdd);

		const { ttl } = flags;
		const { accessKeyName } = args;

		const ttlMilliseconds = parseDurationMilliseconds(ttl);

		const tasks = new Listr([
			{
				title: "Creating access key",
				task: async () => {
					// Create the access key
					const accessKey = await sdk.addAccessKey(accessKeyName, ttlMilliseconds);

					// Format the success message with key details
					const keyName = this.chalk.cyan.italic(accessKeyName);
					const expiryDate = this.chalk.cyan.italic(formatRelativeDateFromNow(accessKey.expiresAt));
					const keyToken = this.chalk.cyan.italic(accessKey.token);

					// Log the success message
					this.log(`Successfully created the ${keyName} access key that expires ${expiryDate}: ${keyToken}`);

					// Log security reminder
					this.log("\nImportant: Store this access key securely - it cannot be retrieved later.");
				},
			},
		]);

		return await tasks.run();
	}
}
