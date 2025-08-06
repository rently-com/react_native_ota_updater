/**
 * CodePush Collaborator Schema Definition
 * This module defines the structure for managing access control and permissions
 * for users collaborating on CodePush applications.
 */

import { relations } from "drizzle-orm";
import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";

import { tableActions } from "../_table";
import { permissionsEnum } from "../common";
import { user } from "../user";
import { codepush_app } from "./app";

/**
 * CodePush Collaborator Table Schema
 * Represents the relationship between users and CodePush applications,
 * defining their access levels and permissions.
 *
 * Features:
 * - Composite primary key of user ID and app ID
 * - Role-based access control using permission levels
 * - Automatic cascade deletion with user or app
 * - Many-to-many relationship between users and apps
 */
export const codepush_collaborator = pgTable(
	"codepush_collaborator",
	{
		/** Permission level for the collaborator (admin, owner, collaborator) */
		permission: permissionsEnum().notNull(),

		/** Reference to the collaborating user */
		userId: text()
			.notNull()
			.references(() => user.id, tableActions),

		/** Reference to the CodePush application */
		appId: text()
			.notNull()
			.references(() => codepush_app.id, tableActions),
	},
	(table) => [
		// Composite primary key of user and app
		primaryKey({
			columns: [table.userId, table.appId],
			name: "codepush_collaborator_user_app_pk",
		}),
	],
);

/**
 * CodePush Collaborator Relationships
 * Defines the relationships between collaborators and related entities
 *
 * Relationships:
 * - user: The user who is collaborating
 * - app: The CodePush application being collaborated on
 */
export const codepushCollaboratorRelations = relations(codepush_collaborator, ({ one }) => ({
	user: one(user, {
		fields: [codepush_collaborator.userId],
		references: [user.id],
	}),
	app: one(codepush_app, {
		fields: [codepush_collaborator.appId],
		references: [codepush_app.id],
	}),
}));
