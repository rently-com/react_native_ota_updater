/**
 * Duration parsing and date formatting utilities.
 * Provides functions for handling time durations and relative dates.
 *
 * Features:
 * - Duration string parsing
 * - Millisecond conversion
 * - Relative date formatting
 * - Error handling for invalid formats
 *
 * @module lib/duration
 */

import { type Duration, parseDuration } from "@alwatr/parse-duration";
import { CLIError } from "@oclif/core/errors";
import { formatRelative } from "date-fns";

/**
 * Parses a duration string into milliseconds
 * Supports various duration formats (e.g., "1h", "30m", "1d")
 *
 * @param {string} durationString - The duration string to parse
 * @returns {number} Duration in milliseconds
 * @throws {CLIError} If the duration string is invalid
 *
 * @example
 * ```typescript
 * // Parse "2 hours"
 * const ms = parseDurationMilliseconds("2h");  // 7200000
 *
 * // Parse "1 day and 12 hours"
 * const ms = parseDurationMilliseconds("1d12h");  // 130800000
 *
 * // Invalid format
 * try {
 *   parseDurationMilliseconds("invalid");
 * } catch (error) {
 *   console.error("Invalid duration format");
 * }
 * ```
 */
export const parseDurationMilliseconds = (durationString: string): number => {
	try {
		const parsedDuration = parseDuration(durationString as Duration);
		return Math.floor(parsedDuration);
	} catch {
		throw new CLIError(`Invalid ttl string: ${durationString}`);
	}
};

/**
 * Formats a date relative to the current time
 * Uses natural language formatting (e.g., "2 hours ago", "in 3 days")
 *
 * @param {Date | string} date - The date to format
 * @returns {string} Human-readable relative time string
 *
 * @example
 * ```typescript
 * // Past date
 * const relativeTime = formatRelativeDateFromNow(new Date("2023-01-01"));
 * console.log(relativeTime);  // "3 months ago"
 *
 * // Future date
 * const future = new Date();
 * future.setDate(future.getDate() + 5);
 * console.log(formatRelativeDateFromNow(future));  // "in 5 days"
 *
 * // ISO string
 * console.log(formatRelativeDateFromNow("2024-03-15T12:00:00Z"));
 * ```
 */
export const formatRelativeDateFromNow = (date: Date | string): string => {
	return formatRelative(date, new Date());
};
