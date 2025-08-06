import { Button } from "@/web/components/ui/button";
import { Skeleton } from "@/web/components/ui/skeleton";

export function ReleaseActionsSkeleton() {
	return (
		<div className="flex space-x-2 mt-2">
			<Button>
				<Skeleton className="h-8 w-24" />
			</Button>
			<Button variant="outline">
				<Skeleton className="h-8 w-24" />
			</Button>
		</div>
	);
}
