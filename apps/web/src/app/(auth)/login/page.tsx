import { redirect } from "next/navigation";
import { Suspense } from "react";

import pkgJson from "../../../../package.json";

import GithubSignInButton from "@/web/components/github-button";
import GithubSignInButtonLoading from "@/web/components/github-button/loading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/web/components/ui/card";
import { PAGES } from "@/web/lib/constants";

import { auth } from "@rentlydev/rnota-auth";

interface LoginPageProps {
	searchParams: Promise<{ callbackUrl: string | undefined }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
	const { callbackUrl = PAGES.HOME } = await searchParams;
	const session = await auth();

	if (session) redirect(callbackUrl);

	return (
		<div className="w-full max-w-sm">
			<div className="flex flex-col gap-6 items-center">
				<Card>
					<CardHeader className="text-center">
						<CardTitle className="text-2xl">React-Native OTA Updater</CardTitle>
						<CardDescription>Welcome Back!</CardDescription>
					</CardHeader>

					<CardContent>
						<form>
							<div className="flex flex-col gap-6">
								<Suspense fallback={<GithubSignInButtonLoading />}>
									<GithubSignInButton />
								</Suspense>
							</div>
						</form>
					</CardContent>
				</Card>

				<p className="text-sm text-muted-foreground">v{pkgJson.version}</p>
			</div>
		</div>
	);
}
