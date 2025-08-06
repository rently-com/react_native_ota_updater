/**
 * Snake Case Conversion Module
 *
 * This module provides utilities for converting JavaScript objects and their keys from
 * camelCase to snake_case format. It's particularly useful when preparing data for
 * APIs that expect snake_case formatting.
 *
 * Features:
 * - Deep recursive conversion of nested objects and arrays
 * - Type-safe conversion with TypeScript generics
 * - Preserves original value types
 * - Handles complex camelCase patterns
 */

/**
 * Regular expression for matching uppercase sequences followed by a lowercase word
 * Example: "HTTPResponse" -> "HTTP_Response"
 */
const UPPERCASE_WITH_LOWER_REGEX = /([A-Z]+)([A-Z][a-z])/g;

/**
 * Regular expression for matching lowercase followed by uppercase
 * Example: "camelCase" -> "camel_Case"
 */
const LOWERCASE_WITH_UPPER_REGEX = /([a-z])([A-Z])/g;

/**
 * Recursively converts all keys in an object or array from camelCase to snake_case
 *
 * This function traverses through objects and arrays, converting all object keys
 * to snake_case while preserving the original value types. It handles:
 * - Nested objects
 * - Arrays of objects
 * - Primitive values
 * - Complex camelCase patterns (e.g., "HTTPResponse", "camelCase")
 *
 * @template T - The type of the input object/array
 * @param {T} obj - The object or array to convert
 * @returns {T} A new object/array with snake_case keys, maintaining the original type
 *
 * @example
 * ```typescript
 * // Simple object
 * const input = { firstName: "John", lastName: "Doe" };
 * const output = convertObjectToSnakeCase(input);
 * // { first_name: "John", last_name: "Doe" }
 *
 * // Nested object with array
 * const complex = {
 *   userInfo: {
 *     fullName: "John Doe",
 *     contactDetails: [
 *       { phoneNumber: "123", emailAddress: "john@example.com" }
 *     ]
 *   }
 * };
 * const result = convertObjectToSnakeCase(complex);
 * // {
 * //   user_info: {
 * //     full_name: "John Doe",
 * //     contact_details: [
 * //       { phone_number: "123", email_address: "john@example.com" }
 * //     ]
 * //   }
 * // }
 * ```
 */
export function convertObjectToSnakeCase<T>(obj: T): T {
	if (Array.isArray(obj)) {
		// Use generic typing to ensure items maintain their types.
		return obj.map((item: T extends (infer U)[] ? U : never) => convertObjectToSnakeCase(item)) as unknown as T;
	}

	if (isObject(obj)) {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			const snakeCaseKey = toSnakeCase(key);
			result[snakeCaseKey] = convertObjectToSnakeCase(value);
		}
		return result as T;
	}

	// Return primitive values as is.
	return obj;
}

/**
 * Type guard to check if a value is a non-null object
 *
 * @param {unknown} value - The value to check
 * @returns {boolean} True if the value is a non-null object, false otherwise
 *
 * @example
 * ```typescript
 * isObject({}) // true
 * isObject({ key: "value" }) // true
 * isObject(null) // false
 * isObject([]) // true (arrays are objects)
 * isObject("string") // false
 * ```
 */
function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * Converts a camelCase string to snake_case
 *
 * This function handles various camelCase patterns:
 * - Standard camelCase ("camelCase" -> "camel_case")
 * - PascalCase ("PascalCase" -> "pascal_case")
 * - Acronyms ("HTTPResponse" -> "http_response")
 *
 * @param {string} str - The camelCase string to convert
 * @returns {string} The snake_case version of the string
 *
 * @example
 * ```typescript
 * toSnakeCase("camelCase") // "camel_case"
 * toSnakeCase("HTTPResponse") // "http_response"
 * toSnakeCase("simpleXML") // "simple_xml"
 * toSnakeCase("iOS") // "i_os"
 * ```
 */
function toSnakeCase(str: string): string {
	return str.replace(UPPERCASE_WITH_LOWER_REGEX, "$1_$2").replace(LOWERCASE_WITH_UPPER_REGEX, "$1_$2").toLowerCase();
}
