import { Skeleton } from "@/web/components/ui/skeleton";

import TokenDisplayBuilder from "./builder";

export default function TokenDisplayLoading() {
	return (
		<TokenDisplayBuilder
			title={<Skeleton className="h-6" />}
			description={<Skeleton className="h-4" />}
			inputValue=""
			inputDisabled={true}
			buttonDisabled={true}
			buttonIcon={<Skeleton className="h-4 w-4" />}
			footer={<Skeleton className="h-4 w-full" />}
		/>
	);
}
