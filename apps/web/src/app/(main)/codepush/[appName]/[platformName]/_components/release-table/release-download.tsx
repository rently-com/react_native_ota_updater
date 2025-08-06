"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Button } from "@/web/components/ui/button";
import { Skeleton } from "@/web/components/ui/skeleton";
import { getReleaseDownloadUrlQueryOptions } from "@/web/lib/client/codepush-queries";

export default function ReleaseDownload({ blobId }: { blobId: string }) {
	const { data: url } = useSuspenseQuery(getReleaseDownloadUrlQueryOptions({ blobId }));

	return (
		<Link href={url} target="_blank">
			<Button variant="outline">Download</Button>
		</Link>
	);
}

export function ReleaseDownloadSkeleton() {
	return (
		<Button variant="outline" disabled>
			<Skeleton className="h-4 w-24" />
		</Button>
	);
}
