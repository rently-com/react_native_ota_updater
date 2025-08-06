"use client";

import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/web/components/ui/button";
import { PAGES } from "@/web/lib/constants";

interface ProgressButtonProps {
	isRedirecting?: boolean;
	duration?: number;
}

export default function HomepageBtn({ isRedirecting = false, duration = 5000 }: ProgressButtonProps) {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		if (isRedirecting) {
			const startTime = Date.now();

			const updateProgress = () => {
				const elapsed = Date.now() - startTime;
				const newProgress = Math.min((elapsed / duration) * 100, 100);
				setProgress(newProgress);

				if (elapsed < duration) {
					requestAnimationFrame(updateProgress);
				} else {
					redirect(PAGES.HOME);
				}
			};

			requestAnimationFrame(updateProgress);
		}
	}, [isRedirecting, duration]);

	return (
		<Button
			type="button"
			onClick={() => redirect(PAGES.HOME)}
			disabled={isRedirecting}
			className="relative w-full overflow-hidden transition-all"
			style={{
				background: isRedirecting
					? `linear-gradient(to right, hsl(var(--primary)) ${progress}%, hsl(var(--primary)/0.1) ${progress}%)`
					: undefined,
			}}
		>
			<span className={isRedirecting ? "text-primary-foreground" : undefined}>
				{isRedirecting ? (
					<div className="flex items-center justify-center gap-2">
						<span>Redirecting in {Math.ceil((duration - (progress * duration) / 100) / 1000)}s</span>
					</div>
				) : (
					"Return to Home Page"
				)}
			</span>
		</Button>
	);
}
