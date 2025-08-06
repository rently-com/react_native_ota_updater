"use client";

import { Icons } from "@/web/components/ui/icons";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/web/components/ui/sidebar";
import { PAGES } from "@/web/lib/constants";

import { Home, Info } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { BRANDING } from "@/web/branding";

import pkgJson from "../../package.json";

const Heading = {
	url: PAGES.HOME,
	name: BRANDING.name,
	logo: BRANDING.logo,
	subtitle: "React-Native OTA Updater",
};

// Menu items.
const items = [
	{
		title: "Home",
		url: PAGES.HOME,
		icon: Home,
	},
	{
		title: "CodePush Apps",
		url: PAGES.CODEPUSH,
		icon: Icons.codepush,
	},
];

export function AppSidebar() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const isExactHome = pathname === PAGES.HOME;

	const codePushPlatformRegex = /^\/codepush\/[^/]+\/(android|ios)$/;
	const isCodePushPlatformRoute = codePushPlatformRegex.test(pathname);

	const isAndroid = pathname.includes("/android");
	const isIos = pathname.includes("/ios");

	const getPlatformUrl = (targetPlatform: "android" | "ios") => {
		const currentPlatform = pathname.includes("/android") ? "android" : "ios";
		const newPath = pathname.replace(new RegExp(`/${currentPlatform}$`), `/${targetPlatform}`);
		return `${newPath}?${searchParams.toString()}`;
	};

	return (
		<Sidebar collapsible="icon">
			{/* Company Logo */}
			<SidebarHeader>
				<Link href={Heading.url}>
					<div className="flex gap-2 py-2 text-sidebar-accent-foreground">
						<div className="flex aspect-square size-8 items-center justify-center dark:text-white text-black">
							<Heading.logo className="size-8" />
						</div>

						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">{Heading.name}</span>
							<span className="truncate text-xs">{Heading.subtitle}</span>
						</div>
					</div>
				</Link>
			</SidebarHeader>

			<SidebarContent className="overflow-y-auto overflow-x-hidden">
				{/* Main Menu Items */}
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) => (
								<SidebarMenuItem key={`${item.title}-sidebar`}>
									<SidebarMenuButton
										asChild
										tooltip={item.title}
										isActive={
											(item.url === PAGES.HOME && isExactHome) || // Exact match for Home
											(item.url !== PAGES.HOME && pathname.startsWith(item.url)) // Match subroutes for others
										}
									>
										<Link href={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{isCodePushPlatformRoute && (
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem key={"iOS"}>
									<SidebarMenuButton
										asChild
										tooltip={"iOS"}
										isActive={isIos}
										className={`${isIos && "pointer-events-none"}`}
									>
										<Link href={getPlatformUrl("ios")}>
											<Icons.apple />
											<span>{"iOS"}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>

								<SidebarMenuItem key={"Android"}>
									<SidebarMenuButton
										asChild
										tooltip={"Android"}
										isActive={isAndroid}
										className={`${isAndroid && "pointer-events-none"}`}
									>
										<Link href={getPlatformUrl("android")}>
											<Icons.android />
											<span>{"Android"}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				)}
			</SidebarContent>

			<SidebarGroup>
				<SidebarGroupContent>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton tooltip="Version Info" className="text-sidebar-accent-foreground pointer-events-none">
								<Info className="size-4" />
								<span className="truncate text-xs">v{pkgJson.version}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroupContent>
			</SidebarGroup>

			<SidebarRail />
		</Sidebar>
	);
}
