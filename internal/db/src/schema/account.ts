/**
 * Account Schema Definition
 * This module defines the structure for OAuth and other authentication provider accounts
 * that can be linked to user profiles. It supports various authentication methods including
 * email, OAuth, OpenID Connect, and WebAuthn.
 */

import { relations } from "drizzle-orm";
import { integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

import { tableActions } from "./_table";
import { user } from "./user";

/**
 * Authentication Account Types
 * Defines the supported authentication methods
 */
export type AuthType = "email" | "oauth" | "oidc" | "webauthn";

/**
 * Account Table Schema
 * Represents linked authentication accounts for users
 *
 * Features:
 * - Supports multiple authentication providers per user
 * - Stores OAuth/OIDC tokens and related data
 * - Composite primary key of provider and provider account ID
 * - Automatic cascade deletion with user
 */
export const account = pgTable(
	"account",
	{
		/** Reference to the user who owns this account */
		userId: text()
			.notNull()
			.references(() => user.id, tableActions),

		/** Type of authentication account */
		type: text().$type<AuthType>().notNull(),

		/** Authentication provider (e.g., 'google', 'github') */
		provider: text().notNull(),

		/** Unique ID from the provider */
		providerAccountId: text().notNull(),

		// OAuth/OIDC specific fields
		/** Refresh token for OAuth/OIDC */
		refresh_token: text("refresh_token"),

		/** Access token for OAuth/OIDC */
		access_token: text("access_token"),

		/** Token expiration timestamp */
		expires_at: integer("expires_at"),

		/** Type of access token */
		token_type: text("token_type"),

		/** OAuth scopes granted */
		scope: text("scope"),

		/** OIDC ID token */
		id_token: text("id_token"),

		/** Additional session state */
		session_state: text("session_state"),
	},
	(table) => [
		// Composite primary key of provider and account ID
		primaryKey({
			columns: [table.provider, table.providerAccountId],
			name: "account_provider_id_pk",
		}),
	],
);

/**
 * Account Relationships
 * Defines the relationship between authentication accounts and users
 *
 * Relationships:
 * - user: The user who owns this authentication account
 */
export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));
