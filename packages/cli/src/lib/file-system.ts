/**
 * File system utilities for CodePush CLI operations.
 * Provides helper functions for common file system operations.
 *
 * Features:
 * - File type detection
 * - Recursive directory reading
 * - Directory existence checking
 * - Binary file detection
 *
 * @module lib/file-system
 */

import fs from "node:fs";
import path from "node:path";
import temp from "temp";

temp.track();

/**
 * Checks if a file is a binary or archive file
 * Detects common binary and archive formats (zip, apk, ipa)
 *
 * @param {string} path - Path to the file
 * @returns {boolean} True if the file is a binary or archive
 *
 * @example
 * ```typescript
 * // Check if file is binary/archive
 * if (isBinaryOrZip("app.apk")) {
 *   console.log("Found binary file");
 * }
 *
 * // Use in file filtering
 * const files = fs.readdirSync(".")
 *   .filter(file => !isBinaryOrZip(file));
 * ```
 */
export function isBinaryOrZip(path: string): boolean {
	return path.search(/\.zip$/i) !== -1 || path.search(/\.apk$/i) !== -1 || path.search(/\.ipa$/i) !== -1;
}

/**
 * Recursively reads a directory and returns all file paths
 * Traverses subdirectories and collects all file paths
 *
 * @param {string} dir - Directory path to read
 * @returns {Promise<string[]>} Array of absolute file paths
 * @throws {Error} If directory cannot be read
 *
 * @example
 * ```typescript
 * // Get all files in a directory
 * const files = await readDirectoryRecursive("./src");
 * console.log(`Found ${files.length} files`);
 *
 * // Process each file
 * for (const file of files) {
 *   const content = await fs.promises.readFile(file, 'utf8');
 *   // Process file content
 * }
 * ```
 */
export async function readDirectoryRecursive(dir: string): Promise<string[]> {
	let results: string[] = [];
	const list = await fs.promises.readdir(dir, { withFileTypes: true });

	for (const dirent of list) {
		const res = path.resolve(dir, dirent.name);
		if (dirent.isDirectory()) {
			results = results.concat(await readDirectoryRecursive(res)); // Recurse into subdirectory
		} else {
			results.push(res); // Push file path
		}
	}
	return results;
}

/**
 * Checks if a path points to a directory
 *
 * @param {string} path - Path to check
 * @returns {boolean} True if path is a directory
 * @throws {Error} If path does not exist
 *
 * @example
 * ```typescript
 * // Check if path is directory
 * if (isDirectory("./config")) {
 *   console.log("Found config directory");
 * }
 * ```
 */
export function isDirectory(path: string): boolean {
	return fs.statSync(path).isDirectory();
}

/**
 * Checks if a file doesn't exist or is a directory
 * Useful for validating paths that should not be existing files
 *
 * @param {string} path - Path to check
 * @returns {boolean} True if path doesn't exist or is a directory
 *
 * @example
 * ```typescript
 * // Validate output path
 * if (fileDoesNotExistOrIsDirectory("./output.txt")) {
 *   // Safe to write to this path
 *   fs.writeFileSync("./output.txt", data);
 * } else {
 *   console.error("File already exists");
 * }
 * ```
 */
export function fileDoesNotExistOrIsDirectory(path: string): boolean {
	try {
		return isDirectory(path);
	} catch {
		return true;
	}
}

/**
 * Creates a temporary directory for CodePush operations
 *
 * @returns {Promise<string>} Path to the created temporary directory
 *
 * @example
 * ```typescript
 * const tempDir = await createCodePushTempDir();
 * console.log(`Created temporary directory: ${tempDir}`);
 * ```
 */
export async function createCodePushTempDir(): Promise<string> {
	return await temp.mkdir("code-push");
}

/**
 * Checks if a file should be ignored in the manifest/zip file
 * @param {string} relativeFilePath - Path to check
 * @returns {boolean} True if file should be ignored
 */
export function isIgnored(relativeFilePath: string): boolean {
	// Ignore the OS-specific metadata files
	return (
		relativeFilePath.startsWith("__MACOSX") ||
		relativeFilePath.startsWith(".DS_Store") ||
		relativeFilePath.endsWith(".DS_Store") ||
		relativeFilePath.endsWith(".map")
	);
}
