/**
 * Command to open the credentials vault configuration file.
 * Opens the file in the default text editor or file explorer.
 *
 * Features:
 * - Opens config in default text editor
 * - Shows config file location
 * - Platform-specific file handling
 * - No authentication required
 *
 * @module commands/config
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { BaseCommand } from "../common/base-command.js";
import { credentialsVault } from "../services/credentials-vault.js";

const execAsync = promisify(exec);

/**
 * Command class for opening the config file
 * Extends BaseCommand as authentication is not required
 *
 * Features:
 * - Cross-platform support
 * - Config file location display
 * - Default application opening
 */
export default class Config extends BaseCommand<typeof Config> {
	static override description = "Open the credentials vault configuration file";

	static override examples = [
		{
			description: "Open the config file in default editor or file explorer",
			command: "<%= config.bin %> <%= command.id %>",
		},
	];

	/**
	 * Opens the config file using platform-specific commands
	 * Uses 'open' on macOS, 'explorer' on Windows, and 'xdg-open' on Linux
	 *
	 * @returns {Promise<void>}
	 */
	public async run(): Promise<void> {
		const configPath = credentialsVault.getConfigPath();
		this.log(`Config file location: ${configPath}`);

		const platform = process.platform;
		let command: string;

		switch (platform) {
			case "darwin":
				command = `open "${configPath}"`;
				break;
			case "win32":
				command = `explorer "${configPath}"`;
				break;
			default: // Linux and others
				command = `xdg-open "${configPath}"`;
				break;
		}

		try {
			await execAsync(command);
			this.log("Config file opened successfully.");
		} catch (error) {
			this.error(`Failed to open config file: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}
