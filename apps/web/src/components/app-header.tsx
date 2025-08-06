import { Separator } from "@/web/components/ui/separator";
import { SidebarTrigger } from "@/web/components/ui/sidebar";

import { Breadcrumbs } from "@/web/components/breadcrumbs";
import ThemeToggle from "@/web/components/providers/ThemeToggle/theme-toggle";
import { UserNav } from "@/web/components/user-nav";

export default function AppHeader() {
	return (
		<header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-16">
			<div className="flex items-center gap-2 px-4">
				<SidebarTrigger className="-ml-1" />

				<Separator orientation="vertical" className="mr-2 h-4" />

				<Breadcrumbs />
			</div>

			<div className="flex items-center gap-2 px-4">
				<ThemeToggle />

				<UserNav />
			</div>
		</header>
	);
}
