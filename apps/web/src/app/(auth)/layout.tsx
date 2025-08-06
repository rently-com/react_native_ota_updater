import type { Metadata } from "next";

import ThemeToggle from "@/web/components/providers/ThemeToggle/theme-toggle";
import { METADATA } from "@/web/lib/constants";

export const metadata: Metadata = {
	title: `${METADATA.title} - Login`,
	description: METADATA.description,
};

export default function AuthLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="absolute top-4 right-4">
				<ThemeToggle />
			</div>

			{children}
		</div>
	);
}
