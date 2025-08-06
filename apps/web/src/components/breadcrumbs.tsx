"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/web/components/ui/breadcrumb";
import { useBreadcrumbs } from "@/web/hooks/use-breadcrumbs";

import { Slash } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

export function Breadcrumbs() {
	const items = useBreadcrumbs();
	if (items.length === 0) return null;

	return (
		<Breadcrumb>
			<BreadcrumbList>
				{items.map((item, index) => (
					<Fragment key={item.title}>
						{index !== items.length - 1 && (
							<BreadcrumbItem className="hidden md:block">
								<BreadcrumbLink asChild>
									<Link href={item.link}>{item.title}</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
						)}

						{index < items.length - 1 && (
							<BreadcrumbSeparator className="hidden md:block">
								<Slash />
							</BreadcrumbSeparator>
						)}

						{index === items.length - 1 && <BreadcrumbPage>{item.title}</BreadcrumbPage>}
					</Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
