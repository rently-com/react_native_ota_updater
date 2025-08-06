/**
 * Session Schema Definition
 * This module defines the structure for user sessions in the authentication system.
 * It manages active user sessions and their expiration.
 */

import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { tableActions } from "./_table";
import { user } from "./user";

/**
 * Session Table Schema
 * Represents active user sessions in the system
 * Used by the authentication system to maintain user state
 *
 * Features:
 * - Unique session tokens for each active session
 * - Links sessions to users
 * - Automatic session expiration
 */
export const session = pgTable("session", {
	/** Unique token identifying the session */
	sessionToken: text("sessionToken").primaryKey(),

	/** Reference to the user who owns this session */
	userId: text("userId")
		.notNull()
		.references(() => user.id, tableActions),

	/** Timestamp when the session expires */
	expires: timestamp({ mode: "date" }).notNull(),
});

/**
 * Session Relationships
 * Defines the relationship between sessions and users
 *
 * Relationships:
 * - user: The user who owns this session
 */
export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));
