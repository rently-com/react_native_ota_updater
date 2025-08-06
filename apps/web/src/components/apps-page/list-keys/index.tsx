"use client";

import { Button } from "@/web/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/web/components/ui/sheet";
import {
	getAppQueryOptions,
	useRollDeploymentKeyMutation,
	useSetCustomDeploymentKeyMutation,
} from "@/web/lib/client/codepush-queries";
import { CopyIcon, Pencil1Icon, ReloadIcon } from "@radix-ui/react-icons";

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/web/components/ui/dialog";
import { Input } from "@/web/components/ui/input";
import { Label } from "@/web/components/ui/label";
import type { PlatformName } from "@/web/store/store";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export default function ViewDeploymentKeys() {
	const { data: app } = useSuspenseQuery(getAppQueryOptions());

	const [customKey, setCustomKey] = useState("");
	const [selectedDeployment, setSelectedDeployment] = useState<{
		platformName: PlatformName;
		deploymentName: string;
		deploymentKey: string;
	} | null>(null);

	const [rollingKey, setRollingKey] = useState<string | null>(null);
	const [confirmRollKey, setConfirmRollKey] = useState<{
		platformName: PlatformName;
		deploymentName: string;
	} | null>(null);

	const rollDeploymentKeyMutation = useRollDeploymentKeyMutation();
	const setCustomDeploymentKeyMutation = useSetCustomDeploymentKeyMutation();

	const deploymentKeys = app?.platforms
		.flatMap((platform) => {
			return platform.deployments.map((deployment) => {
				return {
					platformName: platform.name,
					deploymentName: deployment.name,
					deploymentKey: deployment.key,
				};
			});
		})
		.sort((a, b) => {
			// First sort by platform name
			// const platformCompare = a.platformName.localeCompare(b.platformName);
			// if (platformCompare !== 0) return platformCompare;
			// Then sort by deployment name
			return a.deploymentName.localeCompare(b.deploymentName);
		});

	const handleOpenRollKeyConfirmation = (platformName: PlatformName, deploymentName: string) => {
		setConfirmRollKey({ platformName, deploymentName });
	};

	const handleRollKey = async () => {
		if (!app?.name || !confirmRollKey) return;

		const { platformName, deploymentName } = confirmRollKey;
		setRollingKey(`${platformName}_${deploymentName}`);
		try {
			await rollDeploymentKeyMutation.mutateAsync({
				appName: app.name,
				deploymentName,
				platform: platformName,
			});
			toast.success(`Deployment key for ${deploymentName} has been rolled successfully`);
		} catch (error) {
			console.error("Failed to roll key:", error);
			toast.error(`Failed to roll deployment key: ${(error as Error).message}`);
		} finally {
			setRollingKey(null);
			setConfirmRollKey(null);
		}
	};

	const handleOpenCustomKeyDialog = (deployment: typeof selectedDeployment) => {
		setSelectedDeployment(deployment);
		setCustomKey("");
	};

	const handleSetCustomKey = async () => {
		if (!app?.name || !selectedDeployment) return;

		if (!customKey || customKey.length < 16 || customKey.length > 64) {
			toast.error("Custom key must be between 16 and 64 characters");
			return;
		}

		try {
			await setCustomDeploymentKeyMutation.mutateAsync({
				appName: app.name,
				deploymentName: selectedDeployment.deploymentName,
				platform: selectedDeployment.platformName,
				customKey,
			});
			toast.success(`Custom deployment key set for ${selectedDeployment.deploymentName}`);
			setCustomKey("");
			setSelectedDeployment(null);
		} catch (error) {
			console.error("Failed to set custom key:", error);
			toast.error(`${(error as Error).message}`);
		}
	};

	return (
		<>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant="outline">View Deployment Keys</Button>
				</SheetTrigger>

				<SheetContent className="sm:max-w-[475px] overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Deployment Keys</SheetTitle>
						<SheetDescription>
							Here are the deployment keys for your application. You can use these keys to configure your Codepush
							deployments.
						</SheetDescription>
					</SheetHeader>

					<div className="grid gap-4 pt-4">
						{deploymentKeys?.map((deploymentKey) => (
							<div key={deploymentKey.deploymentKey} className="rounded-md border p-4">
								<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
									<div>
										<p className="text-sm font-medium text-muted-foreground">Platform</p>
										<p className="font-semibold">{deploymentKey.platformName}</p>
									</div>

									<div>
										<p className="text-sm font-medium text-muted-foreground">Deployment</p>
										<p className="font-semibold">{deploymentKey.deploymentName}</p>
									</div>
								</div>

								<div className="mt-4">
									<div className="mt-2 flex items-center justify-between rounded-md border p-2 font-mono text-sm">
										<code className="break-all">{deploymentKey.deploymentKey}</code>

										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													navigator.clipboard.writeText(deploymentKey.deploymentKey);
													toast.success("Deployment key copied to clipboard");
												}}
												className="transition-transform active:scale-75"
												title="Copy to clipboard"
											>
												<CopyIcon className="h-4 w-4" />
												<span className="sr-only">Copy</span>
											</Button>

											<Button
												variant="ghost"
												size="icon"
												onClick={() =>
													handleOpenRollKeyConfirmation(deploymentKey.platformName, deploymentKey.deploymentName)
												}
												disabled={rollingKey === `${deploymentKey.platformName}_${deploymentKey.deploymentName}`}
												className="transition-transform active:scale-75"
												title="Roll key (generate new key)"
											>
												<ReloadIcon
													className={`h-4 w-4 ${rollingKey === `${deploymentKey.platformName}_${deploymentKey.deploymentName}` ? "animate-spin" : ""}`}
												/>
												<span className="sr-only">Roll Key</span>
											</Button>

											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleOpenCustomKeyDialog(deploymentKey)}
												className="transition-transform active:scale-75"
												title="Set custom key"
											>
												<Pencil1Icon className="h-4 w-4" />
												<span className="sr-only">Set Custom Key</span>
											</Button>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</SheetContent>
			</Sheet>

			<Dialog open={!!selectedDeployment} onOpenChange={(open) => !open && setSelectedDeployment(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Set Custom Deployment Key</DialogTitle>
						<DialogDescription>
							Set a custom deployment key for the {selectedDeployment?.deploymentName} deployment on{" "}
							{selectedDeployment?.platformName}. The key must be between 16 and 64 characters.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="customKeySheet">Custom Key</Label>
							<Input
								id="customKeySheet"
								value={customKey}
								onChange={(e) => setCustomKey(e.target.value)}
								placeholder="Enter custom deployment key"
								className="font-mono"
							/>
							{customKey && (
								<p
									className={`text-xs ${
										customKey.length < 16 || customKey.length > 64 ? "text-destructive" : "text-muted-foreground"
									}`}
								>
									Key length: {customKey.length} characters (must be 16-64)
								</p>
							)}
						</div>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="secondary">
								Cancel
							</Button>
						</DialogClose>
						<Button
							type="button"
							onClick={handleSetCustomKey}
							disabled={
								!customKey || customKey.length < 16 || customKey.length > 64 || setCustomDeploymentKeyMutation.isPending
							}
						>
							Apply Custom Key
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={!!confirmRollKey} onOpenChange={(open) => !open && setConfirmRollKey(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Confirm Roll Deployment Key</DialogTitle>
						<DialogDescription>
							Are you sure you want to generate a new deployment key for the{" "}
							<span className="font-semibold">{confirmRollKey?.deploymentName}</span> deployment on{" "}
							<span className="font-semibold">{confirmRollKey?.platformName}</span>?
						</DialogDescription>
					</DialogHeader>

					<DialogFooter className="mt-4">
						<DialogClose asChild>
							<Button type="button" variant="secondary">
								Cancel
							</Button>
						</DialogClose>
						<Button
							type="button"
							onClick={handleRollKey}
							disabled={rollDeploymentKeyMutation.isPending}
							variant="destructive"
						>
							{rollDeploymentKeyMutation.isPending ? "Rolling Key..." : "Roll Key"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
