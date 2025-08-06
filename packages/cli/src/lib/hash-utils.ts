/**
 * Hash utilities for package integrity and code signing.
 * Provides functionality for generating and managing package hashes and manifests.
 *
 * Features:
 * - Package manifest generation and management
 * - File and stream hashing
 * - ZIP file processing
 * - Directory traversal and hashing
 * - Path normalization
 *
 * NOTE: This utility file is duplicated for use by the CodePush service (for server-driven hashing/
 * integrity checks) and Management SDK (for end-to-end code signing), please keep them in sync.
 *
 * @module lib/hash-utils
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";

import yauzl from "yauzl"; // Zip reading library
import { isIgnored } from "./file-system.js";

/** Algorithm used for all hashing operations */
const HASH_ALGORITHM = "sha256";

/**
 * Manages package manifests containing file hashes
 * Used for package integrity verification and code signing
 * Represents a package manifest that maintains a map of file names to their respective hashes.
 *
 * Features:
 * - File hash mapping
 * - Package hash computation
 * - Serialization/deserialization
 * - Path normalization
 * - File filtering
 *
 * @example
 * ```typescript
 * // Create a new manifest
 * const manifest = new PackageManifest();
 *
 * // Generate manifest from directory
 * const manifest = await generatePackageManifestFromDirectory("./dist", "./");
 *
 * // Get package hash
 * const hash = manifest.computePackageHash();
 * ```
 */
export class PackageManifest {
	/**
	 * The internal map storing file names and their hashes
	 * @private
	 */
	private _map: Map<string, string>;

	/**
	 * Creates a new PackageManifest instance
	 * @param {Map<string, string>} [map] - Optional initial map of file names to hashes
	 */
	constructor(map?: Map<string, string>) {
		if (!map) {
			map = new Map<string, string>();
		}
		this._map = map;
	}

	/**
	 * Gets the internal map of file names to hashes
	 * @returns {Map<string, string>} Map of file names to their hashes
	 */
	public toMap(): Map<string, string> {
		return this._map;
	}

	/**
	 * Computes a hash for the entire package
	 * Creates a deterministic hash based on all file hashes
	 *
	 * @returns {string} The computed package hash
	 *
	 * @example
	 * ```typescript
	 * const manifest = await generatePackageManifestFromDirectory("./dist", "./");
	 * const hash = manifest.computePackageHash();
	 * console.log(`Package hash: ${hash}`);
	 * ```
	 */
	public computePackageHash(): string {
		let entries: string[] = [];

		this._map.forEach((hash, name) => {
			entries.push(`${name}:${hash}`);
		});

		// Make sure this list is alphabetically ordered so that other clients
		// can also compute this hash easily given the update contents.
		entries = entries.sort();

		return crypto.createHash(HASH_ALGORITHM).update(JSON.stringify(entries)).digest("hex");
	}

	/**
	 * Serializes the manifest to a string
	 * @returns {string} JSON string representation of the manifest
	 */
	public serialize(): string {
		const obj: Record<string, string> = {};

		this._map.forEach((value, key) => {
			obj[key] = value;
		});

		return JSON.stringify(obj);
	}

	/**
	 * Creates a PackageManifest from a serialized string
	 * @param {string} serializedContents - Serialized manifest content
	 * @returns {PackageManifest} New PackageManifest instance
	 * @throws {Error} If serialized content is invalid
	 */
	public static deserialize(serializedContents: string): PackageManifest {
		try {
			const obj = JSON.parse(serializedContents) as Record<string, string>;
			const map = new Map<string, string>();

			for (const key of Object.keys(obj)) {
				const value = obj[key];

				if (value !== undefined) {
					map.set(key, value);
				}
			}

			return new PackageManifest(map);
		} catch (error) {
			throw new Error(`Failed to deserialize package manifest: ${error}`);
		}
	}

	/**
	 * Normalizes a file path for consistent hashing
	 * @param {string} filePath - Path to normalize
	 * @returns {string} Normalized path
	 */
	public static normalizePath(filePath: string): string {
		const trimmedPath = filePath.trim();
		if (trimmedPath === "") {
			return "";
		}
		return trimmedPath.replace(/\\/g, "/");
	}
}

/**
 * Generates a hash from a readable stream
 * @param {Readable} readStream - Stream to hash
 * @returns {Promise<string>} Generated hash
 * @throws {Error} If stream reading fails
 *
 * @example
 * ```typescript
 * const fileStream = fs.createReadStream("file.txt");
 * const hash = await hashStream(fileStream);
 * ```
 */
export function hashStream(readStream: Readable): Promise<string> {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash(HASH_ALGORITHM);

		readStream.on("error", (error) => {
			reject(error);
		});

		readStream.on("end", () => {
			const hashValue = hash.digest("hex"); // Get the hash value when the stream ends
			resolve(hashValue);
		});

		// Pipe the read stream to the hash stream
		readStream.pipe(hash);
	});
}

/**
 * Generates a hash for a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} Generated hash
 * @throws {Error} If file reading fails
 *
 * @example
 * ```typescript
 * const hash = await hashFile("./dist/bundle.js");
 * console.log(`File hash: ${hash}`);
 * ```
 */
export function hashFile(filePath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const readStream = fs.createReadStream(filePath);
		hashStream(readStream)
			.then((hash) => {
				resolve(hash);
			})
			.catch((error) => {
				reject(error);
			});
	});
}

/**
 * Generates a package manifest from a ZIP file
 * @param {string} filePath - Path to the ZIP file
 * @returns {Promise<PackageManifest | null>} Generated manifest or null if failed
 * @throws {Error} If ZIP processing fails
 *
 * This function reads the contents of a zip file, generates a hash for each file
 * within the zip, and returns a `PackageManifest` object containing the file hashes.
 * If the zip file cannot be opened or processed, the function returns `null`.
 *
 * @throws Will throw an error if there is an issue opening or processing the zip file.
 */
export async function generatePackageManifestFromZip(filePath: string): Promise<PackageManifest | null> {
	let zipFile: yauzl.ZipFile | null = null;

	try {
		zipFile = await new Promise<yauzl.ZipFile>((resolve, reject) => {
			yauzl.open(filePath, { lazyEntries: true }, (error, openedZipFile) => {
				if (error) {
					// This is the first time we try to read the package as a .zip file;
					// however, it may not be a .zip file.  Handle this gracefully.
					console.error("Error opening zip file:", error);
					reject(error);
				} else {
					resolve(openedZipFile);
				}
			});
		});

		const fileHashesMap = new Map<string, string>();
		const hashFilePromises: Promise<void>[] = [];

		const manifestPromise = new Promise<PackageManifest>((resolve, reject) => {
			if (!zipFile) {
				reject(new Error("Error opening zip file"));
				return;
			}

			// Read each entry in the archive sequentially and generate a hash for it.
			zipFile.readEntry();

			zipFile
				.on("error", (error: Error) => {
					console.error("Error processing zip file entry:", error);
					reject(error);
				})
				.on("entry", (entry: yauzl.Entry) => {
					const fileName: string = PackageManifest.normalizePath(entry.fileName);

					if (isIgnored(fileName)) {
						zipFile?.readEntry();
						return;
					}

					zipFile?.openReadStream(entry, (error, readStream) => {
						if (error) {
							console.error("Error openReadStream zip file:", error);
							reject(error);
							return;
						}

						const hashPromise = hashStream(readStream).then((hash: string) => {
							fileHashesMap.set(fileName, hash);
							zipFile?.readEntry();
						});

						hashFilePromises.push(hashPromise);
					});
				})
				.on("end", () => {
					Promise.all(hashFilePromises)
						.then(() => resolve(new PackageManifest(fileHashesMap)))
						.catch(reject);
				});
		});

		return await manifestPromise;
	} catch (error) {
		console.error("Error processing zip file:", error);
		return null;
	} finally {
		if (zipFile) {
			try {
				zipFile.close();
			} catch (closeError) {
				console.warn("Error closing zip file:", closeError);
			}
		}
	}
}

/**
 * Generates a package hash from a directory
 * @param {string} directoryPath - Path to the directory
 * @param {string} basePath - Base path for relative paths
 * @returns {Promise<string>} Generated package hash
 *
 * @param directoryPath - The path to the directory to hash.
 * @param basePath - The base path to use for generating the package manifest.
 * @returns A promise that resolves to the package hash as a string.
 * @throws Will throw an error if the provided path is not a directory.
 */
export async function generatePackageHashFromDirectory(directoryPath: string, basePath: string): Promise<string> {
	if (!fs.lstatSync(directoryPath).isDirectory()) {
		throw new Error("Not a directory. Please either create a directory, or use hashFile().");
	}

	return generatePackageManifestFromDirectory(directoryPath, basePath).then((manifest: PackageManifest) => {
		return manifest.computePackageHash();
	});
}

/**
 * Generates a package manifest from a directory
 * @param {string} directoryPath - Path to the directory
 * @param {string} basePath - Base path for relative paths
 * @returns {Promise<PackageManifest>} Generated manifest
 * @throws {Error} If directory processing fails
 *
 * @example
 * ```typescript
 * const manifest = await generatePackageManifestFromDirectory("./dist", "./");
 * console.log(`File count: ${manifest.toMap().size}`);
 * ```
 */
export async function generatePackageManifestFromDirectory(
	directoryPath: string,
	basePath: string,
): Promise<PackageManifest> {
	const fileHashesMap = new Map<string, string>();

	try {
		// Read the directory contents
		const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });

		// Filter out directories and collect file paths
		const files: string[] = entries
			.filter((entry) => entry.isFile())
			.map((entry) => path.join(directoryPath, entry.name));

		if (files.length === 0) {
			throw new Error("Error: Can't sign the release because no files were found.");
		}

		// Hash the files sequentially
		for (const filePath of files) {
			const relativePath = PackageManifest.normalizePath(path.relative(basePath, filePath));

			if (!isIgnored(relativePath)) {
				const hash = await hashFile(filePath);
				fileHashesMap.set(relativePath, hash);
			}
		}

		// Create and return the PackageManifest instance
		return new PackageManifest(fileHashesMap);
	} catch (e) {
		throw new Error(`Error reading directory: ${e}`);
	}
}
