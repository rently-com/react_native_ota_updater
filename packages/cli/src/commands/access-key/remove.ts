/**
 * Module for removing access keys in the React Native OTA Updater CLI.
 * This command allows users to delete access keys that are no longer needed.
 * Includes confirmation prompt to prevent accidental deletions.
 *
 * @module commands/access-key/remove
 */

import { Args } from "@oclif/core";
import { Listr } from "listr2";

import { EnsureAuthCommand } from "../../common/ensure-auth-command.js";
import { sdk } from "../../services/management-sdk.js";
import { confirmTask } from "../../tasks/confirm.js";

/**
 * Command class for removing access keys.
 * Extends EnsureAuthCommand to require authentication before execution.
 * Implements a two-step removal process with confirmation.
 *
 * Features:
 * - Interactive confirmation prompt
 * - Safe deletion with validation
 * - Clear success/failure messaging
 */
export default class AccessKeyRemove extends EnsureAuthCommand {
	static override description = "Remove an access key from your account";

	static override examples = [
		{
			description: "Remove an access key by name",
			command: '<%= config.bin %> <%= command.id %> "MyOldKey"',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} accessKeyName - Required. The name of the access key to remove.
	 */
	static override args = {
		accessKeyName: Args.string({
			description: "Name of the access key to remove",
			required: true,
		}),
	};

	/**
	 * Executes the access key removal command.
	 * This method:
	 * 1. Parses command arguments
	 * 2. Prompts for confirmation
	 * 3. Removes the access key if confirmed
	 * 4. Displays the removal confirmation message
	 *
	 * @returns {Promise<void>} A promise that resolves when the access key is removed
	 * @throws {Error} If the access key removal fails
	 * @throws {ConfirmTaskError} If the user cancels the removal
	 */
	public async run(): Promise<void> {
		const { args } = await this.parse(AccessKeyRemove);
		const { accessKeyName } = args;

		const tasks = new Listr([]);

		tasks.add(
			confirmTask(`Are you sure you want to remove the access key "${accessKeyName}"`, "Access key removal cancelled."),
		);

		tasks.add({
			title: "Removing access key",
			task: async () => {
				const message = await sdk.removeAccessKey(accessKeyName);

				this.log(message);
			},
		});

		return await tasks.run();
	}
}
