/**
 * Global constants for the React Native OTA Updater CLI.
 * Provides configuration values and version information.
 *
 * Features:
 * - Server URL configuration
 * - Version tracking
 * - Project identification
 * - Environment-aware settings
 *
 * @module config/constants
 */

import { createRequire } from "node:module";
import { BRANDING } from "./branding.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json");
const version = pkg.version as string;

/**
 * Server URLs for different environments
 * Contains the base URLs for production, staging, and development servers
 * @constant {Object}
 * @property {string} PRODUCTION - Production server URL
 * @property {string} STAGING - Staging server URL
 * @property {string} DEVELOPMENT - Local development server URL
 */
export const SERVER_URLS = {
	PRODUCTION: BRANDING.SERVER_URLS.PRODUCTION,
	STAGING: BRANDING.SERVER_URLS.STAGING,
	DEVELOPMENT: "http://localhost:3000",
} as const;

/**
 * Choices for server URL selection in CLI prompts
 * Maps friendly names to server URLs for environment selection
 * @constant {Array<{name: string, value: string, description: string}>}
 */
export const SERVER_URL_CHOICES = [
	{
		name: "Production",
		value: SERVER_URLS.PRODUCTION,
		description: `Production server [${SERVER_URLS.PRODUCTION}]`,
	},
	{
		name: "Staging",
		value: SERVER_URLS.STAGING,
		description: `Staging server [${SERVER_URLS.STAGING}]`,
	},
	{
		name: "Development",
		value: SERVER_URLS.DEVELOPMENT,
		description: `Local development server [${SERVER_URLS.DEVELOPMENT}]`,
	},
] as const;

/**
 * Version of the CodePush SDK
 * Matches the package version from package.json
 * @constant {string}
 */
export const CODEPUSH_SDK_VERSION = version;

/**
 * Version of the CodePush CLI
 * Matches the package version from package.json
 * @constant {string}
 */
export const CODEPUSH_CLI_VERSION = version;

/**
 * Project name for configuration storage
 * Used by the credentials vault and other persistent storage
 * @constant {string}
 */
export const CONF_PROJECT_NAME = "rnota-cli";

/**
 * Name of the CLI
 * @constant {string}
 */
export const CLI_NAME = "rnota-cli";

/**
 * Command name for the CLI
 * @constant {string}
 */
export const CLI_CMD = "rnota";
