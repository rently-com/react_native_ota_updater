/**
 * Database Client Configuration Module
 *
 * This module provides a centralized configuration for database connectivity using Drizzle ORM
 * with PostgreSQL. It handles connection pooling, query logging, and type safety.
 *
 * Features:
 * - Connection pool management
 * - Query logging for debugging
 * - Type-safe database operations
 * - Configurable timeouts and pool sizes
 * - Snake case mapping for database fields
 *
 * @module DatabaseClient
 */

import type { Logger } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import env from "./env";
import * as schema from "./schema";

/**
 * Custom Query Logger Implementation
 * Provides detailed logging for database operations during development and debugging
 *
 * Features:
 * - SQL query logging
 * - Parameter value tracking
 * - Formatted output for readability
 * - Debug-level logging to avoid production noise
 *
 * @implements {Logger}
 */
class QueryLogger implements Logger {
	/**
	 * Logs a database query and its parameters
	 *
	 * @param query - The SQL query string
	 * @param params - Array of parameter values used in the query
	 */
	logQuery(query: string, params: unknown[]): void {
		console.debug("=== Database Query ===");
		console.debug("SQL: ", query);
		console.debug("Parameters: ", params);
		console.debug("===================");
	}
}

/**
 * PostgreSQL Connection Configuration
 * Manages the database connection pool with optimized settings
 *
 * Features:
 * - Configurable pool size
 * - Connection timeout handling
 * - Idle connection management
 * - Environment-based configuration
 */
export const connection = postgres(env.DATABASE_URL, {
	max: 100, // Maximum connections in pool
	idle_timeout: 20, // Idle connection timeout (seconds)
	connect_timeout: 10, // Connection establishment timeout (seconds)
});

/**
 * Drizzle ORM Instance
 * Provides the main database interface with schema validation and logging
 *
 * Features:
 * - Full schema type safety
 * - Query logging in development
 * - Consistent field casing
 * - Prepared statement support
 *
 * @example
 * ```typescript
 * // Execute a type-safe query
 * const users = await db.query.user.findMany({
 *     where: eq(user.active, true)
 * });
 * ```
 */
export const db = drizzle(connection, {
	schema,
	logger: new QueryLogger(),
	casing: "snake_case",
});

/**
 * Database Instance Type
 * Type export for maintaining type safety when using the database in other modules
 *
 * @example
 * ```typescript
 * import type { db } from './client';
 *
 * function useDatabase(database: db) {
 *     // Type-safe database operations
 * }
 * ```
 */
export type db = typeof db;
