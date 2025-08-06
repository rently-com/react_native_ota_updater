"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckCheck, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { generateCliTokenQueryOptions } from "@/web/lib/client/common-queries";

import TokenDisplayBuilder from "./builder";
import TokenDisplayError from "./error";
import HomepageBtn from "./homepage-btn";

interface TokenDisplayProps {
	hostname: string;
}

export default function TokenDisplay({ hostname }: TokenDisplayProps) {
	const { data: token, error } = useSuspenseQuery(generateCliTokenQueryOptions({ hostname }));
	const [isCopying, setIsCopying] = useState(false);
	const [isRedirecting, setIsRedirecting] = useState(false);

	if (error || !token) {
		toast.error(error?.message ?? "An error occurred");
		return <TokenDisplayError />;
	}

	const copyToClipboard = async () => {
		try {
			setIsCopying(true);
			await navigator.clipboard.writeText(token);
			setIsRedirecting(true);
		} catch (error) {
			console.error("Failed to copy token:", error);
			setIsCopying(false);
			setIsRedirecting(false);
		}
	};

	return (
		<TokenDisplayBuilder
			title="Authentication succeeded"
			description="Please copy and paste this token to the command window:"
			inputValue={token}
			buttonIcon={isCopying ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
			onButtonClick={copyToClipboard}
			footer={
				<>
					After doing so, please close this browser tab.
					<HomepageBtn isRedirecting={isRedirecting} />
				</>
			}
		/>
	);
}
