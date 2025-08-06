import { authMiddleware } from "@rentlydev/rnota-auth";

export default authMiddleware;

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico, sitemap.xml, robots.txt (metadata files)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
		/**
		 * Protected Routes
		 * */
		"/cli-login",
		"/",
		"/codepush/(.*)",
		"/apps/(.*)",
	],
};
