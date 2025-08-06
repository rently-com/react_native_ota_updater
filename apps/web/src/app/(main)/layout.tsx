import type { Metadata } from "next";
import { cookies } from "next/headers";

import AppHeader from "@/web/components/app-header";
import { AppSidebar } from "@/web/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/web/components/ui/sidebar";
import { METADATA } from "@/web/lib/constants";

export const metadata: Metadata = {
	title: `${METADATA.title} - Home`,
	description: METADATA.description,
};

export default async function MainLayout({ children }: React.PropsWithChildren) {
	// Persisting the sidebar state in the cookie.
	const cookieStore = await cookies();
	const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

	return (
		<>
			<SidebarProvider defaultOpen={defaultOpen}>
				<AppSidebar />

				<SidebarInset>
					<AppHeader />

					<main className="h-[calc(100vh-4rem)] overflow-auto">
						<div className="bg-background">
							<div className="container mx-auto p-8">{children}</div>
						</div>
					</main>
				</SidebarInset>
			</SidebarProvider>
		</>
	);
}
