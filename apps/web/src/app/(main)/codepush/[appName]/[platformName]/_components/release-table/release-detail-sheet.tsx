"use client";

import ErrorDisplay from "@/web/components/app-error-display";
import { Avatar, AvatarFallback, AvatarImage } from "@/web/components/ui/avatar";
import { Badge } from "@/web/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/web/components/ui/sheet";
import { Skeleton } from "@/web/components/ui/skeleton";
import { Textarea } from "@/web/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/web/components/ui/tooltip";
import { getReleaseDetailsQueryOptions } from "@/web/lib/client/codepush-queries";
import { searchParams } from "@/web/lib/searchParams";
import { formatBytes } from "@/web/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Info } from "lucide-react";
import { useQueryStates } from "nuqs";
import { Suspense } from "react";
import { CircularProgress } from "./circular-progress";
import { EditReleaseDialog } from "./edit-release-dialog";
import { ReleaseActions } from "./release-actions";
import { ReleaseActionsSkeleton } from "./release-actions-loading";
import { ReleaseDetailsSkeleton } from "./release-detail-sheet-loading";
import ReleaseDownload, { ReleaseDownloadSkeleton } from "./release-download";

export function ReleaseDetailsSheet() {
	const [{ deployment, label }, setParams] = useQueryStates(searchParams);

	const { data: release, isPending, isError, error, dataUpdatedAt } = useQuery(getReleaseDetailsQueryOptions());

	const onClose = () => setParams({ label: null });

	return (
		<Sheet open={!!label} onOpenChange={onClose}>
			<SheetContent className="w-full sm:max-w-2xl overflow-y-auto" aria-describedby={undefined}>
				{isError && <ErrorDisplay error={error} asChild />}

				{isPending ? (
					<>
						<SheetTitle>
							<Skeleton className="h-8 w-48" />
						</SheetTitle>

						<ReleaseDetailsSkeleton />
					</>
				) : release ? (
					<>
						<SheetTitle>
							{release.label}{" "}
							<span className="text-xs text-muted-foreground">
								{dataUpdatedAt ? `(Last fetched: ${format(new Date(dataUpdatedAt), "MMM d, h:mm:ss a")})` : ""}
							</span>
						</SheetTitle>

						<SheetHeader className="flex-row justify-between items-center space-x-2 my-6">
							{release.isVerified && (
								<>
									<div className="flex items-center space-x-2">
										<EditReleaseDialog release={release} />

										<Suspense fallback={<ReleaseDownloadSkeleton />}>
											<ReleaseDownload blobId={release.blobId} />
										</Suspense>
									</div>

									<Suspense fallback={<ReleaseActionsSkeleton />}>
										<ReleaseActions />
									</Suspense>
								</>
							)}
						</SheetHeader>

						<div className="space-y-8">
							<div className="grid grid-cols-2 gap-8">
								<div className="flex flex-col items-center">
									<CircularProgress value={release.rollout ?? 100} label="ROLLOUT" size={140} strokeWidth={8} />
									<div className="mt-4 text-center">
										<div className="text-sm text-muted-foreground">Rollbacks</div>
										<div className="text-2xl font-mono relative">
											<div className="text-center">{release.metrics?.failedCount || "-"}</div>
											{release.metrics?.failedCount && release.metrics?.installedCount ? (
												<div className="absolute top-1/2 -translate-y-1/2 left-[calc(100%+0.5rem)]">
													<Tooltip>
														<TooltipTrigger asChild>
															<Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
														</TooltipTrigger>
														<TooltipContent>
															<p>
																{release.metrics.failedCount / release.metrics.installedCount < 0.01
																	? "<1%"
																	: `~${Math.round((release.metrics.failedCount / release.metrics.installedCount) * 100)}%`}{" "}
																of total installs
															</p>
														</TooltipContent>
													</Tooltip>
												</div>
											) : null}
										</div>
									</div>
								</div>

								<div className="flex flex-col items-center">
									<CircularProgress
										value={
											release.metrics?.installedCount
												? Math.round((release.metrics.activeCount / release.metrics.installedCount) * 100)
												: 0
										}
										label="ACTIVE"
										size={140}
										strokeWidth={8}
										subtitle={`${release.metrics?.activeCount ?? 0} of ${release.metrics?.installedCount ?? 0}`}
									/>
									<div className="mt-4 grid grid-cols-2 gap-8 text-center">
										<div>
											<div className="text-sm text-muted-foreground">Installs</div>
											<div className="text-2xl font-mono">{release.metrics?.installedCount ?? "-"}</div>
										</div>

										<div>
											<div className="text-sm text-muted-foreground">Downloads</div>
											<div className="text-2xl font-mono relative">
												<div className="text-center">{release.metrics?.downloadedCount ?? "-"}</div>
												<div className="absolute top-1/2 -translate-y-1/2 left-[calc(100%+0.5rem)]">
													<Tooltip>
														<TooltipTrigger asChild>
															<Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
														</TooltipTrigger>
														<TooltipContent className="max-w-[200px]">
															<p>
																Download Count might be inaccurate if CodePush Install Mode is Immediate due to Clients
																unable to inform server before restarting.
															</p>
														</TooltipContent>
													</Tooltip>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-x-8 gap-y-4">
								<div>
									<div className="text-sm text-muted-foreground">Deployment</div>
									<div className="capitalize">{deployment}</div>
								</div>

								<div>
									<div className="text-sm text-muted-foreground">Target Versions</div>
									<div className="font-mono">{release.appVersion}</div>
								</div>

								<div>
									<div className="text-sm text-muted-foreground">Mandatory</div>
									<Badge variant={!release.isMandatory ? "secondary" : "default"}>
										{release.isMandatory ? "Yes" : "No"}
									</Badge>
								</div>

								<div>
									<div className="text-sm text-muted-foreground">Release Method</div>
									<div className="capitalize">{release.releaseMethod}</div>
								</div>

								{release.releaseMethod !== "upload" && (
									<>
										{release.originalDeploymentName ? (
											<div>
												<div className="text-sm text-muted-foreground">Original Deployment</div>
												<div className="capitalize">{release.originalDeploymentName}</div>
											</div>
										) : null}
										<div>
											<div className="text-sm text-muted-foreground">Original Label</div>
											<div>{release.originalLabel}</div>
										</div>
									</>
								)}

								<div>
									<div className="text-sm text-muted-foreground">Size</div>
									<div>{formatBytes(release.size)}</div>
								</div>

								<div>
									<div className="text-sm text-muted-foreground">Package Hash</div>
									<div className="font-mono break-words">{release.packageHash}</div>
								</div>

								<div>
									<div className="text-sm text-muted-foreground">Status</div>
									{release.isVerified ? (
										<Badge variant={release.isDisabled ? "secondary" : "default"}>
											{release.isDisabled ? "Disabled" : "Enabled"}
										</Badge>
									) : (
										<Badge variant="destructive">Not Verified</Badge>
									)}
								</div>
							</div>

							<div className="grid grid-cols-2 gap-x-8 gap-y-4">
								<div>
									<div className="text-sm text-muted-foreground">Released On</div>
									<div>{format(new Date(release.createdAt), "MMM d, yyyy, h:mm:ss a")}</div>
								</div>

								<div>
									<div className="text-sm text-muted-foreground">Last Updated At</div>
									<div>{format(new Date(release.updatedAt), "MMM d, yyyy, h:mm:ss a")}</div>
								</div>

								<div>
									<div className="text-sm text-muted-foreground">Released By</div>
									<div className="flex items-center space-x-2 mt-1">
										<Avatar className="h-6 w-6">
											<AvatarImage src={release.releasedByUser.image || undefined} />
											<AvatarFallback>{release.releasedByUser.name.charAt(0)}</AvatarFallback>
										</Avatar>
										<span>{release.releasedByUser.name}</span>
									</div>
								</div>
							</div>

							<div>
								<div className="text-sm text-muted-foreground mb-2">DESCRIPTION</div>
								<Textarea
									className="font-mono text-sm w-full h-48 focus-visible:ring-0"
									value={release.description || "No description provided."}
									readOnly
								/>
							</div>
						</div>
					</>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
