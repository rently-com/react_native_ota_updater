/**
 * Database Migration Script
 * This script handles the execution of database migrations using Drizzle ORM.
 * It applies pending migrations from the ./drizzle directory to keep the database schema up to date.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Database connection for migrations
 * Uses a single connection to ensure sequential migration execution
 */
const migrationsClient = postgres(process.env.DATABASE_URL!, {
	max: 1, // Single connection for migrations
});

/**
 * Drizzle ORM instance for running migrations
 */
const db = drizzle(migrationsClient);

/**
 * Main migration function
 * Executes pending migrations and handles any errors that occur
 */
const main = async () => {
	try {
		// Run migrations from the ./drizzle directory
		await migrate(db, { migrationsFolder: "./drizzle" });
		console.log("✅ Migration completed successfully");
	} catch (error) {
		console.error("❌ Error during migration:", error);
		process.exit(1);
	} finally {
		// Close the database connection
		await migrationsClient.end();
	}
};

// Execute migrations
await main();
