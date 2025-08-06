"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import NextTopLoader from "nextjs-toploader";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { SessionProvider } from "@rentlydev/rnota-auth/react";

import ThemeProvider from "@/web/components/providers/ThemeToggle/theme-provider";
import { Toaster } from "@/web/components/ui/sonner";

import { getQueryClient } from "@/web/lib/query-client";
import { AppStoreProvider } from "@/web/store/store-provider";

export default function Providers({ children }: React.PropsWithChildren) {
	const queryClient = getQueryClient();

	return (
		<>
			<NuqsAdapter>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
					<SessionProvider>
						<AppStoreProvider>
							<QueryClientProvider client={queryClient}>
								<NextTopLoader showSpinner={false} />

								{children}

								<Toaster />
								<ReactQueryDevtools />
							</QueryClientProvider>
						</AppStoreProvider>
					</SessionProvider>
				</ThemeProvider>
			</NuqsAdapter>
		</>
	);
}
