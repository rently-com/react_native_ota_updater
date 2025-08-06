"use client";

import ErrorDisplay from "@/web/components/app-error-display";

interface ErrorComponentProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function ErrorComponent({ error }: ErrorComponentProps) {
	return (
		<div className="flex items-center justify-center h-full">
			<ErrorDisplay error={error} />
		</div>
	);
}
