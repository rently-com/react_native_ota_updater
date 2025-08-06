/**
 * CodePush REST Headers Module
 *
 * This module defines and manages CodePush-specific HTTP headers used for version tracking
 * and client identification. It provides constants and utility functions for working with
 * headers related to API versions, CLI versions, SDK versions, and plugin information.
 *
 * Features:
 * - API version management
 * - CLI version tracking
 * - SDK version tracking
 * - Plugin information handling
 * - Type-safe header extraction
 */

import type { HonoRequest } from "hono";

/**
 * Current version of the CodePush API
 * Used for version compatibility checking
 * @constant {number}
 */
export const API_VERSION = 2;

/**
 * Header name for CodePush API version
 * Used to specify the API version in requests and responses
 * @constant {string}
 */
export const API_VERSION_HEADER = "X-CodePush-API-Version";

/**
 * Header name for CodePush CLI version
 * Used to track the version of the CLI making the request
 * @constant {string}
 */
export const CLI_VERSION_HEADER = "X-CodePush-CLI-Version";

/**
 * Header name for CodePush SDK version
 * Used to track the version of the SDK making the request
 * @constant {string}
 */
export const SDK_VERSION_HEADER = "X-CodePush-SDK-Version";

/**
 * Header name for CodePush plugin name
 * Used to identify the plugin making the request
 * @constant {string}
 */
export const PLUGIN_NAME_HEADER = "X-CodePush-Plugin-Name";

/**
 * Header name for CodePush plugin version
 * Used to track the version of the plugin making the request
 * @constant {string}
 */
export const PLUGIN_VERSION_HEADER = "X-CodePush-Plugin-Version";

/**
 * Retrieves the CLI version from the request headers
 *
 * @param {HonoRequest} req - The Hono request object
 * @returns {string} The CLI version or "Unknown" if not provided
 *
 * @example
 * ```typescript
 * app.get('/api/status', (c) => {
 *   const cliVersion = getCliVersion(c.req);
 *   console.log(`Request from CLI version: ${cliVersion}`);
 * });
 * ```
 */
export function getCliVersion(req: HonoRequest): string {
	return req.header(CLI_VERSION_HEADER) ?? "Unknown";
}

/**
 * Retrieves the SDK version from the request headers
 *
 * @param {HonoRequest} req - The Hono request object
 * @returns {string} The SDK version or "Unknown" if not provided
 *
 * @example
 * ```typescript
 * app.get('/api/update', (c) => {
 *   const sdkVersion = getSdkVersion(c.req);
 *   console.log(`Update check from SDK version: ${sdkVersion}`);
 * });
 * ```
 */
export function getSdkVersion(req: HonoRequest): string {
	return req.header(SDK_VERSION_HEADER) ?? "Unknown";
}

/**
 * Retrieves the plugin name from the request headers
 *
 * @param {HonoRequest} req - The Hono request object
 * @returns {string} The plugin name or "Unknown" if not provided
 *
 * @example
 * ```typescript
 * app.get('/api/sync', (c) => {
 *   const pluginName = getPluginName(c.req);
 *   console.log(`Sync request from plugin: ${pluginName}`);
 * });
 * ```
 */
export function getPluginName(req: HonoRequest): string {
	return req.header(PLUGIN_NAME_HEADER) ?? "Unknown";
}

/**
 * Retrieves the plugin version from the request headers
 *
 * @param {HonoRequest} req - The Hono request object
 * @returns {string} The plugin version or "Unknown" if not provided
 *
 * @example
 * ```typescript
 * app.get('/api/check', (c) => {
 *   const pluginVersion = getPluginVersion(c.req);
 *   console.log(`Check from plugin version: ${pluginVersion}`);
 * });
 * ```
 */
export function getPluginVersion(req: HonoRequest): string {
	return req.header(PLUGIN_VERSION_HEADER) ?? "Unknown";
}
