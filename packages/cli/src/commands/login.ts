/**
 * Module for authenticating users with the React Native OTA Updater service.
 * Provides multiple authentication methods including browser-based login and access key authentication.
 * Supports custom server URLs for self-hosted deployments.
 *
 * @module commands/login
 */

import { Flags } from "@oclif/core";

import { AuthCommand } from "../common/auth-command.js";
import { credentialsVault } from "../services/credentials-vault.js";

/**
 * Command class for user authentication.
 * Extends AuthCommand to inherit authentication functionality.
 *
 * Features:
 * - Browser-based authentication flow
 * - Direct access key authentication
 * - Custom server URL support
 * - Session persistence
 * - Automatic server detection
 */
export default class Login extends AuthCommand {
	static override description = "Authenticate with the React Native OTA Updater service to manage your apps";

	static override examples = [
		{
			description: "Login using browser-based authentication",
			command: "<%= config.bin %> <%= command.id %>",
		},
		{
			description: "Login using an access key",
			command: "<%= config.bin %> <%= command.id %> --accessKey myAccessKey",
		},
		{
			description: "Login to a custom server",
			command: "<%= config.bin %> <%= command.id %> --serverUrl http://localhost:3000",
		},
		{
			description: "Login with access key to custom server",
			command: "<%= config.bin %> <%= command.id %> -k myAccessKey -s http://localhost:3000",
		},
	];

	/**
	 * Command flags definition.
	 * Extends AuthCommand flags with access key option.
	 */
	static override flags = {
		accessKey: Flags.string({
			char: "k",
			description: "Access key for direct authentication",
			required: false,
		}),
		...AuthCommand.flags, // Spread the flags from AuthCommand
	};

	/**
	 * Executes the login command.
	 * This method:
	 * 1. Parses command flags (accessKey and serverUrl)
	 * 2. Configures the server URL:
	 *    - Uses provided serverUrl flag if specified
	 *    - Otherwise prompts user to select from predefined environments
	 * 3. If access key is provided:
	 *    - Authenticates directly using the key
	 * 4. If no access key:
	 *    - Initiates browser-based authentication flow
	 *    - Opens browser for user login
	 *    - Prompts for access key input
	 *    - Validates and stores credentials
	 *
	 * @returns {Promise<void>} A promise that resolves when authentication is complete
	 * @throws {Error} If authentication fails or invalid access key is provided
	 */
	public async run(): Promise<void> {
		const { flags } = await this.parse(Login);

		const { accessKey, serverUrl } = flags;

		let endpoint = serverUrl;

		if (endpoint) {
			if (endpoint.at(-1) === "/") {
				endpoint = endpoint.slice(0, -1);
			}

			credentialsVault.setServerUrl(endpoint);
		} else {
			credentialsVault.setServerUrl(await this.getServerUrl());
		}

		// Check if one of the flags were provided.
		if (accessKey) {
			return await this.authenticateWithAccessKey(accessKey);
		}

		// If no access key was provided, attempt external authentication
		return await this.loginWithExternalAuthentication();
	}
}
