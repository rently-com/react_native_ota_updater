import { Skeleton } from "@/web/components/ui/skeleton";

export default function AppHeaderSkeleton() {
	return (
		<div className="flex items-center gap-4">
			<Skeleton className="h-16 w-16 rounded" />

			<Skeleton className="h-8 w-48" />
		</div>
	);
}
