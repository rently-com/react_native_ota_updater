"use client";

import { AppStoreFragmentProvider } from "@/web/store/store-provider";
import { getParamDecoded } from "@/web/store/util";
import { useParams } from "next/navigation";

export default function Template({ children }: React.PropsWithChildren) {
	const params = useParams();

	const platformName = getParamDecoded(params.platformName);

	return <AppStoreFragmentProvider platformName={platformName}>{children}</AppStoreFragmentProvider>;
}
