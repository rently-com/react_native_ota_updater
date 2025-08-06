/**
 * Task confirmation utilities for interactive CLI operations.
 * Provides a standardized way to prompt users for confirmation before executing tasks.
 *
 * Features:
 * - Interactive confirmation prompts
 * - Custom error handling
 * - Configurable messages
 * - Integration with Listr2 task runner
 *
 * @module tasks/confirm
 */

import { ListrEnquirerPromptAdapter } from "@listr2/prompt-adapter-enquirer";
import type { ListrTask } from "listr2";

/**
 * Custom error class for confirmation-related errors
 * Thrown when a user cancels a confirmation prompt
 *
 * @example
 * ```typescript
 * throw new ConfirmTaskError("Operation cancelled by user");
 * ```
 */
export class ConfirmTaskError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = "ConfirmTaskError";
	}
}

/**
 * Creates a Listr2 task that prompts the user for confirmation
 * The task will throw a ConfirmTaskError if the user does not confirm
 *
 * @param {string} message - The confirmation message to display
 * @param {string} [cancelMessage] - Optional message to display when cancelled
 * @returns {ListrTask} A Listr2 task that handles confirmation
 * @throws {ConfirmTaskError} When the user does not confirm
 *
 * @example
 * ```typescript
 * const tasks = new Listr([
 *   confirmTask(
 *     "Are you sure you want to delete this app?",
 *     "App deletion cancelled."
 *   ),
 *   {
 *     title: "Deleting app",
 *     task: () => deleteApp()
 *   }
 * ]);
 *
 * try {
 *   await tasks.run();
 * } catch (error) {
 *   if (error instanceof ConfirmTaskError) {
 *     console.log("Operation cancelled");
 *   }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for compatibility with Listr2 types
export const confirmTask = (message: string, cancelMessage?: string): ListrTask<any> => {
	return {
		task: async (_, task) => {
			const wasConfirmed = await task.prompt(ListrEnquirerPromptAdapter).run<boolean>({
				type: "Toggle",
				message,
				initial: false,
			});

			if (!wasConfirmed) {
				throw new ConfirmTaskError(cancelMessage ?? "Operation cancelled.");
			}
		},
	};
};
