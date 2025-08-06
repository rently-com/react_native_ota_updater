/**
 * User Schema Definition
 * This module defines the core user table structure and its relationships
 * with other entities in the system.
 */

import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// import { codepush_collaborator } from "./(codepush)/collaborator";
import { getBaseSchema } from "./_table";
import { accessKey } from "./access-key";
import { account } from "./account";
import { session } from "./session";

/**
 * User Table Schema
 * Represents the core user entity in the system
 * Includes authentication and profile information
 */
export const user = pgTable(
	"user",
	{
		...getBaseSchema(),

		/** User's display name */
		name: text().notNull(),

		/** User's email address (unique identifier) */
		email: text().notNull().unique(),

		/** URL to user's profile image */
		image: text(),

		/** Timestamp of email verification */
		emailVerified: timestamp({ mode: "date" }),
	},
	(table) => [
		// Index on email for faster lookups during authentication
		index("user_email_idx").on(table.email),
	],
);

/**
 * User Relationships
 * Defines the relationships between users and other entities
 *
 * Relationships:
 * - accounts: OAuth accounts linked to the user
 * - sessions: Active user sessions
 * - accessKeys: CLI access keys owned by the user
//  * - collaboratorFor: Projects where user is a collaborator
 */
export const userRelations = relations(user, ({ many }) => ({
	accounts: many(account),
	sessions: many(session),
	accessKeys: many(accessKey),

	// collaboratorFor: many(codepush_collaborator),
}));
