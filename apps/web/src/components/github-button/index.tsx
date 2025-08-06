"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { signIn, useSession } from "@rentlydev/rnota-auth/react";

import LoadingSpinner from "@/web/components/loading-spinner";
import { Button } from "@/web/components/ui/button";
import { Checkbox } from "@/web/components/ui/checkbox";
import { Icons } from "@/web/components/ui/icons";
import { PAGES } from "@/web/lib/constants";
import { clearUserLoggedOut, getAutoLoginCookie, hasUserLoggedOut, setAutoLoginCookie } from "@/web/lib/cookie";

export default function GithubSignInButton() {
	const { data: session, status } = useSession();
	const [isLoading, startTransition] = useTransition();
	const [autoLogin, setAutoLogin] = useState(false);
	const [isLoggedOut, setIsLoggedOut] = useState(false);

	const searchParams = useSearchParams();
	const callbackUrl = searchParams.get("callbackUrl") ?? PAGES.HOME;

	useEffect(() => {
		const isManuallyLoggedOut = hasUserLoggedOut();

		// Check if user manually logged out
		setIsLoggedOut(isManuallyLoggedOut);

		// Only set auto-login if user hasn't manually logged out
		if (!isManuallyLoggedOut) {
			setAutoLogin(getAutoLoginCookie());
		}
	}, []);

	useEffect(() => {
		if (session?.user && status === "authenticated") {
			toast.success("Signed In Successfully!");
			// Clear the logged-out flag after successful login
			clearUserLoggedOut();
		}
	}, [status]);

	useEffect(() => {
		// Perform auto-login if:
		// 1. Auto-login is enabled
		// 2. User is not authenticated
		// 3. User has not manually logged out
		if (autoLogin && status === "unauthenticated" && !isLoggedOut) {
			toast.info("Signing in automatically...");
			signIn("github", { redirectTo: callbackUrl });
		}
	}, [autoLogin, status, callbackUrl, isLoggedOut]);

	const onClickHandler = async () => {
		startTransition(async () => {
			await signIn("github", { redirectTo: callbackUrl });

			toast.success("Signed In Successfully!");
			// Clear the logged-out flag after manual login attempt
			clearUserLoggedOut();
		});
	};

	const handleAutoLoginChange = (checked: boolean) => {
		setAutoLogin(checked);
		setAutoLoginCookie(checked);
	};

	return (
		<div className="flex flex-col gap-6 items-center">
			<Button type="button" onClick={onClickHandler} disabled={isLoading} className="w-full">
				{isLoading ? <LoadingSpinner /> : <Icons.github />}
				Continue with GitHub
			</Button>

			<div className="flex items-center space-x-2">
				<Checkbox id="auto-login" checked={autoLogin} onCheckedChange={handleAutoLoginChange} />
				<label
					htmlFor="auto-login"
					className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-muted-foreground"
				>
					Sign in automatically
				</label>
			</div>
		</div>
	);
}
