import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";

import { generateCliTokenQueryOptions } from "@/web/lib/client/common-queries";
import { getQueryClient } from "@/web/lib/query-client";

import TokenDisplay from "@/web/components/token-display";
import TokenDisplayError from "@/web/components/token-display/error";
import TokenDisplayLoading from "@/web/components/token-display/loading";

interface CliLoginPageProps {
	searchParams: Promise<{ hostname: string | undefined }>;
}

export default async function CliLoginPage({ searchParams }: CliLoginPageProps) {
	const queryClient = getQueryClient();
	const { hostname } = await searchParams;

	if (!hostname) {
		return <TokenDisplayError />;
	}

	void queryClient.prefetchQuery(generateCliTokenQueryOptions({ hostname }));

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<TokenDisplayLoading />}>
				<TokenDisplay hostname={hostname} />
			</Suspense>
		</HydrationBoundary>
	);
}
