/**
 * Secure storage and management of React Native OTA Updater credentials.
 * Provides a persistent, secure storage for access keys and configuration.
 *
 * Features:
 * - Secure storage of access keys
 * - Server URL configuration
 * - Persistence settings management
 * - Change notification system
 * - Type-safe configuration schema
 *
 * @module credentials-vault
 */

import Conf, { type Schema } from "conf";

import { CONF_PROJECT_NAME } from "../config/constants.js";

/**
 * Keys used to access credential values in storage
 * @const
 */
const credentialKeys = {
	/** Key for storing the access token */
	accessKey: "accessKey",
	/** Key for storing the server URL */
	serverUrl: "serverUrl",
	/** Key for the logout behavior setting */
	preserveAccessKeyOnLogout: "preserveAccessKeyOnLogout",
} as const;

/**
 * Type definition for stored credentials
 * @interface Credentials
 */
type Credentials = {
	[credentialKeys.accessKey]: string;
	[credentialKeys.serverUrl]: string;
	[credentialKeys.preserveAccessKeyOnLogout]: boolean;
};

/**
 * Schema definition for credential storage validation
 * Ensures type safety and data integrity
 */
const credentialsSchema: Schema<Credentials> = {
	[credentialKeys.accessKey]: {
		type: "string",
		minLength: 1,
	},
	[credentialKeys.serverUrl]: {
		type: "string",
		default: "",
	},
	[credentialKeys.preserveAccessKeyOnLogout]: {
		type: "boolean",
		default: true,
	},
};

/**
 * Configuration instance for credential storage
 * Uses the Conf package for secure, persistent storage
 */
const credentialsConf = new Conf<Credentials>({
	projectName: CONF_PROJECT_NAME,
	schema: credentialsSchema,
	watch: true,
});

/**
 * Manages secure storage and retrieval of React Native OTA Updater credentials
 * Provides methods for accessing and modifying stored credentials
 *
 * @example
 * ```typescript
 * const vault = new CredentialsVault(credentialsConf);
 *
 * // Store an access key
 * vault.setAccessKey("my-access-key");
 *
 * // Get the server URL
 * const serverUrl = vault.getServerUrl();
 *
 * // Listen for changes
 * vault.onDidAnyChange(() => {
 *   console.log("Credentials changed");
 * });
 * ```
 */
class CredentialsVault {
	/**
	 * Creates a new CredentialsVault instance
	 * @param {Conf<Credentials>} store - Configuration store instance
	 */
	constructor(private readonly store: Conf<Credentials>) {}

	/**
	 * Registers a callback for credential changes
	 * @param {() => void} callback - Function to call when any credential changes
	 */
	onDidAnyChange(callback: () => void) {
		this.store.onDidAnyChange(callback);
	}

	/**
	 * Gets the path to the credentials configuration file
	 * @returns {string} Path to the configuration file
	 */
	getConfigPath() {
		return this.store.path;
	}

	/**
	 * Clears all stored credentials
	 */
	clear() {
		this.store.clear();
	}

	/**
	 * Retrieves the stored access key
	 * @returns {string} The stored access key
	 */
	getAccessKey() {
		return this.store.get(credentialKeys.accessKey);
	}

	/**
	 * Sets a new access key
	 * @param {string} accessKey - The access key to store
	 */
	setAccessKey(accessKey: Credentials["accessKey"]) {
		this.store.set(credentialKeys.accessKey, accessKey);
	}

	/**
	 * Gets the configured server URL
	 * @returns {string} The server URL
	 */
	getServerUrl() {
		return this.store.get(credentialKeys.serverUrl);
	}

	/**
	 * Sets the server URL
	 * @param {string} serverUrl - The server URL to use
	 */
	setServerUrl(serverUrl: Credentials["serverUrl"]) {
		this.store.set(credentialKeys.serverUrl, serverUrl);
	}

	/**
	 * Checks if access key should be preserved on logout
	 * @returns {boolean} True if access key should be preserved
	 */
	getPreserveAccessKeyOnLogout() {
		return this.store.get(credentialKeys.preserveAccessKeyOnLogout);
	}

	/**
	 * Sets whether to preserve access key on logout
	 * @param {boolean} preserve - Whether to preserve the access key
	 */
	setPreserveAccessKeyOnLogout(preserve: Credentials["preserveAccessKeyOnLogout"]) {
		this.store.set(credentialKeys.preserveAccessKeyOnLogout, preserve);
	}
}

/**
 * Default instance of the CredentialsVault
 * Use this for most credential management operations
 *
 * @example
 * ```typescript
 * import { credentialsVault } from "./credentials-vault";
 *
 * // Use the default instance
 * const accessKey = credentialsVault.getAccessKey();
 * ```
 */
export const credentialsVault = new CredentialsVault(credentialsConf);
