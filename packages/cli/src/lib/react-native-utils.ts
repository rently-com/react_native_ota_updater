/**
 * React Native specific utilities for React Native OTA Updater CLI.
 * Provides functionality for working with React Native projects and Hermes.
 *
 * Features:
 * - Hermes bytecode compilation
 * - Gradle file parsing
 * - React Native version detection
 * - Platform-specific utilities
 * - Build configuration detection
 *
 * @module lib/react-native-utils
 */

import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CLIError } from "@oclif/core/errors";
import chalk from "chalk";
// @ts-ignore
import g2js from "gradle-to-js";
import { coerce, compare } from "semver";
import { fileDoesNotExistOrIsDirectory } from "./file-system.js";

/**
 * Runs the Hermes compiler to convert JavaScript bundle to bytecode
 * Handles platform-specific Hermes binary detection and execution
 *
 * @param {string} bundleName - Name of the JavaScript bundle file
 * @param {string} outputFolder - Directory to output the bytecode file
 * @param {string} [sourcemapOutput] - Optional path for sourcemap output
 * @param {string[]} [extraHermesFlags] - Additional flags to pass to Hermes
 * @param {string} [gradleFile] - Optional path to build.gradle file
 * @returns {Promise<void>} Resolves when compilation completes
 * @throws {Error} If Hermes compilation fails
 *
 * @example
 * ```typescript
 * await runHermesEmitBinaryCommand(
 *   "index.android.bundle",
 *   "./build",
 *   "./build/index.android.map",
 *   ["--optimize-bytecode"]
 * );
 * ```
 */
export async function runHermesEmitBinaryCommand(
	bundleName: string,
	outputFolder: string,
	sourcemapOutput?: string,
	extraHermesFlags?: string[],
	gradleFile?: string,
): Promise<void> {
	const hermesArgs: string[] = [];
	const envNodeArgs: string | undefined = process.env.CODE_PUSH_NODE_ARGS;

	if (typeof envNodeArgs !== "undefined") {
		Array.prototype.push.apply(hermesArgs, envNodeArgs.trim().split(/\s+/));
	}

	const extraHermesFlagsParsed = extraHermesFlags || [];

	Array.prototype.push.apply(hermesArgs, [
		"-emit-binary",
		"-out",
		path.join(outputFolder, `${bundleName}.hbc`),
		path.join(outputFolder, bundleName),
		...extraHermesFlagsParsed,
	]);

	if (sourcemapOutput) {
		hermesArgs.push("-output-source-map");
	}

	console.log(chalk.cyan("Converting JS bundle to byte code via Hermes, running command:\n"));
	const hermesCommand = await getHermesCommand(gradleFile);
	const hermesProcess = childProcess.spawn(hermesCommand, hermesArgs);
	console.log(`${hermesCommand} ${hermesArgs.join(" ")}`);

	return new Promise<void>((resolve, reject) => {
		hermesProcess.stdout.on("data", (data: Buffer) => {
			console.log(data.toString().trim());
		});

		hermesProcess.stderr.on("data", (data: Buffer) => {
			// console.error(data.toString().trim());
		});

		hermesProcess.on("close", (exitCode: number, signal: string) => {
			if (exitCode !== 0) {
				reject(new CLIError(`"hermes" command failed (exitCode=${exitCode}, signal=${signal}).`));
			}
			// Copy HBC bundle to overwrite JS bundle
			const source = path.join(outputFolder, `${bundleName}.hbc`);
			const destination = path.join(outputFolder, bundleName);
			fs.copyFile(source, destination, (err) => {
				if (err) {
					console.error(err);
					reject(
						new CLIError(
							`Copying file ${source} to ${destination} failed. "hermes" previously exited with code ${exitCode}.`,
						),
					);
				}
				fs.unlink(source, (err) => {
					if (err) {
						console.error(err);
						reject(err);
					}

					resolve();
				});
			});
		});
	}).then(() => {
		if (!sourcemapOutput) {
			// skip source map compose if source map is not enabled
			return;
		}

		const composeSourceMapsPath = getComposeSourceMapsPath();
		if (!composeSourceMapsPath) {
			throw new Error("react-native compose-source-maps.js scripts is not found");
		}

		const jsCompilerSourceMapFile = path.join(outputFolder, `${bundleName}.hbc.map`);
		if (!fs.existsSync(jsCompilerSourceMapFile)) {
			throw new CLIError(`sourcemap file ${jsCompilerSourceMapFile} is not found`);
		}

		return new Promise((resolve, reject) => {
			const composeSourceMapsArgs = [
				composeSourceMapsPath,
				sourcemapOutput,
				jsCompilerSourceMapFile,
				"-o",
				sourcemapOutput,
			];

			// https://github.com/facebook/react-native/blob/master/react.gradle#L211
			// https://github.com/facebook/react-native/blob/master/scripts/react-native-xcode.sh#L178
			// packager.sourcemap.map + hbc.sourcemap.map = sourcemap.map
			const composeSourceMapsProcess = childProcess.spawn("node", composeSourceMapsArgs);
			console.log(`${composeSourceMapsPath} ${composeSourceMapsArgs.join(" ")}`);

			composeSourceMapsProcess.stdout.on("data", (data: Buffer) => {
				console.log(data.toString().trim());
			});

			composeSourceMapsProcess.stderr.on("data", (data: Buffer) => {
				console.error(data.toString().trim());
			});

			composeSourceMapsProcess.on("close", (exitCode: number, signal: string) => {
				if (exitCode !== 0) {
					reject(new CLIError(`"compose-source-maps" command failed (exitCode=${exitCode}, signal=${signal}).`));
				}

				// Delete the HBC sourceMap, otherwise it will be included in 'code-push' bundle as well
				fs.unlink(jsCompilerSourceMapFile, (err) => {
					if (err) {
						console.error(err);
						reject(err);
					}

					resolve();
				});
			});
		});
	});
}

/**
 * Parses a build.gradle file to extract configuration
 * Supports both old and new React Native project structures
 *
 * @param {string} [gradleFile] - Path to build.gradle file
 * @returns {Promise<any>} Parsed gradle configuration
 * @throws {Error} If gradle file cannot be parsed
 *
 * @example
 * ```typescript
 * const config = await parseBuildGradleFile("./android/app/build.gradle");
 * console.log("Android config:", config);
 * ```
 */
export async function parseBuildGradleFile(gradleFile?: string) {
	let buildGradlePath: string = path.join("android", "app");
	if (gradleFile) {
		buildGradlePath = gradleFile;
	}
	if (fs.lstatSync(buildGradlePath).isDirectory()) {
		buildGradlePath = path.join(buildGradlePath, "build.gradle");
	}

	if (fileDoesNotExistOrIsDirectory(buildGradlePath)) {
		throw new Error(`Unable to find gradle file "${buildGradlePath}".`);
	}

	try {
		return await g2js.parseFile(buildGradlePath);
	} catch {
		throw new CLIError(`Unable to parse the "${buildGradlePath}" file. Please ensure it is a well-formed Gradle file.`);
	}
}

/**
 * Gets the Hermes command from Android project configuration
 * Attempts to find Hermes in node_modules or from gradle config
 *
 * @param {string} [gradleFile] - Path to build.gradle file
 * @returns {Promise<string>} Path to Hermes binary
 * @private
 */
async function getHermesCommandFromGradle(gradleFile?: string): Promise<string> {
	// biome-ignore lint/suspicious/noExplicitAny: gradle-to-js returns any
	const buildGradle: any = parseBuildGradleFile(gradleFile);
	const hermesCommandProperty = (Array.from(buildGradle["project.ext.react"] || []) as string[]).find((prop: string) =>
		prop.trim().startsWith("hermesCommand:"),
	);

	if (hermesCommandProperty) {
		return hermesCommandProperty.replace("hermesCommand:", "").trim().slice(1, -1);
	}

	return "";
}

/**
 * Checks if Hermes is enabled in Android project
 *
 * @param {string} [gradleFile] - Path to build.gradle file
 * @returns {Promise<boolean>} True if Hermes is enabled
 *
 * @example
 * ```typescript
 * const hermesEnabled = await getAndroidHermesEnabled();
 * if (hermesEnabled) {
 *   console.log("Hermes is enabled for Android");
 * }
 * ```
 */
export async function getAndroidHermesEnabled(gradleFile?: string): Promise<boolean> {
	// biome-ignore lint/suspicious/noExplicitAny: gradle-to-js returns any
	return parseBuildGradleFile(gradleFile).then((buildGradle: any) => {
		return (Array.from(buildGradle["project.ext.react"] || []) as string[]).some((line: string) =>
			/^enableHermes\s{0,}:\s{0,}true/.test(line),
		);
	});
}

/**
 * Checks if Hermes is enabled in iOS project
 *
 * @param {string} [podFile] - Path to Podfile
 * @returns {boolean} True if Hermes is enabled
 *
 * @example
 * ```typescript
 * const hermesEnabled = getiOSHermesEnabled();
 * if (hermesEnabled) {
 *   console.log("Hermes is enabled for iOS");
 * }
 * ```
 */
export function getiOSHermesEnabled(podFile?: string): boolean {
	let podPath = path.join("ios", "Podfile");
	if (podFile) {
		podPath = podFile;
	}
	if (fileDoesNotExistOrIsDirectory(podPath)) {
		throw new Error(`Unable to find Podfile file "${podPath}".`);
	}

	try {
		const podFileContents = fs.readFileSync(podPath).toString();
		return /([^#\n]*:?hermes_enabled(\s+|\n+)?(=>|:)(\s+|\n+)?true)/.test(podFileContents);
	} catch (error) {
		throw new CLIError(`Unable to read Podfile file "${podPath}". ${error}`);
	}
}

/**
 * Gets the OS-specific Hermes binary name
 * @returns {string} Binary name for current OS
 * @private
 */
function getHermesOSBin(): string {
	switch (process.platform) {
		case "win32":
			return "win64-bin";
		case "darwin":
			return "osx-bin";
		// case "freebsd":
		// case "linux":
		// case "sunos":
		default:
			return "linux64-bin";
	}
}

/**
 * Gets the OS-specific Hermes executable extension
 * @returns {string} Executable extension for current OS
 * @private
 */
function getHermesOSExe(): string {
	const coercedVersion = coerce(getReactNativeVersion())?.version;
	const react63orAbove = coercedVersion ? compare(coercedVersion, "0.63.0") !== -1 : false;
	const hermesExecutableName = react63orAbove ? "hermesc" : "hermes";

	switch (process.platform) {
		case "win32":
			return `${hermesExecutableName}.exe`;
		default:
			return hermesExecutableName;
	}
}

/**
 * Gets the full path to Hermes compiler
 * Checks multiple possible locations and falls back to defaults
 *
 * @param {string} [gradleFile] - Path to build.gradle file
 * @returns {Promise<string>} Path to Hermes compiler
 * @private
 */
async function getHermesCommand(gradleFile?: string): Promise<string> {
	const fileExists = (file: string): boolean => {
		try {
			return fs.statSync(file).isFile();
		} catch {
			return false;
		}
	};

	// Hermes is bundled with react-native since 0.69
	const bundledHermesEngine = path.join(
		getReactNativePackagePath(),
		"sdks",
		"hermesc",
		getHermesOSBin(),
		getHermesOSExe(),
	);
	if (fileExists(bundledHermesEngine)) {
		return bundledHermesEngine;
	}

	const gradleHermesCommand = await getHermesCommandFromGradle(gradleFile);
	if (gradleHermesCommand) {
		return path.join("android", "app", gradleHermesCommand.replace("%OS-BIN%", getHermesOSBin()));
	}

	// assume if hermes-engine exists it should be used instead of hermesvm
	const hermesEngine = path.join("node_modules", "hermes-engine", getHermesOSBin(), getHermesOSExe());
	if (fileExists(hermesEngine)) {
		return hermesEngine;
	}
	return path.join("node_modules", "hermesvm", getHermesOSBin(), "hermes");
}

/**
 * Gets the path to React Native's compose-source-maps.js script
 * Used for combining sourcemaps when using Hermes
 *
 * @returns {string} Path to compose-source-maps.js, or empty string if not found
 * @private
 */
function getComposeSourceMapsPath(): string {
	// detect if compose-source-maps.js script exists
	const composeSourceMaps = path.join(getReactNativePackagePath(), "scripts", "compose-source-maps.js");
	if (fs.existsSync(composeSourceMaps)) {
		return composeSourceMaps;
	}

	return "";
}

/**
 * Gets the path to the react-native package installation
 * Attempts to resolve via Node resolution, falls back to node_modules
 *
 * @returns {string} Path to react-native package directory
 * @private
 */
function getReactNativePackagePath(): string {
	const result = childProcess.spawnSync("node", ["--print", "require.resolve('react-native/package.json')"]);
	const packagePath = path.dirname(result.stdout.toString());
	if (result.status === 0 && directoryExistsSync(packagePath)) {
		return packagePath;
	}

	return path.join("node_modules", "react-native");
}

/**
 * Checks if a directory exists synchronously
 *
 * @param {string} dirname - Directory path to check
 * @returns {boolean} True if directory exists
 *
 * @example
 * ```typescript
 * if (directoryExistsSync("./build")) {
 *   console.log("Build directory exists");
 * }
 * ```
 */
export function directoryExistsSync(dirname: string): boolean {
	try {
		return fs.statSync(dirname).isDirectory();
	} catch (err) {
		// @ts-ignore
		if (err.code !== "ENOENT") {
			throw err;
		}
	}
	return false;
}

/**
 * Gets the installed React Native version
 *
 * @returns {string} React Native version string
 * @throws {Error} If React Native version cannot be determined
 *
 * @example
 * ```typescript
 * const version = getReactNativeVersion();
 * console.log(`React Native version: ${version}`);
 * ```
 */
export function getReactNativeVersion(): string {
	let packageJsonFilename = "";
	let projectPackageJson = {};

	try {
		packageJsonFilename = path.join(process.cwd(), "package.json");
		projectPackageJson = JSON.parse(fs.readFileSync(packageJsonFilename, "utf-8"));
	} catch {
		throw new CLIError(
			`Unable to find or read "package.json" in the CWD. The "release-react" command must be executed in a React Native project folder.`,
		);
	}

	// @ts-ignore
	const projectName: string = projectPackageJson?.name;

	if (!projectName) {
		throw new CLIError(`The "package.json" file in the CWD does not have the "name" field set.`);
	}

	return (
		// @ts-ignore
		projectPackageJson.dependencies?.["react-native"] ||
		// @ts-ignore
		projectPackageJson.devDependencies?.["react-native"]
	);
}
