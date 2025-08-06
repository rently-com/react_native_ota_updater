"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { getAllCollaboratorAppsQueryOptions } from "@/web/lib/client/codepush-queries";
import AppsListTable from "./apps-table";

export default function CodePushAppsListTable() {
	const { data: collaboratorApps } = useSuspenseQuery(getAllCollaboratorAppsQueryOptions());

	return <AppsListTable collaboratorApps={collaboratorApps} />;
}
