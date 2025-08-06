"use client";

import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/web/components/ui/table";
import { getCollaboratorsQueryOptions } from "@/web/lib/client/codepush-queries";
import { useAppName } from "@/web/store/store";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CollaboratorRow } from "./collaborator-row";

export function CollaboratorsTable() {
	const appName = useAppName();

	const { data: collaborators } = useSuspenseQuery(getCollaboratorsQueryOptions());

	if (!collaborators?.length) {
		return (
			<div className="text-center p-12">
				<p className="text-lg text-muted-foreground">No collaborators available for this app.</p>
			</div>
		);
	}

	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>User</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Permission</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{collaborators.map((collaborator) => (
						<CollaboratorRow key={collaborator.userId} collaborator={collaborator} appName={appName} />
					))}
				</TableBody>
			</Table>
		</>
	);
}
