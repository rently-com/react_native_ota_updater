import type { Metadata } from "next";

import { METADATA } from "@/web/lib/constants";

export const metadata: Metadata = {
	title: `${METADATA.title} - CodePush`,
	description: METADATA.description,
};

export default async function Layout({ children }: React.PropsWithChildren) {
	return <>{children}</>;
}
