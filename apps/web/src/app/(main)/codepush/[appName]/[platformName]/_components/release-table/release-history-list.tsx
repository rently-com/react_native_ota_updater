"use client";

import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/web/components/ui/table";
import { getPlatformDeploymentHistoryQueryOptions } from "@/web/lib/client/codepush-queries";
import { searchParams } from "@/web/lib/searchParams";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { ReleaseDetailsSheet } from "./release-detail-sheet";
import { ReleaseRow } from "./release-row";

export function ReleaseHistoryList() {
	const [{ label }] = useQueryStates(searchParams);

	const { data: releaseHistory } = useSuspenseQuery(getPlatformDeploymentHistoryQueryOptions());

	if (!releaseHistory?.length) {
		return (
			<div className="text-center p-12">
				<p className="text-lg text-muted-foreground">No releases available for this deployment.</p>
			</div>
		);
	}

	return (
		<>
			<div className="rounded-md border w-full">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead>Release</TableHead>
							<TableHead>Target Version</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Mandatory</TableHead>
							<TableHead>Rollbacks</TableHead>
							<TableHead>Active Devices</TableHead>
							<TableHead>Released On</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{releaseHistory.map((release) => (
							<ReleaseRow key={release.id} release={release} />
						))}
					</TableBody>
				</Table>
			</div>

			{label && <ReleaseDetailsSheet />}
		</>
	);
}
