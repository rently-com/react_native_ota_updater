"use client";

import { useParams } from "next/navigation";

import { AppStoreFragmentProvider } from "@/web/store/store-provider";
import { getParamDecoded } from "@/web/store/util";

export default function Template({ children }: React.PropsWithChildren) {
	const params = useParams();

	const appName = getParamDecoded(params.appName);
	const platformName = getParamDecoded(params.platformName);

	return (
		<AppStoreFragmentProvider appName={appName} platformName={platformName}>
			{children}
		</AppStoreFragmentProvider>
	);
}
