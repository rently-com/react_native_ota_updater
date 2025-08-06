/**
 * Module for updating existing access keys in the React Native OTA Updater CLI.
 * This command allows users to modify access key properties such as name and expiration time.
 * Supports partial updates - users can update either name, TTL, or both.
 *
 * @module commands/access-key/patch
 */

import { Args, Flags } from "@oclif/core";
import { CLIError } from "@oclif/core/errors";
import { Listr } from "listr2";
import { AccessKeyCommand } from "../../common/access-key-command.js";
import { parseDurationMilliseconds } from "../../lib/duration.js";
import { sdk } from "../../services/management-sdk.js";

/**
 * Command class for updating access key properties.
 * Extends the base AccessKeyCommand to inherit authentication and TTL functionality.
 * Allows modification of access key name and/or expiration time.
 */
export default class AccessKeyPatch extends AccessKeyCommand {
	static override description = "Update the name or expiration time of an existing access key";

	static override examples = [
		{
			description: "Update the name of an access key",
			command: '<%= config.bin %> <%= command.id %> "OldKeyName" -n "NewKeyName"',
		},
		{
			description: "Update the expiration time of an access key",
			command: '<%= config.bin %> <%= command.id %> "MyKey" --ttl 30d',
		},
		{
			description: "Update both name and expiration time",
			command: '<%= config.bin %> <%= command.id %> "OldKeyName" -n "NewKeyName" --ttl 90d',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} accessKeyName - Required. The current name of the access key to update.
	 */
	static override args = {
		accessKeyName: Args.string({
			description: "Current name of the access key to update",
			required: true,
		}),
	};

	/**
	 * Command flags definition.
	 * Extends AccessKeyCommand flags with name update option.
	 */
	static override flags = {
		name: Flags.string({
			char: "n",
			description: "New name for the access key",
			required: false,
			default: undefined,
		}),
		...AccessKeyCommand.flags,
	};

	/**
	 * Executes the access key update command.
	 * This method:
	 * 1. Parses command arguments and flags
	 * 2. Validates that at least one update parameter is provided
	 * 3. Converts TTL duration string to milliseconds if provided
	 * 4. Updates the access key using the management SDK
	 * 5. Displays the update confirmation message
	 *
	 * @returns {Promise<void>} A promise that resolves when the access key is updated
	 * @throws {CLIError} If no update parameters are provided
	 * @throws {Error} If the access key update fails
	 */
	public async run(): Promise<void> {
		const { args, flags } = await this.parse(AccessKeyPatch);
		const { accessKeyName } = args;
		const { ttl, name } = flags;

		const tasks = new Listr([]);

		const willUpdateName: boolean = !!name && accessKeyName !== name;
		const willUpdateTtl: boolean = !!ttl;

		if (!willUpdateName && !willUpdateTtl) {
			throw new CLIError("A new name and/or TTL must be provided.");
		}

		const ttlMilliseconds = willUpdateTtl ? parseDurationMilliseconds(ttl) : undefined;

		tasks.add({
			title: "Updating access key",
			task: async () => {
				const message = await sdk.patchAccessKey(accessKeyName, name, ttlMilliseconds);

				this.log(message);
			},
		});

		return await tasks.run();
	}
}
