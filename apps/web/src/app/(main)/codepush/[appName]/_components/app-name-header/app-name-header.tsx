"use client";

import { getAppQueryOptions } from "@/web/lib/client/codepush-queries";
import { useSuspenseQuery } from "@tanstack/react-query";

export default function AppHeader() {
	const { data: app } = useSuspenseQuery(getAppQueryOptions());

	if (!app) {
		return null;
	}

	return (
		<div className="flex items-center gap-4">
			<img src={app.iconUrl ?? ""} alt={`${app.name} icon`} className="h-16 w-16 rounded" />

			<h1 className="text-3xl font-bold">{app.name}</h1>
		</div>
	);
}
