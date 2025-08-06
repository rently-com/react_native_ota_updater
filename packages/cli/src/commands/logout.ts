/**
 * Module for logging out users from the React Native OTA Updater service.
 * Handles session termination, credential cleanup, and access key management.
 * Supports both local and server-side session cleanup.
 *
 * @module commands/logout
 */

import os from "node:os";
import { Listr } from "listr2";
import { EnsureAuthCommand } from "../common/ensure-auth-command.js";
import { credentialsVault } from "../services/credentials-vault.js";
import { sdk } from "../services/management-sdk.js";

/**
 * Command class for user logout.
 * Extends EnsureAuthCommand to ensure user is authenticated before logout.
 *
 * Features:
 * - Local credential cleanup
 * - Server-side session termination
 * - Machine-specific access key cleanup
 * - Configurable access key preservation
 * - Secure credential removal
 */
export default class Logout extends EnsureAuthCommand {
	static override description = "Log out of the current session and clean up credentials";

	static override examples = [
		{
			description: "Log out and remove all session data",
			command: "<%= config.bin %> <%= command.id %>",
		},
	];

	/**
	 * Executes the logout command.
	 * This method:
	 * 1. Checks access key preservation settings
	 * 2. If not preserving access keys:
	 *    - Identifies the current machine
	 *    - Removes all access keys created by this machine
	 *    - Terminates the server-side session
	 * 3. Clears local credentials
	 * 4. Confirms successful logout
	 *
	 * The logout process is designed to be thorough, removing both local and
	 * server-side session data. However, it can be configured to preserve
	 * access keys if needed (e.g., for CI/CD environments).
	 *
	 * @returns {Promise<void>} A promise that resolves when logout is complete
	 * @throws {Error} If logout operations fail
	 */
	public async run(): Promise<void> {
		const preserveAccessKeyOnLogout = credentialsVault.getPreserveAccessKeyOnLogout();

		const tasks = new Listr([]);

		if (!preserveAccessKeyOnLogout) {
			const machineName = os.hostname();

			tasks.add({
				title: `Logging out sessions created by this machine ${machineName}...`,
				task: async () => {
					await sdk.removeAccessKeyCreatedBy(machineName);

					await sdk.logout();
				},
				exitOnError: false,
			});
		}

		tasks.add({
			title: `Clearing credentials from ${credentialsVault.getConfigPath()}`,
			task: () => {
				credentialsVault.clear();
				this.log("Successfully logged out.");
			},
		});

		return await tasks.run();
	}
}
