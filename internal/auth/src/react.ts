/**
 * React components and hooks for Next.js Authentication
 * @module AuthReact
 *
 * This module re-exports essential React components and hooks from next-auth/react
 * for managing authentication state in React components.
 *
 * @example
 * ```tsx
 * // In your app root
 * import { SessionProvider } from '@rentlydev/rnota-auth/react';
 *
 * function App({ children }) {
 *   return (
 *     <SessionProvider>
 *       {children}
 *     </SessionProvider>
 *   );
 * }
 *
 * // In your components
 * import { useSession, signIn, signOut } from '@rentlydev/rnota-auth/react';
 *
 * function Profile() {
 *   const { data: session } = useSession();
 *
 *   if (!session) {
 *     return <button onClick={() => signIn()}>Sign in</button>;
 *   }
 *
 *   return (
 *     <div>
 *       Welcome {session.user.name}
 *       <button onClick={() => signOut()}>Sign out</button>
 *     </div>
 *   );
 * }
 * ```
 */

export {
	/**
	 * React Context Provider for Next.js Auth session management
	 * Must wrap your application to enable authentication features
	 */
	SessionProvider,
	/**
	 * Props type for SessionProvider component
	 */
	type SessionProviderProps,
	/**
	 * React hook to access the authentication session
	 * Returns the current session state and loading status
	 */
	useSession,
	/**
	 * Function to trigger the sign-in flow
	 * Can be called with optional provider and callback URL
	 */
	signIn,
	/**
	 * Function to sign out the current user
	 * Can be called with optional callback URL
	 */
	signOut,
} from "next-auth/react";
