import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/web/components/ui/card";

import { AccessKeysForm } from "./access-keys-form";
import { AccessKeysList } from "./access-keys-list";
import { AccessKeysListSkeleton } from "./loading";

export async function AccessKeys() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Access Keys</CardTitle>
				<CardDescription>Manage your API access keys for CLI and SDK authentication</CardDescription>
			</CardHeader>

			<CardContent>
				<AccessKeysForm />

				<Suspense fallback={<AccessKeysListSkeleton />}>
					<AccessKeysList />
				</Suspense>
			</CardContent>
		</Card>
	);
}
