/**
 * Module for adding collaborators to CodePush applications in the React Native OTA Updater service.
 * Allows CodePush app owners to grant access to other users with specific permission levels.
 * Includes email validation and permission level enforcement.
 *
 * @module commands/codepush/collaborator/add
 */

import { Args } from "@oclif/core";
import { Listr } from "listr2";
import { z } from "zod";

import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import { Permission } from "../../../services/codepush-sdk.js";
import { sdk } from "../../../services/management-sdk.js";

/**
 * Command class for adding collaborators to CodePush applications.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - Email validation
 * - Multiple permission levels
 * - Access control management
 * - Clear success/failure messaging
 * - Permission enforcement
 */
export default class CollaboratorAdd extends EnsureAuthCommand {
	static override description = "Add a collaborator to a CodePush application";

	static override examples = [
		{
			description: "Add a collaborator with basic access",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "dev@example.com" collaborator',
		},
		{
			description: "Add an admin collaborator",
			command: '<%= config.bin %> <%= command.id %> "MyApp" "admin@example.com" admin',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app to add the collaborator to.
	 * @property {string} email - Required. The email address of the user to add as collaborator.
	 * @property {Permission} permission - Required. The permission level to grant (owner/admin/collaborator).
	 */
	static override args = {
		appName: Args.string({
			description: "Name of the CodePush app to add collaborator to",
			required: true,
		}),
		email: Args.string({
			description: "Email address of the user to add as CodePush collaborator",
			required: true,
		}),
		permission: Args.string({
			description: "Permission level to grant to the CodePush collaborator",
			options: [Permission.OWNER, Permission.COLLABORATOR, Permission.ADMIN],
			required: true,
		}),
	};

	/**
	 * Executes the CodePush collaborator addition command.
	 * This method:
	 * 1. Validates the provided email address
	 * 2. Checks if the CodePush app exists
	 * 3. Verifies current user has permission to add collaborators
	 * 4. Adds the CodePush collaborator with specified permissions
	 * 5. Displays success message
	 *
	 * Permission Levels:
	 * - admin: Can manage CodePush app settings and other collaborators
	 * - owner: Full control, can transfer ownership
	 * - collaborator: Can push updates and view CodePush app info
	 *
	 * @returns {Promise<void>} A promise that resolves when the CodePush collaborator is added
	 * @throws {Error} If email is invalid or user lacks permission
	 */
	public async run(): Promise<void> {
		const { args } = await this.parse(CollaboratorAdd);
		const { appName, email, permission } = args;
		const isValidEmailSchema = z.string().email();

		if (!isValidEmailSchema.safeParse(email).success) {
			this.error("Invalid email address");
		}

		const tasks = new Listr([]);

		tasks.add({
			title: `Adding Collaborator: ${email} to App: ${appName}`,
			task: async () => {
				const message = await sdk.codepush.addCollaborator(appName, email, permission as Permission);

				this.log(message);
			},
		});

		await tasks.run();

		return;
	}
}
