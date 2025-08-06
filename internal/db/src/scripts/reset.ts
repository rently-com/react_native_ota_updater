/**
 * Database Reset Script
 * This script provides functionality to reset the database by truncating all tables
 * in the correct order to handle foreign key dependencies.
 */

import { type Table, getTableName, sql } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";

/**
 * Resets a single table by truncating it and resetting its identity sequences
 * @param {db} db - Database instance
 * @param {Table} table - Table to reset
 * @returns {Promise<void>}
 */
async function resetTable(db: db, table: Table) {
	return db.execute(sql.raw(`TRUNCATE TABLE "${getTableName(table)}" RESTART IDENTITY CASCADE`));
}

/**
 * Resets all tables in the database in the correct order
 * Tables are reset in reverse dependency order to handle foreign key constraints
 * @returns {Promise<void>}
 */
export async function reset() {
	// Tables ordered by dependency (most dependent first)
	const tables = [
		schema.codepush_release, // Depends on deployment
		schema.codepush_deployment, // Depends on platform
		schema.codepush_platform, // Depends on app
		schema.codepush_collaborator, // Depends on app and user
		schema.codepush_app, // Base CodePush table
		schema.session, // Depends on user
		schema.accessKey, // Depends on user
		schema.account, // Depends on user
		schema.user, // Base user table
	];

	for (const table of tables) {
		await resetTable(db, table);
		// Alternative: await db.delete(table); // Clear tables without truncating / resetting ids
	}
}

// Execute the reset
reset()
	.then(() => {
		console.log("✅ Database reset completed successfully");
		process.exit(0);
	})
	.catch((error) => {
		console.error("❌ Database reset failed:", error);
		process.exit(1);
	});
