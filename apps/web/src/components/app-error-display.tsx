"use client";

import { AlertTriangle } from "lucide-react";
import type React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/web/components/ui/card";

interface ErrorDisplayProps {
	error: Error;
	asChild?: boolean;
	title?: string;
	icon?: React.ReactNode;
}

export default function ErrorDisplay({
	error,
	asChild = false,
	title = "Error",
	icon = <AlertTriangle className="h-8 w-8" />,
}: ErrorDisplayProps) {
	return (
		<div className={`${!asChild && "fixed bg-black/50"} inset-0 flex items-center justify-center h-full`}>
			<Card className="w-full max-w-2xl mx-auto border-gray-800 bg-black text-white">
				<CardHeader className="border-b border-gray-800 p-6">
					<div className="flex items-center space-x-3">
						{icon}
						<CardTitle className="text-3xl font-bold">{title}</CardTitle>
					</div>
				</CardHeader>

				<CardContent className="pt-8 pb-6 px-8">
					<p className="text-xl leading-relaxed break-words">{error.message}</p>
				</CardContent>
			</Card>
		</div>
	);
}
