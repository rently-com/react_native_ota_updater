/**
 * Base class for commands that require authentication.
 * Ensures user is authenticated before command execution.
 *
 * Features:
 * - Authentication validation
 * - Access key verification
 * - Command execution protection
 * - Session state checking
 *
 * @module common/ensure-auth-command
 */

import { BaseCommand } from "./base-command.js";

import { credentialsVault } from "../services/credentials-vault.js";

/**
 * Base class for authenticated commands
 * Extends BaseCommand with authentication requirement
 *
 * Features:
 * - Automatic authentication check
 * - Early command termination if not authenticated
 * - Access key validation
 *
 * @example
 * ```typescript
 * export default class ProtectedCommand extends EnsureAuthCommand {
 *   static description = "A command that requires authentication";
 *
 *   async run() {
 *     // This will only run if user is authenticated
 *     this.log("Executing protected command...");
 *   }
 * }
 * ```
 */
export abstract class EnsureAuthCommand extends BaseCommand<typeof EnsureAuthCommand> {
	/**
	 * Initializes the command and verifies authentication
	 * Throws error if user is not authenticated
	 *
	 * @returns {Promise<void>}
	 * @throws {Error} If user is not authenticated
	 */
	public async init(): Promise<void> {
		await super.init();

		// Check if not logged in
		const accessKey = credentialsVault.getAccessKey();
		if (!accessKey) {
			this.error("You are not logged in.");
		}
	}
}
