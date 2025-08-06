/**
 * Base Table Definitions and Utilities
 * This module provides common schema patterns and utility functions for database tables
 */

import { nanoid } from "nanoid";
import slugify from "slugify";

import { type AnyColumn, type SQL, sql } from "drizzle-orm";
import { type AnyPgColumn, type ReferenceConfig, text, timestamp } from "drizzle-orm/pg-core";

// Constants
export const DEFAULT_APP_ICON_URL = "https://cdn4.iconfinder.com/data/icons/logos-3/600/React.js_logo-512.png";
// TODO:: Change this for your team
export const ADMIN_USER_EMAILS = ["example@rently.com"] as const;

/**
 * Generates a unique ID using nanoid
 * @param {number} [size] - Optional size for the generated ID
 * @returns {string} A unique identifier
 */
export const generateId = (size?: number) => nanoid(size);

/**
 * Common Schema Definitions
 * These functions return partial table schemas with standard fields
 */

/**
 * Creates an ID column schema with auto-generated nanoid
 * @param {number} [size] - Optional size for the generated ID
 */
export const getIdSchema = (size?: number) => ({
	id: text("id")
		.$defaultFn(() => generateId(size))
		.primaryKey()
		.notNull(),
});

/**
 * Creates a created_at timestamp column schema
 */
export const getCreatedAtSchema = () => ({
	createdAt: timestamp({ mode: "string", withTimezone: true, precision: 0 }).defaultNow().notNull(),
});

/**
 * Creates an updated_at timestamp column schema
 */
export const getUpdatedAtSchema = () => ({
	updatedAt: timestamp({ mode: "string", withTimezone: true, precision: 0 })
		.defaultNow()
		.notNull()
		.$onUpdate(() => sql`now()`),
});

/**
 * Creates an expires_at timestamp column schema
 */
export const getExpiresAtSchema = () => ({
	expiresAt: timestamp({ mode: "string", withTimezone: true, precision: 0 }).notNull(),
});

/**
 * Combines ID, created_at, and updated_at schemas
 * @param {number} [size] - Optional size for the generated ID
 */
export const getBaseSchema = (size?: number) => ({
	...getIdSchema(size),
	...getCreatedAtSchema(),
	...getUpdatedAtSchema(),
});

/**
 * Default reference configuration for foreign keys
 */
export const tableActions: ReferenceConfig["actions"] = {
	onDelete: "cascade",
	onUpdate: "cascade",
};

/**
 * Timestamp configuration for models
 */
export const timestamps = {
	createdAt: true,
	updatedAt: true,
} as const;

/**
 * String Manipulation Utilities
 */

/**
 * Converts a string to a URL-friendly slug
 * @param {string} name - The string to convert
 * @returns {string} URL-friendly slug
 */
export const slugifyName = (name: string) => slugify(name, { replacement: "_", lower: true, trim: true });

/**
 * SQL Helper Functions
 */

/**
 * Converts a column value to lowercase
 * @param {AnyPgColumn} value - The column to convert
 * @returns {SQL} SQL expression for lowercase conversion
 */
export function lower(value: AnyPgColumn): SQL {
	return sql`lower(${value})`;
}

/**
 * Increments a column value
 * @param {AnyColumn} column - The column to increment
 * @param {number} [value=1] - The increment value
 * @returns {SQL} SQL expression for increment
 */
export const increment = (column: AnyColumn, value = 1): SQL => {
	return sql`${column} + ${value}`;
};

/**
 * Decrements a column value with zero as the lower bound
 * @param {AnyColumn} column - The column to decrement
 * @param {number} [value=1] - The decrement value
 * @returns {SQL} SQL expression for safe decrement
 */
export const decrementOrZero = (column: AnyColumn, value = 1): SQL => {
	return sql`CASE WHEN ${column} - ${value} < 0 THEN 0 ELSE ${column} - ${value} END`;
};
