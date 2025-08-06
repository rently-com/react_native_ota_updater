/**
 * Module for displaying current user information in the React Native OTA Updater CLI.
 * Provides a way to verify the currently authenticated user and session status.
 * Useful for confirming login state and account details.
 *
 * @module commands/whoami
 */

import { Listr } from "listr2";

import { EnsureAuthCommand } from "../common/ensure-auth-command.js";
import { sdk } from "../services/management-sdk.js";

/**
 * Command class for displaying current user information.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Current user verification
 * - Session status checking
 * - Account information display
 * - Authentication validation
 */
export default class Whoami extends EnsureAuthCommand {
	static override description = "Display account information for the current session";

	static override examples = [
		{
			description: "Show currently logged in user",
			command: "<%= config.bin %> <%= command.id %>",
		},
	];

	/**
	 * Executes the whoami command.
	 * This method:
	 * 1. Verifies authentication status
	 * 2. Retrieves current user information
	 * 3. Displays user email and account details
	 *
	 * The command is useful for:
	 * - Verifying the current login session
	 * - Confirming user identity
	 * - Checking authentication status
	 * - Debugging session issues
	 *
	 * @returns {Promise<void>} A promise that resolves when user info is displayed
	 * @throws {Error} If user information cannot be retrieved
	 */
	public async run(): Promise<void> {
		const tasks = new Listr([
			{
				title: "Fetching Account Info...",
				task: async () => {
					const account = await sdk.getUserInfo();
					this.log(`You are logged in as ${account.email} in ${sdk.getBaseUrl()}`);
				},
			},
		]);

		return await tasks.run();
	}
}
