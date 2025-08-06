"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { PAGES } from "@/web/lib/constants";

type BreadcrumbItem = {
	title: string;
	link: string;
};

// This allows to add custom title as well
const routeMapping: Record<string, BreadcrumbItem[]> = {
	"/": [{ title: "My Apps", link: PAGES.HOME }],
	"/codepush": [
		{ title: "My Apps", link: PAGES.HOME },
		{ title: "Codepush", link: PAGES.CODEPUSH },
	],
};

export function useBreadcrumbs() {
	const pathname = decodeURIComponent(usePathname());

	const breadcrumbs = useMemo(() => {
		// Check if we have a custom mapping for this exact path
		if (routeMapping[pathname]) {
			return routeMapping[pathname];
		}

		// If no exact match, fall back to generating breadcrumbs from the path
		const segments = pathname.split("/").filter(Boolean);

		const breadcrumbs: BreadcrumbItem[] = [
			{
				title: "My Apps",
				link: PAGES.HOME,
			},
		];

		segments.map((segment, index) => {
			const path = `/${segments.slice(0, index + 1).join("/")}`;

			breadcrumbs.push({
				title: segment.charAt(0).toUpperCase() + segment.slice(1),
				link: path,
			});
		});

		return breadcrumbs;
	}, [pathname]);

	return breadcrumbs;
}
