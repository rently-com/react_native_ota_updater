/**
 * AWS S3 module for handling file storage and retrieval operations
 * @module AWSModule
 */

import type { CopyObjectCommandInput, DeleteObjectCommandInput, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import env from "./env";
import { ENABLE_CLOUDFLARE } from "./flags";

//! NOTE: Make sure AWS Envs are set when NOT using Cloudflare.
//! Forcing Non-null assertions for TypeScript.

/**
 * CloudFront/Cloudflare R2 URL for serving S3/R2 objects. Ensures trailing slash for consistency.
 * @private
 */
let CDN_URL = ENABLE_CLOUDFLARE ? env.CLOUDFLARE_URL : env.AWS_CLOUDFRONT_URL!;

if (CDN_URL?.slice(-1) !== "/") {
	CDN_URL += "/"; // Ensure the URL ends with a trailing slash
}

/**
 * Name of the S3/R2 bucket used for storage
 * @private
 */
const BUCKET_NAME = ENABLE_CLOUDFLARE ? env.CLOUDFLARE_R2_BUCKET : env.AWS_S3_BUCKET!;

/**
 * Cloudflare R2 API endpoint URL constructed from Cloudflare account ID
 * @private
 */
const CLOUDFLARE_ENDPOINT = ENABLE_CLOUDFLARE
	? `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
	: undefined;

/**
 * S3 client instance configured with environment credentials
 * @private
 */
const s3Client = new S3Client({
	forcePathStyle: true,
	region: ENABLE_CLOUDFLARE ? "auto" : env.AWS_REGION!,
	endpoint: ENABLE_CLOUDFLARE ? CLOUDFLARE_ENDPOINT : undefined,
	credentials: {
		accessKeyId: ENABLE_CLOUDFLARE ? env.CLOUDFLARE_R2_ACCESS_KEY_ID : env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: ENABLE_CLOUDFLARE ? env.CLOUDFLARE_R2_ACCESS_KEY_SECRET : env.AWS_ACCESS_KEY_SECRET!,
	},
});

/**
 * Generates a CloudFront URL for accessing an object stored in an S3 bucket.
 * Uses the configured CloudFront distribution URL to create a public access URL.
 * The key is URL encoded to handle spaces and special characters.
 *
 * @param {string} key - The unique identifier of the object in S3
 * @returns {string} The CloudFront URL to access the object
 *
 * @example
 * ```typescript
 * const url = getDownloadUrlByKey('CodePush/My App/ios/Staging/v112/bundle');
 * // Returns: 'https://d1234.cloudfront.net/CodePush/My%20App/ios/Staging/v112/bundle'
 * ```
 */
export const getDownloadUrlByKey = (key: string): string => {
	const encodedKey = encodeURIComponent(key);
	const constructedUrl = `${CDN_URL}${encodedKey}`;
	return constructedUrl;
};

/**
 * Copies an object from one location to another within the same S3 bucket.
 * The destination object will be set with private ACL.
 *
 * @param {string} sourceObjectName - The path of the source object
 * @param {string} destinationObjectName - The path where the object should be copied
 * @returns {Promise<void>} Resolves when the copy operation completes
 * @throws {Error} If the copy operation fails
 *
 * @example
 * ```typescript
 * await copyObjectToDestination(
 *   'my-app/releases/v1/bundle.zip',
 *   'my-app/releases/latest/bundle.zip'
 * );
 * ```
 */
export const copyObjectToDestination = async (
	sourceObjectName: string,
	destinationObjectName: string,
): Promise<void> => {
	try {
		const params: CopyObjectCommandInput = {
			Bucket: BUCKET_NAME,

			CopySource: `${BUCKET_NAME}/${sourceObjectName}`,
			Key: destinationObjectName,
			ACL: "private",
		};

		const copyCommand = new CopyObjectCommand(params);

		await s3Client.send(copyCommand);

		return;
	} catch (error) {
		console.error("copyBlobToDestination ~ error:", error);
		throw new Error(`copyBlobToDestination - Error copying file: ${error}`);
	}
};

/**
 * Deletes multiple objects from the S3 bucket.
 * Processes deletions sequentially and logs the results.
 *
 * @param {string[]} objectNames - Array of object keys to delete
 * @returns {Promise<void>} Resolves when all objects have been deleted
 * @throws {Error} If any deletion operation fails
 *
 * @example
 * ```typescript
 * await deleteObjects([
 *   'my-app/releases/v1/bundle.zip',
 *   'my-app/releases/v1/manifest.json'
 * ]);
 * ```
 */
export const deleteObjects = async (objectNames: string[]): Promise<void> => {
	// Loop through the URLs to delete each file
	for (const objectName of objectNames) {
		try {
			const params: DeleteObjectCommandInput = {
				Bucket: BUCKET_NAME,
				Key: objectName,
			};

			const deleteCommand = new DeleteObjectCommand(params);

			// Execute the delete command
			await s3Client.send(deleteCommand);

			console.log(`Successfully deleted: ${objectName}`);
		} catch (error) {
			console.error(`deleteBlobs - Failed to delete S3 object: ${objectName}`, error);
			throw new Error(`deleteBlobs - Error deleting blob: ${error}`);
		}
	}
};

/**
 * Generates a pre-signed URL for uploading an object to S3.
 * The URL expires after 120 seconds (2 minutes) and is configured for private ACL.
 * The content type is set to 'application/zip'.
 *
 * @param {string} objectKey - The key where the object will be uploaded
 * @returns {Promise<string>} The pre-signed URL for uploading
 * @throws {Error} If URL generation fails
 *
 * @example
 * ```typescript
 * const uploadUrl = await getPresignedPostUrl('my-app/releases/v2/bundle.zip');
 * // Use the URL to upload a file:
 * await fetch(uploadUrl, {
 *   method: 'PUT',
 *   body: fileData,
 *   headers: { 'Content-Type': 'application/zip' }
 * });
 * ```
 */
export const getPresignedPostUrl = async (objectKey: string): Promise<string> => {
	try {
		const contentType = "application/zip";

		const params: PutObjectCommandInput = {
			Bucket: BUCKET_NAME,
			Key: objectKey,

			ContentType: contentType,
			ACL: "private",
		};

		const preSignedParams = {
			expiresIn: 120,
		};

		const command = new PutObjectCommand(params);
		const presignedUrl = await getSignedUrl(s3Client, command, preSignedParams);

		return presignedUrl;
	} catch (error) {
		console.error("generatePresignedUrl ~ error:", error);
		throw new Error(`generatePresignedUrl - Error generating presigned URL: ${error}`);
	}
};
