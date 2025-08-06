"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/web/components/ui/card";
import { Icons } from "@/web/components/ui/icons";
import { getAppQueryOptions } from "@/web/lib/client/codepush-queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Smartphone } from "lucide-react";
import Link from "next/link";

export default function PlatformsList() {
	const { data: app } = useSuspenseQuery(getAppQueryOptions());

	const navigateToPlatform = (platform: string) => `/codepush/${app?.name}/${platform}`;

	return (
		<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{app?.platforms.map((platform) => {
				const { id, name } = platform;
				const PlatformIcon = name === "ios" ? Icons.apple : name === "android" ? Icons.android : Smartphone;

				return (
					<Link href={navigateToPlatform(name)} key={id} className="block h-full">
						<Card className="cursor-pointer hover:shadow-lg transition-shadow h-full flex flex-col">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-2xl font-bold capitalize">{name}</CardTitle>

								<PlatformIcon className="h-6 w-6 dark:text-white text-black" />
							</CardHeader>

							<CardContent className="flex flex-col flex-grow">
								<p className="text-sm text-muted-foreground mb-4 flex-grow">
									Manage deployments and releases for {name} platform.
								</p>
								<div className="flex items-center text-sm text-blue-600 dark:text-blue-400 mt-auto">
									View details
									<ArrowRight className="ml-1 h-4 w-4" />
								</div>
							</CardContent>
						</Card>
					</Link>
				);
			})}
		</div>
	);
}
