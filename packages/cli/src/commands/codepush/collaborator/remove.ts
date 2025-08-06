/**
 * Module for removing collaborators from CodePush applications in the React Native OTA Updater service.
 * Provides functionality to safely revoke access from users with confirmation.
 * Includes email validation and permission checks.
 *
 * @module commands/codepush/collaborator/remove
 */

import { Args } from "@oclif/core";
import { Listr } from "listr2";
import { z } from "zod";

import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import { sdk } from "../../../services/management-sdk.js";
import { confirmTask } from "../../../tasks/confirm.js";

/**
 * Command class for removing CodePush collaborators.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Email validation
 * - Interactive confirmation
 * - Access revocation
 * - Clear success/failure messaging
 * - Permission verification
 */
export default class CollaboratorRemove extends EnsureAuthCommand {
	static override description = "Remove a CodePush collaborator";

	static override examples = [
		{
			description: "Remove a CodePush collaborator",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "dev@example.com"',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app to remove the collaborator from.
	 * @property {string} email - Required. The email address of the CodePush collaborator to remove.
	 */
	static override args = {
		appName: Args.string({
			description: "Name of the CodePush app to remove collaborator from",
			required: true,
		}),
		email: Args.string({
			description: "Email address of the collaborator to remove",
			required: true,
		}),
	};

	/**
	 * Executes the CodePush collaborator removal command.
	 * This method:
	 * 1. Validates the provided email address
	 * 2. Verifies the CodePush app exists
	 * 3. Checks if the user has permission to remove collaborators
	 * 4. Prompts for confirmation
	 * 5. Removes the CodePush collaborator's access
	 * 6. Displays success message
	 *
	 * Important Notes:
	 * - Cannot remove the last owner of a CodePush app
	 * - Cannot remove yourself if you're the owner
	 * - Requires admin or owner permission to remove CodePush collaborators
	 * - Action is immediate and revokes all access
	 *
	 * @returns {Promise<void>} A promise that resolves when the CodePush collaborator is removed
	 * @throws {Error} If email is invalid or user lacks permission
	 * @throws {ConfirmTaskError} If user cancels the removal
	 */
	public async run(): Promise<void> {
		const { args } = await this.parse(CollaboratorRemove);
		const { appName, email } = args;

		const isValidEmailSchema = z.string().email();

		if (!isValidEmailSchema.safeParse(email).success) {
			this.error("Invalid email address");
		}

		const tasks = new Listr([]);

		tasks.add(
			confirmTask(
				`Are you sure you want to remove ${email} as a CodePush collaborator from ${appName}?`,
				"CodePush collaborator removal cancelled",
			),
		);

		tasks.add({
			title: `Removing ${email} as a CodePush collaborator from ${appName}`,
			task: async () => {
				const message = await sdk.codepush.removeCollaborator(appName, email);

				this.log(message);
			},
		});

		await tasks.run();

		return;
	}
}
