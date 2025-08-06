import type { Metadata } from "next";
import { PublicEnvScript } from "next-runtime-env";
import { Geist, Geist_Mono } from "next/font/google";

import Providers from "@/web/components/providers/providers";
import { METADATA } from "@/web/lib/constants";

import "./globals.css";

export const metadata: Metadata = {
	title: METADATA.title,
	description: METADATA.description,
};

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<PublicEnvScript />
			</head>

			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
