import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Formats bytes into a human-readable string.
 * Converts bytes to KB, MB, GB, TB, PB, or EB as appropriate.
 *
 * @param {number} bytes - The number of bytes to format.
 * @param {number} [decimals=2] - The number of decimal places to include in the formatted string.
 * @returns {string} Human-readable string representing the byte size.
 *
 * @example
 * ```typescript
 * formatBytes(1024); // Returns '1.00 KB'
 * formatBytes(1234567); // Returns '1.18 MB'
 * ```
 */
export function formatBytes(bytes: number, decimals = 2): string {
	if (!+bytes) return "0 Bytes";

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}
