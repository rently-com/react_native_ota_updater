"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/web/components/ui/avatar";
import { Badge } from "@/web/components/ui/badge";
import { TableCell, TableRow } from "@/web/components/ui/table";
import type { TReleaseHistory } from "@/web/lib/client/codepush-queries";
import { searchParams } from "@/web/lib/searchParams";
import { format } from "date-fns";
import { useQueryStates } from "nuqs";

type ReleaseRowProps = {
	release: TReleaseHistory;
};

export function ReleaseRow({ release }: ReleaseRowProps) {
	const [_, setParams] = useQueryStates(searchParams);

	const isReleaseNotVerified = release.isVerified ? "" : "pointer-events-none";

	return (
		<>
			<TableRow
				className={`cursor-pointer hover:bg-muted/50 ${isReleaseNotVerified}`}
				onClick={() => setParams({ label: release.label })}
			>
				<TableCell>
					<div className="flex items-center gap-2">
						<Avatar className="h-8 w-8">
							<AvatarImage src={release.releasedByUser.image || undefined} />
							<AvatarFallback>{release.releasedByUser.name.charAt(0)}</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="font-medium">{release.label}</span>
							<span className="text-sm text-muted-foreground">{release.releasedByUser.name}</span>
						</div>
					</div>
				</TableCell>
				<TableCell className="font-mono">{release.appVersion}</TableCell>
				<TableCell>
					{release.isVerified ? (
						<Badge variant={release.isDisabled ? "secondary" : "default"}>
							{release.isDisabled ? "Disabled" : "Enabled"}
						</Badge>
					) : (
						<Badge variant="destructive">Not Verified</Badge>
					)}
				</TableCell>
				<TableCell>
					<Badge variant={!release.isMandatory ? "secondary" : "default"}>{release.isMandatory ? "Yes" : "No"}</Badge>
				</TableCell>
				<TableCell className="font-mono">{release.metrics?.failedCount || "-"}</TableCell>
				<TableCell className="font-mono">{release.metrics?.activeCount || "-"}</TableCell>
				<TableCell>{format(new Date(release.createdAt), "MMM d, h:mm a")}</TableCell>
			</TableRow>
		</>
	);
}
