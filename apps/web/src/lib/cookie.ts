/**
 * Cookie utility functions for handling user preferences
 */

const AUTO_LOGIN_COOKIE = "auto-login-github";
const USER_LOGGED_OUT_COOKIE = "user-logged-out";

/**
 * Sets the auto-login cookie preference
 * @param value - Whether to enable auto-login
 */
export function setAutoLoginCookie(value: boolean): void {
	document.cookie = `${AUTO_LOGIN_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
}

/**
 * Gets the auto-login cookie preference
 * @returns Boolean indicating if auto-login is enabled, false if not set
 */
export function getAutoLoginCookie(): boolean {
	const cookies = document.cookie.split(";");
	const cookie = cookies.find((c) => c.trim().startsWith(`${AUTO_LOGIN_COOKIE}=`));

	if (!cookie) return false;

	return cookie.split("=")[1] === "true";
}

/**
 * Removes the auto-login cookie preference
 */
export function removeAutoLoginCookie(): void {
	document.cookie = `${AUTO_LOGIN_COOKIE}=; path=/; max-age=0`;
}

/**
 * Sets the user-logged-out flag
 * This is used to prevent auto-login after a user manually logs out
 */
export function setUserLoggedOut(): void {
	document.cookie = `${USER_LOGGED_OUT_COOKIE}=true; path=/; max-age=${60 * 60 * 24}`; // 24 hours
}

/**
 * Checks if the user has manually logged out
 * @returns Boolean indicating if user manually logged out
 */
export function hasUserLoggedOut(): boolean {
	const cookies = document.cookie.split(";");
	const cookie = cookies.find((c) => c.trim().startsWith(`${USER_LOGGED_OUT_COOKIE}=`));
	return cookie !== undefined;
}

/**
 * Clears the user-logged-out flag
 * Called after a successful manual login
 */
export function clearUserLoggedOut(): void {
	document.cookie = `${USER_LOGGED_OUT_COOKIE}=; path=/; max-age=0`;
}
