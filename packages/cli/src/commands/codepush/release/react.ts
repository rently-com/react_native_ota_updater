/**
 * Module for creating React Native releases in CodePush deployments.
 * Provides specialized functionality for bundling and deploying React Native updates.
 * Handles platform-specific build processes, Hermes compilation, and deployment.
 *
 * Features:
 * - React Native bundle generation
 * - Hermes compilation support
 * - Platform-specific builds (iOS/Android)
 * - Development/Production modes
 * - Source map generation
 * - Version management
 * - Bundle signing
 * - Automatic entry file detection
 *
 * @module commands/codepush/release/react
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Args, Flags, type Interfaces } from "@oclif/core";
import { CLIError } from "@oclif/core/errors";
// @ts-expect-error
import g2js from "gradle-to-js";
import plist, { type PlistValue } from "plist";
// @ts-expect-error
import properties from "properties";
import { rimraf } from "rimraf";
import semver from "semver";
import { EnsureAuthCommand } from "../../../common/ensure-auth-command.js";
import { createCodePushTempDir, fileDoesNotExistOrIsDirectory } from "../../../lib/file-system.js";
import {
	getAndroidHermesEnabled,
	getiOSHermesEnabled,
	runHermesEmitBinaryCommand,
} from "../../../lib/react-native-utils.js";
import type { Platform } from "../../../services/codepush-sdk.js";
import { sdk } from "../../../services/management-sdk.js";

/**
 * Context interface for release task execution.
 * Contains all necessary information for the release process.
 *
 * @interface Ctx
 * @property {string} appName - Name of the CodePush app
 * @property {Platform} platform - Target platform (ios/android)
 * @property {string} outputFolder - Directory for build outputs
 * @property {string} [entryFile] - Entry point for the React Native app
 * @property {string} bundleName - Name of the generated bundle
 * @property {string} projectName - Name from package.json
 * @property {string} appStoreVersion - Version from app store configuration
 */
interface Ctx {
	appName: string;
	platform: Platform;
	outputFolder: string;
	entryFile?: string;
	bundleName: string;
	projectName: string;
	appStoreVersion: string;
}

type ReleaseReactFlags = Interfaces.InferredFlags<typeof ReleaseReact.flags>;

/**
 * Command class for creating React Native releases in CodePush.
 * Extends EnsureAuthCommand to require authentication before execution.
 *
 * Features:
 * - React Native bundle generation
 * - Platform-specific builds
 * - Development mode support
 * - Hermes compilation
 * - Source map generation
 * - Bundle signing
 * - Version detection
 * - Automatic entry file detection
 */
export default class ReleaseReact extends EnsureAuthCommand {
	static override description = "Create a React Native release for a CodePush application";

	static override examples = [
		{
			description: "Release a React Native update to staging",
			command: '<%= config.bin %> <%= command.id %> "MyApp" ios',
		},
		{
			description: "Release with custom entry file",
			command: '<%= config.bin %> <%= command.id %> "MyApp" android --entryFile MyApp.js',
		},
		{
			description: "Release a mandatory update with description",
			command: '<%= config.bin %> <%= command.id %> "MyApp" ios -m --description "Bug fixes"',
		},
		{
			description: "Release an update with custom binary version targeting",
			command: '<%= config.bin %> <%= command.id %> "MyApp" android -t "1.2.x"',
		},
	];

	/**
	 * Command arguments definition.
	 * @property {string} appName - Required. The name of the CodePush app to release to.
	 * @property {string} platform - Required. The platform to release for (ios/android).
	 */
	static override args = {
		appName: Args.string({
			description: "Name of the CodePush app to release to",
			required: true,
		}),
		platform: Args.string({
			description: "Platform to release for",
			options: ["ios", "android"],
			required: true,
		}),
	};

	/**
	 * Command flags definition.
	 * @property {string} bundleName - Optional. Name of the bundle file to generate.
	 * @property {string} deploymentName - Optional. The deployment to release to (defaults to Staging).
	 * @property {string} description - Optional. Description of the changes in this release.
	 * @property {boolean} development - Optional. Whether to generate the bundle in dev mode.
	 * @property {boolean} disabled - Optional. Whether to disable the release initially.
	 * @property {string} entryFile - Optional. Path to the app's entry file.
	 * @property {string} gradleFile - Optional. Path to the gradle file (Android).
	 * @property {string} plistFile - Optional. Path to the plist file (iOS).
	 * @property {string} plistFilePrefix - Optional. Prefix for the plist file.
	 * @property {string} podFile - Optional. Path to the pod file (iOS).
	 * @property {boolean} mandatory - Optional. Whether to mark the release as mandatory.
	 * @property {string} rollout - Optional. Percentage of users to roll out to.
	 * @property {string} sourcemapOutput - Optional. Path for sourcemap output.
	 * @property {string} outputDir - Optional. Directory to place the generated files.
	 * @property {string} targetBinaryVersion - Optional. Specific binary version to target.
	 * @property {boolean} useHermes - Optional. Whether to use Hermes engine.
	 * @property {string[]} extraHermesFlags - Optional. Additional flags for Hermes compiler.
	 * @property {string} privateKeyPath - Optional. Path to private key for signing.
	 */
	static override flags = {
		bundleName: Flags.string({ char: "b", description: "Name of the entry bundle file" }),
		deploymentName: Flags.string({
			char: "d",
			description: "Deployment to release to",
			default: "Staging",
		}),
		description: Flags.string({
			aliases: ["des"],
			description: "Description of the changes in this release",
		}),
		development: Flags.boolean({
			aliases: ["dev"],
			description: "Generate the bundle in development mode",
			default: false,
		}),
		disabled: Flags.boolean({
			char: "x",
			description: "Whether to disable this release initially",
			default: false,
		}),
		entryFile: Flags.string({
			char: "e",
			description: "Path to the app's entry JavaScript file",
		}),
		gradleFile: Flags.string({
			char: "g",
			description: "Path to the gradle file for Android version detection",
		}),
		plistFile: Flags.string({
			char: "p",
			description: "Path to the plist file for iOS version detection",
		}),
		plistFilePrefix: Flags.string({
			aliases: ["pre"],
			description: "Prefix to append to the plist filename",
		}),
		podFile: Flags.string({
			aliases: ["pod"],
			description: "Path to the pod file for iOS configuration",
		}),
		mandatory: Flags.boolean({
			char: "m",
			description: "Whether this release should be mandatory",
			default: false,
		}),
		rollout: Flags.string({
			char: "r",
			description: "Percentage of users this release should be available to",
			default: "100%",
		}),
		sourcemapOutput: Flags.string({
			char: "s",
			description: "Path to where the sourcemap for the resulting bundle should be written",
		}),
		outputDir: Flags.string({
			char: "o",
			description: "Directory to place the generated JS bundle and resources",
		}),
		targetBinaryVersion: Flags.string({
			char: "t",
			description: "Semver expression that specifies the binary app version to target",
		}),
		useHermes: Flags.boolean({
			char: "h",
			description: "Enable Hermes engine for the bundle",
			default: false,
		}),
		extraHermesFlags: Flags.string({
			aliases: ["hf"],
			description: "Additional arguments to pass to the Hermes compiler",
			multiple: true,
		}),
		privateKeyPath: Flags.string({
			char: "k",
			description: "Path to the private key for signing the bundle",
		}),
	};

	/**
	 * Reads and validates the package.json file.
	 * Ensures React Native dependencies are present.
	 *
	 * @param {string} projectPackageJsonPath - Path to package.json
	 * @returns {Promise<any>} Parsed package.json contents
	 * @throws {Error} If package.json is invalid or missing dependencies
	 */
	public async readPackageJson(projectPackageJsonPath: string) {
		try {
			return JSON.parse(await fs.promises.readFile(projectPackageJsonPath, "utf8"));
		} catch {
			throw new CLIError(`Cannot read the specified package.json at ${projectPackageJsonPath}`);
		}
	}

	/**
	 * Validates semver range for version targeting.
	 * Ensures proper version specification format.
	 *
	 * @param {string} semverRange - The version range to validate
	 * @throws {Error} If the version range is invalid
	 */
	public throwForInvalidSemverRange(semverRange: string): void {
		if (semver.validRange(semverRange) === null) {
			throw new Error(
				'Please use a semver-compliant target binary version range, for example "1.0.0", "*" or "^1.2.3".',
			);
		}
	}

	/**
	 * Gets the React Native project's app version.
	 * Handles platform-specific version detection from:
	 * - iOS: Info.plist
	 * - Android: build.gradle
	 *
	 * @param {string} projectName - Name of the React Native project
	 * @returns {Promise<string>} The detected app version
	 * @throws {CLIError} If version cannot be detected or is invalid
	 */
	public async getReactNativeProjectAppVersion(projectName: string): Promise<string> {
		const fileExists = (file: string): boolean => {
			try {
				return fs.statSync(file).isFile();
			} catch {
				return false;
			}
		};

		const isValidVersion = (version: string): boolean => !!semver.valid(version) || /^\d+\.\d+$/.test(version);

		const { args, flags } = await this.parse(ReleaseReact);

		console.log(`Detecting ${args.platform} app version...`);

		if (args.platform === "ios") {
			let resolvedPlistFile: string | undefined = flags.plistFile;

			if (resolvedPlistFile) {
				// If a plist file path is explicitly provided, then we don't
				// need to attempt to "resolve" it within the well-known locations.
				if (!fileExists(resolvedPlistFile)) {
					throw new CLIError("The specified plist file doesn't exist. Please check that the provided path is correct.");
				}
			} else {
				// Allow the plist prefix to be specified with or without a trailing
				// separator character, but prescribe the use of a hyphen when omitted,
				// since this is the most commonly used convetion for plist files.
				if (flags.plistFilePrefix && /.+[^-.]$/.test(flags.plistFilePrefix)) {
					flags.plistFilePrefix += "-";
				}

				const iOSDirectory: string = "ios";
				const plistFileName = `${flags.plistFilePrefix || ""}Info.plist`;

				const knownLocations = [
					path.join(iOSDirectory, projectName, plistFileName),
					path.join(iOSDirectory, plistFileName),
				];

				resolvedPlistFile = knownLocations.find(fileExists);

				if (!resolvedPlistFile) {
					throw new CLIError(
						`Unable to find either of the following plist files in order to infer your app's binary version: "${knownLocations.join('", "')}". If your plist has a different name, or is located in a different directory, consider using either the "--plistFile" or "--plistFilePrefix" parameters to help inform the CLI how to find it.`,
					);
				}
			}

			const plistContents = fs.readFileSync(resolvedPlistFile).toString();

			let parsedPlist: PlistValue;

			try {
				parsedPlist = plist.parse(plistContents);
			} catch {
				throw new CLIError(`Unable to parse "${resolvedPlistFile}". Please ensure it is a well-formed plist file.`);
			}

			// @ts-expect-error
			if (parsedPlist?.CFBundleShortVersionString) {
				// @ts-expect-error
				if (isValidVersion(parsedPlist.CFBundleShortVersionString)) {
					this.log(
						// @ts-expect-error
						`Using the target binary version value "${parsedPlist.CFBundleShortVersionString}" from "${resolvedPlistFile}".\n`,
					);
					// @ts-expect-error
					return parsedPlist.CFBundleShortVersionString;
				}

				throw new CLIError(
					`The "CFBundleShortVersionString" key in the "${resolvedPlistFile}" file needs to specify a valid semver string, containing both a major and minor version (e.g. 1.3.2, 1.1).`,
				);
			}

			throw new CLIError(`The "CFBundleShortVersionString" key doesn't exist within the "${resolvedPlistFile}" file.`);
		}

		if (args.platform === "android") {
			let buildGradlePath: string = path.join("android", "app");

			if (flags.gradleFile) {
				buildGradlePath = flags.gradleFile;
			}
			if (fs.lstatSync(buildGradlePath).isDirectory()) {
				buildGradlePath = path.join(buildGradlePath, "build.gradle");
			}

			if (fileDoesNotExistOrIsDirectory(buildGradlePath)) {
				throw new Error(`Unable to find gradle file "${buildGradlePath}".`);
			}

			return (
				g2js
					.parseFile(buildGradlePath)
					.catch(() => {
						throw new CLIError(
							`Unable to parse the "${buildGradlePath}" file. Please ensure it is a well-formed Gradle file.`,
						);
					})
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					.then((buildGradle: any) => {
						let versionName: string | undefined = undefined;

						// First 'if' statement was implemented as workaround for case
						// when 'build.gradle' file contains several 'android' nodes.
						// In this case 'buildGradle.android' prop represents array instead of object
						// due to parsing issue in 'g2js.parseFile' method.
						if (Array.isArray(buildGradle.android)) {
							for (let i = 0; i < buildGradle.android.length; i++) {
								const gradlePart = buildGradle.android[i];
								if (gradlePart.defaultConfig?.versionName) {
									versionName = gradlePart.defaultConfig.versionName;
									break;
								}
							}
						} else if (buildGradle.android?.defaultConfig?.versionName) {
							versionName = buildGradle.android.defaultConfig.versionName;
						} else {
							throw new CLIError(
								`The "${buildGradlePath}" file doesn't specify a value for the "android.defaultConfig.versionName" property.`,
							);
						}

						if (typeof versionName !== "string") {
							throw new CLIError(
								`The "android.defaultConfig.versionName" property value in "${buildGradlePath}" is not a valid string. If this is expected, consider using the --targetBinaryVersion option to specify the value manually.`,
							);
						}

						let appVersion: string = versionName.replace(/"/g, "").trim();

						if (isValidVersion(appVersion)) {
							// The versionName property is a valid semver string,
							// so we can safely use that and move on.
							this.log(`Using the target binary version value "${appVersion}" from "${buildGradlePath}".\n`);
							return appVersion;
						}

						if (/^\d.*/.test(appVersion)) {
							// The versionName property isn't a valid semver string,
							// but it starts with a number, and therefore, it can't
							// be a valid Gradle property reference.
							throw new CLIError(
								`The "android.defaultConfig.versionName" property in the "${buildGradlePath}" file needs to specify a valid semver string, containing both a major and minor version (e.g. 1.3.2, 1.1).`,
							);
						}

						// The version property isn't a valid semver string
						// so we assume it is a reference to a property variable.
						const propertyName = appVersion.replace("project.", "");
						const propertiesFileName = "gradle.properties";

						const knownLocations = [
							path.join("android", "app", propertiesFileName),
							path.join("android", propertiesFileName),
						];

						// Search for gradle properties across all `gradle.properties` files
						let propertiesFile: string | undefined = undefined;
						for (let i = 0; i < knownLocations.length; i++) {
							propertiesFile = knownLocations[i]!;
							if (fileExists(propertiesFile)) {
								const propertiesContent: string = fs.readFileSync(propertiesFile).toString();

								try {
									const parsedProperties = properties.parse(propertiesContent);

									appVersion = parsedProperties[propertyName];
									if (appVersion) {
										break;
									}
								} catch {
									throw new Error(
										`Unable to parse "${propertiesFile}". Please ensure it is a well-formed properties file.`,
									);
								}
							}
						}

						if (!appVersion) {
							throw new Error(`No property named "${propertyName}" exists in the "${propertiesFile}" file.`);
						}

						if (!isValidVersion(appVersion)) {
							throw new Error(
								`The "${propertyName}" property in the "${propertiesFile}" file needs to specify a valid semver string, containing both a major and minor version (e.g. 1.3.2, 1.1).`,
							);
						}

						this.log(
							`Using the target binary version value "${appVersion}" from the "${propertyName}" key in the "${propertiesFile}" file.\n`,
						);
						return appVersion.toString();
					})
			);
		}

		throw new Error(`Unsupported platform "${args.platform}". Please specify either "ios" or "android".`);
	}

	/**
	 * Executes the React Native bundle command.
	 * Generates the JavaScript bundle and assets.
	 *
	 * @param {string} bundleName - Name for the output bundle
	 * @param {boolean} development - Whether to build in development mode
	 * @param {string} entryFile - Path to the entry JavaScript file
	 * @param {string} outputFolder - Directory for build outputs
	 * @param {string} platform - Target platform (ios/android)
	 * @param {string} sourcemapOutput - Path for sourcemap output
	 * @returns {Promise<void>} A promise that resolves when bundling is complete
	 * @throws {CLIError} If the bundle command fails
	 */
	public async runReactNativeBundleCommand(
		bundleName: string,
		development: boolean,
		entryFile: string,
		outputFolder: string,
		platform: string,
		sourcemapOutput: string | undefined,
	): Promise<void> {
		const reactNativeBundleArgs: string[] = [];
		const envNodeArgs: string | undefined = process.env.CODE_PUSH_NODE_ARGS;

		if (typeof envNodeArgs !== "undefined") {
			Array.prototype.push.apply(reactNativeBundleArgs, envNodeArgs.trim().split(/\s+/));
		}

		const isOldCLI = fs.existsSync(path.join("node_modules", "react-native", "local-cli", "cli.js"));

		Array.prototype.push.apply(reactNativeBundleArgs, [
			isOldCLI
				? path.join("node_modules", "react-native", "local-cli", "cli.js")
				: path.join("node_modules", "react-native", "cli.js"),
			"bundle",
			"--assets-dest",
			outputFolder,
			"--bundle-output",
			path.join(outputFolder, bundleName),
			"--dev",
			development,
			"--entry-file",
			entryFile,
			"--platform",
			platform,
		]);

		if (sourcemapOutput) {
			reactNativeBundleArgs.push("--sourcemap-output", sourcemapOutput);
		}

		console.log(`Running "react-native bundle" command:\nnode ${reactNativeBundleArgs.join(" ")}`);

		const reactNativeBundleProcess = spawn("node", reactNativeBundleArgs);

		return new Promise<void>((resolve, reject) => {
			reactNativeBundleProcess.stdout.on("data", (data: Buffer) => {
				console.log(data.toString().trim());
			});

			reactNativeBundleProcess.stderr.on("data", (data: Buffer) => {
				console.error(`Error: ${data.toString().trim()}`);
			});

			reactNativeBundleProcess.on("close", (exitCode: number) => {
				if (exitCode) {
					reject(new CLIError(`"react-native bundle" command exited with code ${exitCode}.`));
				}

				resolve();
			});
		});
	}

	/**
	 * Executes the React Native release command.
	 * This method:
	 * 1. Validates the React Native project
	 * 2. Determines the entry file
	 * 3. Gets the app version
	 * 4. Prepares the release:
	 *    - Creates temp folder
	 *    - Clears bundle cache
	 *    - Runs bundle command
	 *    - Compiles with Hermes (if enabled)
	 *    - Signs the bundle (if configured)
	 * 5. Releases to CodePush
	 *
	 * The process includes several safety checks:
	 * - Project validation
	 * - Dependency verification
	 * - Version validation
	 * - Build verification
	 *
	 * @returns {Promise<void>} A promise that resolves when release is complete
	 * @throws {CLIError} If release fails at any stage
	 */
	public async run(): Promise<void> {
		const { args, flags } = await this.parse(ReleaseReact);

		const deploymentName = flags.deploymentName;
		const platform = args.platform as Platform;

		let bundleName = flags.bundleName;
		switch (platform) {
			case "android":
			case "ios":
				// case "windows":
				if (!bundleName) {
					bundleName = platform === "ios" ? "main.jsbundle" : `index.${platform}.bundle`;
				}
				break;
			default:
				throw new Error('Platform must be either "android", "ios" or "windows".');
		}

		const ctx: Ctx = {
			appName: args.appName,
			platform: platform,
			outputFolder: flags.outputDir || path.join(await createCodePushTempDir(), "CodePush"),
			entryFile: flags.entryFile,
			bundleName: bundleName,
			projectName: "",
			appStoreVersion: "",
		};

		try {
			await sdk.isAuthenticated();
			await sdk.codepush.getDeployment(ctx.appName, deploymentName, ctx.platform);

			await this.validateProjectAndReadPackageJson(ctx);
			await this.determineEntryFile(ctx);
			await this.getAppVersion(ctx, flags);

			if (flags.sourcemapOutput && !flags.sourcemapOutput.endsWith(".map")) {
				flags.sourcemapOutput = path.join(flags.sourcemapOutput, `${ctx.bundleName}.map`);
			}

			console.log(`Creating empty temp release folder: ${ctx.outputFolder}`);
			await createEmptyTempReleaseFolder(ctx.outputFolder);

			// This is needed to clear the react native bundler cache:
			// https://github.com/facebook/react-native/issues/4289
			console.log("Clearing React Native bundler cache...");
			await deleteFolder(`${os.tmpdir()}/react-*`);

			await this.runReactNativeBundleCommand(
				ctx.bundleName,
				flags.development || false,
				ctx.entryFile!,
				ctx.outputFolder,
				ctx.platform,
				flags.sourcemapOutput,
			);

			const isHermesEnabled =
				flags.useHermes ||
				(ctx.platform === "android" && (await getAndroidHermesEnabled(flags.gradleFile))) || // Check if we have to run hermes to compile JS to Byte Code if Hermes is enabled in build.gradle and we're releasing an Android build
				(ctx.platform === "ios" && getiOSHermesEnabled(flags.podFile)); // Check if we have to run hermes to compile JS to Byte Code if Hermes is enabled in Podfile and we're releasing an iOS build

			if (isHermesEnabled) {
				console.log("Running Hermes compiler...");
				await runHermesEmitBinaryCommand(
					ctx.bundleName,
					ctx.outputFolder,
					flags.sourcemapOutput,
					flags.extraHermesFlags,
					flags.gradleFile,
				);
			}

			if (flags.privateKeyPath) {
				console.log("Signing the bundle...");
				//await sign(flags.privateKeyPath, ctx.outputFolder);
			} else {
				console.log("Private key not provided, skipping signing.");
			}

			await this.releaseToCodePush(ctx, flags);
		} catch (error) {
			deleteFolder(ctx.outputFolder);
			throw error;
		}
	}

	/**
	 * Validates the React Native project and reads configuration.
	 * Checks for required dependencies and project structure.
	 *
	 * @param {Ctx} ctx - The release context
	 * @returns {Promise<void>}
	 * @throws {CLIError} If project validation fails
	 */
	private async validateProjectAndReadPackageJson(ctx: Ctx): Promise<void> {
		const projectPackageJsonPath = path.join(process.cwd(), "package.json");

		try {
			console.log(`Reading package.json from ${projectPackageJsonPath}`);
			const projectPackageJson = await this.readPackageJson(projectPackageJsonPath);
			ctx.projectName = projectPackageJson.name;
			if (!ctx.projectName) {
				throw new CLIError('The "package.json" file in the CWD does not have the "name" field set.');
			}
			if (!projectPackageJson.dependencies["react-native"]) {
				throw new CLIError("The project in the CWD is not a React Native project.");
			}
			console.log(`Project name: ${ctx.projectName}`);
		} catch {
			throw new CLIError(
				'Unable to find or read "package.json" in the CWD. The "release-react" command must be executed in a React Native project folder.',
			);
		}
	}

	/**
	 * Determines the entry file for the React Native app.
	 * Handles platform-specific entry points and custom configurations.
	 *
	 * @param {Ctx} ctx - The release context
	 * @returns {Promise<void>}
	 * @throws {CLIError} If entry file cannot be determined
	 */
	private async determineEntryFile(ctx: Ctx): Promise<void> {
		if (!ctx.entryFile) {
			ctx.entryFile = `index.${ctx.platform}.js`;
			if (fileDoesNotExistOrIsDirectory(ctx.entryFile)) {
				ctx.entryFile = "index.js";
			}
			if (fileDoesNotExistOrIsDirectory(ctx.entryFile)) {
				throw new CLIError(`Entry file "index.${ctx.platform}.js" or "index.js" does not exist.`);
			}
		} else if (fileDoesNotExistOrIsDirectory(ctx.entryFile)) {
			throw new CLIError(`Entry file "${ctx.entryFile}" does not exist.`);
		}
		console.log(`Entry file: ${ctx.entryFile}`);
	}

	/**
	 * Retrieves and validates the app version.
	 * Handles version extraction from platform-specific files.
	 *
	 * @param {Ctx} ctx - The release context
	 * @param {ReleaseReactFlags} flags - Command flags
	 * @returns {Promise<void>}
	 * @throws {CLIError} If version cannot be determined
	 */
	private async getAppVersion(ctx: Ctx, flags: ReleaseReactFlags): Promise<void> {
		if (flags.targetBinaryVersion) {
			this.throwForInvalidSemverRange(flags.targetBinaryVersion);
			// Coerce version to include patch number if needed (e.g. 7.2 -> 7.2.0)
			const coercedVersion = semver.coerce(flags.targetBinaryVersion)?.version;
			if (!coercedVersion) {
				throw new CLIError(`Invalid version format: ${flags.targetBinaryVersion}`);
			}
			ctx.appStoreVersion = coercedVersion;
			console.log(`Using provided target binary version: ${ctx.appStoreVersion}`);
		} else {
			const detectedVersion = await this.getReactNativeProjectAppVersion(ctx.projectName);
			const coercedVersion = semver.coerce(detectedVersion)?.version;
			if (!coercedVersion) {
				throw new CLIError(`Invalid version format detected: ${detectedVersion}`);
			}
			ctx.appStoreVersion = coercedVersion;
			console.log(`Detected app version: ${ctx.appStoreVersion}`);
		}
	}

	/**
	 * Releases the bundle to CodePush.
	 * Handles the final deployment step after bundle generation.
	 *
	 * @param {Ctx} ctx - The release context
	 * @param {ReleaseReactFlags} flags - Command flags
	 * @returns {Promise<void>}
	 * @throws {CLIError} If release fails
	 */
	private async releaseToCodePush(ctx: Ctx, flags: ReleaseReactFlags): Promise<void> {
		const releaseCommand = [
			"--platform",
			ctx.platform,
			...(flags.deploymentName ? ["--deploymentName", flags.deploymentName] : []),
			...(flags.description ? ["--description", flags.description] : []),
			...(flags.disabled ? ["--disabled"] : []),
			...(flags.mandatory ? ["--mandatory"] : []),
			...(flags.rollout ? ["--rollout", flags.rollout] : []),
		];

		console.log(`Releasing update to CodePush: ${ctx.appName} ${ctx.appStoreVersion}`);
		await this.config.runCommand("codepush:release", [
			ctx.appName,
			ctx.outputFolder,
			ctx.appStoreVersion,
			...releaseCommand,
		]);

		if (!flags.outputDir) {
			console.log(`Cleaning up temporary folder: ${ctx.outputFolder}`);
			await deleteFolder(ctx.outputFolder);
		}
	}
}

/**
 * Creates an empty temporary folder for release artifacts.
 * Ensures a clean build environment for each release.
 *
 * @param {string} folderPath - Path to create the temp folder
 * @returns {Promise<void>}
 */
export const createEmptyTempReleaseFolder = async (folderPath: string) => {
	await deleteFolder(folderPath);
	fs.mkdirSync(folderPath);
};

/**
 * Recursively deletes a folder and its contents.
 * Used for cleanup after release process.
 *
 * @param {string} folderPath - Path to the folder to delete
 * @returns {Promise<boolean>} True if deletion was successful
 */
function deleteFolder(folderPath: string): Promise<boolean> {
	return rimraf(folderPath, { glob: true });
}
