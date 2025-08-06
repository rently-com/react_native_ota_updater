"use client";

import { InboxIcon } from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
import { useQueryStates } from "nuqs";
import { useMemo } from "react";

import { Card } from "@/web/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/web/components/ui/table";
import type { TCodePushApp } from "@/web/lib/client/codepush-queries";
import { ROLES, searchParams } from "@/web/lib/searchParams";

type TCollaboratorApps = TCodePushApp;
// TODO:: Fix this

interface AppsListTableProps {
	collaboratorApps: TCollaboratorApps; // Expecting an array now as per the expanded type
}

export default function AppsListTable({ collaboratorApps }: AppsListTableProps) {
	const router = useRouter();
	const [{ role, filter }] = useQueryStates(searchParams);

	// Infer appNameKey and routePrefix from the data
	const { inferredAppNameKey, inferredRoutePrefix } = useMemo(() => {
		const appNameKey = "app"; // Default to 'app' (CodePush)
		const routePrefix = "codepush"; // Default to 'codepush'

		return { inferredAppNameKey: appNameKey, inferredRoutePrefix: routePrefix };
	}, [collaboratorApps]);

	const filteredCollaboratorApps = useMemo(() => {
		if (!collaboratorApps) return []; // Handle null or undefined collaboratorApps

		return collaboratorApps.filter((collaboratorApp) => {
			if (role && role !== ROLES[0] && collaboratorApp.permission !== role) {
				return false;
			}

			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const app = (collaboratorApp as any)[inferredAppNameKey];
			if (!app) return false;

			return app.name.toLowerCase().includes(filter);
		});
	}, [collaboratorApps, role, filter, inferredAppNameKey]);

	if (!filteredCollaboratorApps?.length) {
		return (
			<div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
				<Card className="w-[350px] flex flex-col items-center justify-center p-8">
					<InboxIcon className="h-12 w-12 text-muted-foreground/50" />
					<p className="mt-4 text-xl font-semibold text-muted-foreground">No apps found</p>
					<p className="mt-4 text-sm text-muted-foreground text-center">
						It seems there are no applications available based on your applied filters.
					</p>
				</Card>

				<p className="text-sm text-muted-foreground text-center font-semibold">
					Note: Contact Admin to be added as a collaborator.
				</p>
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Role</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{filteredCollaboratorApps.map((collaboratorApp) => {
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					const app = (collaboratorApp as any)[inferredAppNameKey] as TCodePushApp[number]["app"];

					if (!app) return null;

					const handleRowClick = () => {
						router.push(`/${inferredRoutePrefix}/${app.name}`);
					};

					return (
						<TableRow key={app.id} onClick={handleRowClick} className="cursor-pointer">
							<TableCell>
								<div className="flex items-center gap-3">
									<img src={app.iconUrl ?? ""} alt="" className="h-10 w-10 rounded bg-muted" />
									<span>{app.name}</span>
								</div>
							</TableCell>

							<TableCell className="capitalize">{collaboratorApp.permission}</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
