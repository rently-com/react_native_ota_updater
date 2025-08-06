/**
 * Base class for access key management commands.
 * Provides shared functionality for creating, listing, and managing access keys.
 *
 * Features:
 * - Time-to-live (TTL) configuration
 * - Authentication requirement enforcement
 * - Duration string parsing
 * - Access key validation
 *
 * @module common/access-key-command
 */

import { Flags } from "@oclif/core";

import { EnsureAuthCommand } from "../common/ensure-auth-command.js";

/**
 * Base class for access key commands
 * Extends EnsureAuthCommand with access key specific functionality
 *
 * Features:
 * - TTL configuration via flags
 * - Duration string support (e.g., "60d", "5m", "1y")
 * - Authentication enforcement
 *
 * @example
 * ```typescript
 * export default class CreateKeyCommand extends AccessKeyCommand {
 *   static description = "Create a new access key";
 *
 *   async run() {
 *     const { flags } = await this.parse(CreateKeyCommand);
 *     const key = await sdk.addAccessKey("my-key", flags.ttl);
 *     this.log(`Created access key: ${key}`);
 *   }
 * }
 * ```
 */
export abstract class AccessKeyCommand extends EnsureAuthCommand {
	/** Command flags for access key commands */
	static override flags = {
		ttl: Flags.string({
			char: "t",
			default: "60d",
			description: `Time-to-live duration for the access key. Accepts duration strings like '5m' (5 minutes), '60d' (60 days), or '1y' (1 year). [default: '60d']`,
			required: false,
		}),
	};
}
