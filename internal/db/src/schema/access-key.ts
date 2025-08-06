/**
 * Access Key Schema Definition
 * This module defines the structure for CLI access keys
 */

import { relations } from "drizzle-orm";
import { pgTable, text, unique } from "drizzle-orm/pg-core";

import { generateId, getCreatedAtSchema, getExpiresAtSchema, getUpdatedAtSchema, tableActions } from "./_table";

import { user } from "./user";

/**
 * Access Key Table Schema
 * Represents CLI access keys that users can create to authenticate
 *
 * Features:
 * - Auto-generated 32-character tokens
 * - Named keys for easy identification
 * - Tracks creation, updates, and expiration
 * - Enforces unique names per user
 */
export const accessKey = pgTable(
	"access_key",
	{
		/** Unique token used for authentication */
		token: text()
			.$defaultFn(() => generateId(32))
			.primaryKey()
			.notNull(),

		/** User-defined name for the access key */
		name: text().notNull(),

		/** Hostname or IP address of the machine that created the key */
		createdBy: text().notNull(),

		/** Reference to the owning user */
		userId: text()
			.notNull()
			.references(() => user.id, tableActions),

		...getCreatedAtSchema(),
		...getUpdatedAtSchema(),
		...getExpiresAtSchema(),
	},
	(table) => [
		// Ensure key names are unique per user
		unique("access_key_name_user_unique").on(table.name, table.userId),
	],
);

/**
 * Access Key Relationships
 * Defines the relationship between access keys and users
 *
 * Relationships:
 * - user: The user who owns this access key
 */
export const accessKeyRelations = relations(accessKey, ({ one }) => ({
	user: one(user, {
		fields: [accessKey.userId],
		references: [user.id],
	}),
}));
