/**
 * Base command class for all React Native OTA Updater CLI commands.
 * Provides common functionality and type definitions for CLI commands.
 *
 * Features:
 * - Type-safe command arguments and flags
 * - JSON output formatting
 * - Error handling
 * - Command lifecycle management
 * - Colorized output
 *
 * @module common/base-command
 */

import { Command, type Interfaces, ux } from "@oclif/core";
import chalk from "chalk";
import { PromptError } from "listr2";

import { APIError } from "../services/errors.js";
import { ConfirmTaskError } from "../tasks/confirm.js";

/**
 * Type definition for command arguments
 * Infers argument types from command definition
 * @template T Command class type
 */
export type ArgsType<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;

/**
 * Type definition for command flags
 * Infers flag types from command definition and base flags
 * @template T Command class type
 */
export type FlagsType<T extends typeof Command> = Interfaces.InferredFlags<
	(typeof BaseCommand)["baseFlags"] & T["flags"]
>;

/**
 * Base command class with shared functionality
 * All React Native OTA Updater CLI commands should extend this class
 *
 * Features:
 * - JSON output support
 * - Colorized logging
 * - Argument and flag parsing
 * - Error handling
 * - Command lifecycle hooks
 *
 * @template T Command class type
 *
 * @example
 * ```typescript
 * export default class MyCommand extends BaseCommand<typeof MyCommand> {
 *   static description = "My command description";
 *
 *   async run() {
 *     // Command implementation
 *     this.logJson({ success: true });
 *   }
 * }
 * ```
 */
export abstract class BaseCommand<T extends typeof Command> extends Command {
	/** Whether to enable JSON output flag */
	static enableJsonFlag = false;

	/** Parsed command flags */
	protected flags!: FlagsType<T>;

	/** Parsed command arguments */
	protected args!: ArgsType<T>;

	/** Chalk instance for colorized output */
	protected chalk = chalk;

	/**
	 * Outputs formatted JSON to stdout
	 * Applies color theme for better readability
	 *
	 * @param {unknown} json - Data to output as JSON
	 *
	 * @example
	 * ```typescript
	 * this.logJson({
	 *   success: true,
	 *   data: { id: 123 }
	 * });
	 * ```
	 */
	public logJson(json: unknown): void {
		const defaultTheme = {
			key: "blueBright",
			string: "greenBright",
			number: "blue",
			boolean: "redBright",
			null: "blackBright",
		};

		ux.stdout(ux.colorizeJson(json, { theme: defaultTheme }));
	}

	/**
	 * Initializes the command
	 * Parses arguments and flags
	 *
	 * @returns {Promise<void>}
	 * @throws {Error} If argument or flag parsing fails
	 */
	public async init(): Promise<void> {
		await super.init();

		const { args, flags } = await this.parse({
			flags: this.ctor.flags,
			baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
			enableJsonFlag: this.ctor.enableJsonFlag,
			args: this.ctor.args,
			strict: this.ctor.strict,
		});

		this.args = args as ArgsType<T>;
		this.flags = flags as FlagsType<T>;
	}

	/**
	 * Error handler for command execution
	 * Handles different error types with appropriate messages
	 *
	 * @param {Error & { exitCode?: number }} err - Error to handle
	 * @returns {Promise<any>} Error handling result
	 * @protected
	 */
	// biome-ignore lint/suspicious/noExplicitAny: Required for compatibility with oclif
	protected async catch(err: Error & { exitCode?: number }): Promise<any> {
		if (err instanceof PromptError) {
			return;
		}

		if (err instanceof ConfirmTaskError) {
			this.error(err.message);
		}

		if (err instanceof APIError) {
			this.error(err.message);
		}

		process.exitCode = err.exitCode ?? 1;

		throw err;
	}

	/**
	 * Cleanup handler for command execution
	 * Called after command completes or errors
	 *
	 * @param {Error | undefined} _ - Error if command failed
	 * @returns {Promise<any>} Cleanup result
	 * @protected
	 */
	// biome-ignore lint/suspicious/noExplicitAny: Required for compatibility with oclif
	protected async finally(_: Error | undefined): Promise<any> {
		// called after run and catch regardless of whether or not the command errored
		ux.action.stop();
		return super.finally(_);
	}
}
