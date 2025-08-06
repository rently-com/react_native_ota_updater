import type { Metadata } from "next";

import { METADATA } from "@/web/lib/constants";

type Props = {
	params: Promise<{ appName: string; platformName: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const appName = decodeURIComponent((await params).appName);
	const platform = decodeURIComponent((await params).platformName);

	return {
		title: `CodePush - ${appName} - ${platform}`,
		description: METADATA.description,
	};
}

export default async function Layout({ children }: React.PropsWithChildren) {
	return <>{children}</>;
}
