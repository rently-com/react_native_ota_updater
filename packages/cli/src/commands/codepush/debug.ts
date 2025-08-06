import * as childProcess from "node:child_process";
// import * as path from "node:path";
import { Args } from "@oclif/core";

import { format } from "date-fns";
// import simctl from "node-simctl";
import which from "which";
import { BaseCommand } from "../../common/base-command.js";
import type { Platform } from "../../services/codepush-sdk.js";

export default class CodepushDebug extends BaseCommand<typeof CodepushDebug> {
	static override description = "View CodePush debug logs from Android/iOS devices/simulators";

	static override examples = ["<%= config.bin %> <%= command.id %> android", "<%= config.bin %> <%= command.id %> ios"];

	static override args = {
		platform: Args.string({
			description: "Platform to view debug logs for",
			options: ["android", "ios"],
			required: true,
		}),
	};

	private logMessagePrefix = "[CodePush] ";

	private debugPlatforms = {
		android: new AndroidDebugPlatform(),
		// ios: new IOSDebugPlatform(),
	};

	public async run(): Promise<void> {
		const { args } = await this.parse(CodepushDebug);
		const platform = args.platform.toLowerCase() as Platform;

		// @ts-expect-error
		const debugPlatform = this.debugPlatforms[platform];
		if (!debugPlatform) {
			this.error(
				`Unsupported platform "${platform}". Available options: ${Object.keys(this.debugPlatforms).join(", ")}`,
			);
		}

		try {
			const logProcess = debugPlatform.getLogProcess();
			this.log(`Listening for ${platform} debug logs (Press CTRL+C to exit)\n`);

			logProcess.stdout?.on("data", (data: Buffer) => this.processLogData(data, debugPlatform));

			logProcess.stderr?.on("data", (data: Buffer) => this.error(`Log process error: ${data.toString()}`));

			await new Promise((resolve) => logProcess.on("close", resolve));
		} catch (error) {
			this.error(error instanceof Error ? error.message : String(error));
		}
	}

	private processLogData(logData: Buffer, platform: IDebugPlatform) {
		const content = logData.toString();
		content
			.split("\n")
			.filter((line) => line.includes(this.logMessagePrefix))
			.map((line) => {
				const normalized = platform.normalizeLogMessage(line);
				return normalized.substring(normalized.indexOf(this.logMessagePrefix) + this.logMessagePrefix.length);
			})
			.forEach((message) => {
				const timestamp = format(new Date(), "hh:mm:ss");
				this.log(`[${timestamp}] ${message}`);
			});
	}
}

interface IDebugPlatform {
	getLogProcess(): childProcess.ChildProcess;
	normalizeLogMessage(message: string): string;
}

class AndroidDebugPlatform implements IDebugPlatform {
	getLogProcess(): childProcess.ChildProcess {
		try {
			which.sync("adb");
		} catch {
			throw new Error("ADB command not found. Install Android Platform Tools");
		}

		const deviceCount = this.getAvailableDeviceCount();
		if (deviceCount === 0) throw new Error("No Android devices found");
		if (deviceCount > 1) throw new Error("Multiple devices detected - connect only one");

		return childProcess.spawn("adb", ["logcat"]);
	}

	private getAvailableDeviceCount(): number {
		const output = childProcess.execSync("adb devices").toString();
		return (output.match(/\bdevice\b/g) || []).length;
	}

	normalizeLogMessage(message: string): string {
		const sourceUrlIndex = message.indexOf('", source: file:///');
		return sourceUrlIndex > -1 ? message.substring(0, sourceUrlIndex) : message;
	}
}

// class IOSDebugPlatform implements IDebugPlatform {
// 	getLogProcess(): childProcess.ChildProcess {
// 		if (process.platform !== "darwin") {
// 			throw new Error("iOS debugging requires macOS");
// 		}

// 		const simulatorId = this.getBootedSimulatorId();
// 		if (!simulatorId) throw new Error("No booted iOS simulators found");

// 		const logPath = path.join(process.env.HOME!, "Library/Logs/CoreSimulator", simulatorId, "system.log");

// 		return childProcess.spawn("tail", ["-f", logPath]);
// 	}

// 	private getBootedSimulatorId(): string | undefined {
// 		const { devices } = simctl.list({ devices: true, silent: true }).json;
// 		return devices.flatMap((platform: any) => platform.devices).find((device: any) => device.state === "Booted")?.id;
// 	}

// 	normalizeLogMessage(message: string): string {
// 		return message;
// 	}
// }
