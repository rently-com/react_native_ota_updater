/**
 * Base class for authentication-related commands.
 * Provides shared functionality for login, logout, and access key management.
 *
 * Features:
 * - External browser authentication
 * - Access key management
 * - Custom server URL support
 * - Session persistence
 * - Interactive prompts
 *
 * @module common/auth-command
 */

import os from "node:os";

import { input, select } from "@inquirer/prompts";
import { Flags } from "@oclif/core";
import { Listr } from "listr2";
import opener from "opener";

import { BaseCommand } from "./base-command.js";

import { SERVER_URLS, SERVER_URL_CHOICES } from "../config/constants.js";
import { credentialsVault } from "../services/credentials-vault.js";
import { sdk } from "../services/management-sdk.js";

/**
 * Base class for authentication commands
 * Extends BaseCommand with authentication-specific functionality
 *
 * Features:
 * - Server URL configuration
 * - Session state management
 * - External authentication flow
 * - Access key validation
 *
 * @example
 * ```typescript
 * export default class LoginCommand extends AuthCommand {
 *   static description = "Log in to CodePush";
 *
 *   async run() {
 *     await this.loginWithExternalAuthentication();
 *   }
 * }
 * ```
 */
export abstract class AuthCommand extends BaseCommand<typeof AuthCommand> {
	/** Command flags for authentication commands */
	static override flags = {
		serverUrl: Flags.string({
			char: "s",
			description:
				"URL of the custom CodePush server to authenticate against. If not provided, uses the default server.",
			required: false,
		}),
	};

	/**
	 * Initializes the authentication command
	 * Checks for existing session and clears if needed
	 *
	 * @returns {Promise<void>}
	 * @throws {Error} If initialization fails
	 */
	public async init(): Promise<void> {
		await super.init();

		// Check if already logged in
		const accessKey = credentialsVault.getAccessKey();
		if (accessKey) {
			this.warn("You are already logged in from this machine.");
			this.exit();
		} else {
			credentialsVault.clear();
		}
	}

	/**
	 * Initiates external authentication flow by opening the browser for user authentication.
	 * Constructs the authentication URL with hostname and displays instructions to the user.
	 *
	 * The authentication flow:
	 * 1. Gets the configured server URL
	 * 2. Builds login URL with hostname for callback
	 * 3. Displays instructions to user
	 * 4. Opens browser to authentication page
	 *
	 * @protected
	 * @returns {Promise<void>}
	 *
	 * @example
	 * ```typescript
	 * await this.initiateExternalAuthenticationAsync();
	 * ```
	 */
	protected async initiateExternalAuthenticationAsync() {
		const serverUrl = credentialsVault.getServerUrl();

		const hostname = os.hostname();
		const callbackEndpoint = `/cli-login?hostname=${hostname}`;
		const callbackUrl = `?callbackUrl=${callbackEndpoint}`;
		const url = `${serverUrl}/login${callbackUrl}`;

		const message = `A browser is being launched to authenticate your account. Follow the instructions it displays to complete your login.\n\n${this.chalk.underline.blue(url)}`;

		this.log(message);

		opener(url);
	}

	/**
	 * Completes the external authentication flow by:
	 * 1. Initiating browser-based authentication
	 * 2. Prompting for access key input
	 * 3. Authenticating with the provided key
	 * 4. Setting access key preservation preference
	 *
	 * @returns {Promise<void>} Promise that resolves when authentication is complete
	 * @protected
	 *
	 * @example
	 * ```typescript
	 * await this.loginWithExternalAuthentication();
	 * ```
	 */
	protected async loginWithExternalAuthentication() {
		this.initiateExternalAuthenticationAsync();

		this.log("");

		const accessKey = await this.requestAccessKey();

		await this.authenticateWithAccessKey(accessKey);

		return credentialsVault.setPreserveAccessKeyOnLogout(false);
	}

	/**
	 * Authenticates using an access key
	 * Validates the key and stores credentials if successful
	 *
	 * @param {string} accessKey - Access key to authenticate with
	 * @returns {Promise<void>}
	 * @protected
	 *
	 * @example
	 * ```typescript
	 * await this.authenticateWithAccessKey("my-access-key");
	 * ```
	 */
	protected async authenticateWithAccessKey(accessKey: string) {
		credentialsVault.setAccessKey(accessKey);

		const tasks = new Listr([
			{
				title: "Authenticating with the React Native OTA server...",
				task: async () => {
					await sdk
						.isAuthenticated()
						.then(() => this.log("Successfully authenticated with the React Native OTA server."))
						.catch(() => {
							credentialsVault.clear();
							throw new Error("Invalid access key.");
						});
				},
			},
		]);

		await tasks.run();
	}

	/**
	 * Prompts for access key input
	 * Provides interactive prompt for entering access key
	 *
	 * @returns {Promise<string>} Entered access key
	 * @protected
	 *
	 * @example
	 * ```typescript
	 * const key = await this.requestAccessKey();
	 * ```
	 */
	protected async requestAccessKey() {
		const accessKey = await input({
			message: "Please enter your access key: ",
			required: true,
			validate: (value) => (value.trim().length > 0 ? true : "Please enter a valid access key."),
		});

		return accessKey.trim();
	}

	/**
	 * Prompts for server URL selection
	 * Provides interactive prompt for selecting the server environment (Production, Staging, or Development)
	 *
	 * @returns {Promise<string>} Selected server URL
	 * @protected
	 *
	 * @example
	 * ```typescript
	 * const url = await this.getServerUrl();
	 * // Returns e.g. "http://localhost:3000"
	 * ```
	 */
	protected async getServerUrl(): Promise<string> {
		const selectedUrl = await select({
			message: "Select the server environment:",
			choices: SERVER_URL_CHOICES,
			default: SERVER_URLS.PRODUCTION,
		});

		return selectedUrl;
	}
}
