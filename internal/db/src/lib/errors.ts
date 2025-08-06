/**
 * Database Error Handling Utilities
 *
 * This module provides a comprehensive error handling system for database operations,
 * including custom error classes and utility functions. It ensures consistent error
 * handling patterns across the application.
 *
 * Features:
 * - Custom error classes for different error scenarios
 * - HTTP status code integration
 * - Stack trace preservation
 * - Type-safe error handling utilities
 * - Consistent error reporting patterns
 *
 * @module DatabaseErrors
 */

import * as HttpStatusCodes from "stoker/http-status-codes";

/**
 * Internal Storage Error
 * Represents errors that occur during internal storage operations
 *
 * Features:
 * - Captures original error details
 * - Maintains error stack traces
 * - Includes HTTP status codes
 * - Provides descriptive error messages
 *
 * @extends {Error}
 *
 * @example
 * ```typescript
 * try {
 *   await database.query();
 * } catch (error) {
 *   throw new InternalStorageError("Database query failed", error);
 * }
 * ```
 */
export class InternalStorageError extends Error {
	/** HTTP status code for the error */
	public status: number;
	/** Original error that caused this error */
	public error: Error;

	/**
	 * Creates an internal storage error
	 * @param {string} message - Human-readable error message
	 * @param {Error} error - Original error that caused this error
	 */
	constructor(message: string, error: Error) {
		super(message);
		this.name = "InternalStorageError";
		this.status = HttpStatusCodes.INTERNAL_SERVER_ERROR;
		this.error = error;

		// Ensure proper stack trace in Node.js
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, InternalStorageError);
		}
	}
}

/**
 * Storage Error
 * Represents user-facing storage operation errors
 *
 * Features:
 * - Custom HTTP status codes
 * - Operation success tracking
 * - User-friendly error messages
 * - Consistent error structure
 *
 * @extends {Error}
 *
 * @example
 * ```typescript
 * if (!user) {
 *   throw new StorageError("User not found", HttpStatusCodes.NOT_FOUND);
 * }
 * ```
 */
export class StorageError extends Error {
	/** HTTP status code for the error */
	public status: number;
	/** Indicates if the operation was successful */
	public success: boolean;

	/**
	 * Creates a storage error
	 * @param {string} message - Human-readable error message
	 * @param {number} status - HTTP status code for the error
	 */
	constructor(message: string, status: number) {
		super(message);
		this.name = "StorageError";
		this.status = status;
		this.success = false;
	}
}

/**
 * Query Wrapper Utility
 * Provides a consistent pattern for handling database query errors
 *
 * Features:
 * - Type-safe error handling
 * - Tuple return pattern
 * - Automatic error logging
 * - Error message normalization
 * - Promise-based operation support
 *
 * @template T - The type of data returned by the query
 * @param {Promise<T>} promise - The database query promise to wrap
 * @returns {Promise<[undefined, T] | [Error]>} Tuple of [error, data]
 *
 * @example
 * ```typescript
 * // Using the query wrapper
 * const [error, users] = await queryWrapper(
 *   db.select().from(users).where(eq(users.active, true))
 * );
 *
 * if (error) {
 *   // Handle error case
 *   console.error("Failed to fetch users:", error);
 *   return;
 * }
 *
 * // Use data safely, TypeScript knows users is defined here
 * console.log("Active users:", users.length);
 * ```
 */
export async function queryWrapper<T>(promise: Promise<T>): Promise<[undefined, T] | [Error]> {
	try {
		const data = await promise;
		return [undefined, data] as [undefined, T];
	} catch (error) {
		console.error("Database Query Error:", error);
		const message = error instanceof Error ? error.message : "An unknown database error occurred";
		return [new Error(message)];
	}
}
