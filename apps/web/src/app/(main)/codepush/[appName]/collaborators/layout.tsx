import type { Metadata } from "next";

import { METADATA } from "@/web/lib/constants";

type Props = {
	params: Promise<{ appName: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const appName = decodeURIComponent((await params).appName);

	return {
		title: `CodePush - ${appName} - Collaborators`,
		description: METADATA.description,
	};
}

export default async function Layout({ children }: React.PropsWithChildren) {
	return <>{children}</>;
}
