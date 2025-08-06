import { Card, CardContent, CardHeader } from "@/web/components/ui/card";
import { Skeleton } from "@/web/components/ui/skeleton";

export default function PlatformsListSkeleton() {
	return (
		<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			<Card className="cursor-pointer hover:shadow-lg transition-shadow h-full flex flex-col">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<Skeleton className="h-6 w-1/2 rounded" />

					<Skeleton className="h-6 w-6 rounded-full" />
				</CardHeader>

				<CardContent className="flex flex-col flex-grow">
					<Skeleton className="h-4 w-3/4 mb-4 flex-grow" />

					<div className="flex items-center">
						<Skeleton className="h-4 w-24 rounded" />
					</div>
				</CardContent>
			</Card>

			<Card className="cursor-pointer hover:shadow-lg transition-shadow h-full flex flex-col">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<Skeleton className="h-6 w-1/2 rounded" />

					<Skeleton className="h-6 w-6 rounded-full" />
				</CardHeader>

				<CardContent className="flex flex-col flex-grow">
					<Skeleton className="h-4 w-3/4 mb-4 flex-grow" />

					<div className="flex items-center mt-auto">
						<Skeleton className="h-4 w-24 rounded" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
