/**
 * Core Storage Manager Module
 * This module provides the main storage management functionality for the application,
 * including user management, access control, and integration with specialized managers.
 */

import { and, desc, eq, sql } from "drizzle-orm/sql";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "../client";

import { accessKey, user } from "../schema";
import type { TAccessKey, TInsertAccessKey, TUpdateAccessKey, TUser } from "../schema";

import { InternalStorageError, StorageError, queryWrapper } from "../lib/errors";
import { STORAGE_ERROR_STRINGS } from "../lib/strings";
import { CodePushStorageManager } from "./codepush";

/**
 * Main Storage Manager Class
 * Provides centralized database access and management functionality
 *
 * Features:
 * - User management (CRUD operations)
 * - Access key management
 * - Integration with CodePush managers
 * - Database health monitoring
 *
 * @throws {InternalStorageError} For database operation failures (500)
 * @throws {StorageError} For business logic failures (400, 401, 403, 404, 409)
 */
export class StorageManager {
	/** CodePush-specific storage operations */
	public codepush: CodePushStorageManager;

	constructor() {
		this.codepush = new CodePushStorageManager();
	}

	/**
	 * Database Health Check
	 * Verifies database connection and basic query functionality
	 * @throws {InternalStorageError} If health check fails
	 */
	public async checkHealth(): Promise<void> {
		const [error] = await queryWrapper(db.execute(sql`SELECT 1`));
		if (error) {
			throw new InternalStorageError("Database health check failed!", error);
		}
	}

	/**
	 * User Management Methods
	 */

	/**
	 * Retrieves a user by their ID
	 * @param {string} userId - User's unique identifier
	 * @returns {Promise<TUser>} User object
	 * @throws {StorageError} If user not found
	 * @throws {InternalStorageError} If database query fails
	 */
	public async getUserById(userId: TUser["id"]): Promise<TUser> {
		const [error, userInDb] = await queryWrapper(db.query.user.findFirst({ where: eq(user.id, userId) }));

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.USER.FAILED.GET_BY_ID, error);
		}

		if (!userInDb) {
			throw new StorageError(STORAGE_ERROR_STRINGS.USER.NOT_FOUND, HttpStatusCodes.NOT_FOUND);
		}

		return userInDb;
	}

	/**
	 * Retrieves all users in the system
	 * @returns {Promise<TUser[]>} Array of user objects
	 * @throws {InternalStorageError} If database query fails
	 */
	public async getAllUsers(): Promise<TUser[]> {
		const [error, usersInDb] = await queryWrapper(
			db.query.user.findMany({
				orderBy: [desc(user.createdAt)],
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.USER.FAILED.GET_ALL, error);
		}

		return usersInDb;
	}

	/**
	 * Retrieves a user by their email address
	 * @param {string} email - User's email address
	 * @returns {Promise<TUser>} User object
	 * @throws {StorageError} If user not found
	 * @throws {InternalStorageError} If database query fails
	 */
	public async getUserByEmail(email: TUser["email"]): Promise<TUser> {
		const [error, userInDb] = await queryWrapper(db.query.user.findFirst({ where: eq(user.email, email) }));

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.USER.FAILED.GET_BY_EMAIL, error);
		}

		if (!userInDb) {
			throw new StorageError(STORAGE_ERROR_STRINGS.USER.NOT_FOUND, HttpStatusCodes.NOT_FOUND);
		}

		return userInDb;
	}

	/**
	 * Retrieves a user by their access key token
	 * Also validates the access key's expiration
	 * @param {string} accessKeyToken - Access key token
	 * @returns {Promise<TUser>} User object
	 * @throws {StorageError} If access key invalid/expired
	 * @throws {InternalStorageError} If database query fails
	 */
	public async getUserByAccessKeyToken(accessKeyToken: TAccessKey["token"]): Promise<TUser> {
		const [error, accessKeyInDb] = await queryWrapper(
			db.query.accessKey.findFirst({
				where: eq(accessKey.token, accessKeyToken),
				with: { user: true },
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.USER.FAILED.GET_BY_ACCESS_TOKEN, error);
		}

		if (!accessKeyInDb) {
			throw new StorageError("Unauthorized", HttpStatusCodes.UNAUTHORIZED);
		}

		// Check access key expiration
		const now = new Date();
		const expiresAt = new Date(accessKeyInDb.expiresAt);

		if (now >= expiresAt) {
			await this.removeAccessKeyByToken(accessKeyInDb.userId, accessKeyToken);
			throw new StorageError(STORAGE_ERROR_STRINGS.ACCESS_KEY.EXPIRED, HttpStatusCodes.UNAUTHORIZED);
		}

		return accessKeyInDb.user;
	}

	/**
	 * Access Key Management Methods
	 */

	/**
	 * Validates uniqueness of access key name for a user
	 * @param {string} userId - User's ID
	 * @param {string} accessKeyName - Proposed access key name
	 * @throws {StorageError} If name already exists
	 * @throws {InternalStorageError} If database query fails
	 */
	public async throwIfAccessKeyNameDuplicate(userId: TUser["id"], accessKeyName: TAccessKey["name"]): Promise<void> {
		const [error, accessKeyInDb] = await queryWrapper(
			db.query.accessKey.findFirst({
				where: and(eq(accessKey.userId, userId), eq(accessKey.name, accessKeyName)),
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.ACCESS_KEY.FAILED.GET_BY_NAME, error);
		}

		if (accessKeyInDb) {
			throw new StorageError(STORAGE_ERROR_STRINGS.ACCESS_KEY.CONFLICT_NAME(accessKeyName), HttpStatusCodes.CONFLICT);
		}
	}

	/**
	 * Creates a new access key
	 * @param {TInsertAccessKey} accessKeyData - Access key data
	 * @returns {Promise<TAccessKey>} Created access key
	 * @throws {StorageError} If name already exists
	 * @throws {InternalStorageError} If database operation fails
	 */
	public async addAccessKey(accessKeyData: TInsertAccessKey): Promise<TAccessKey> {
		await this.throwIfAccessKeyNameDuplicate(accessKeyData.userId, accessKeyData.name);

		const [error, insertedAccessKey] = await queryWrapper(
			db
				.insert(accessKey)
				.values({
					name: accessKeyData.name,
					userId: accessKeyData.userId,
					createdBy: accessKeyData.createdBy,
					expiresAt: accessKeyData.expiresAt,
				})
				.returning(),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.ACCESS_KEY.FAILED.ADD, error);
		}

		return insertedAccessKey[0]!;
	}

	/**
	 * Retrieves all access keys for a user
	 * @param {string} userId - User's ID
	 * @returns {Promise<TAccessKey[]>} Array of access keys
	 * @throws {InternalStorageError} If database query fails
	 */
	public async getAccessKeysByUserId(userId: TUser["id"]): Promise<TAccessKey[]> {
		const [error, accessKeysInDb] = await queryWrapper(
			db.query.accessKey.findMany({
				where: eq(accessKey.userId, userId),
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.ACCESS_KEY.FAILED.GET_BY_USER, error);
		}

		return accessKeysInDb;
	}

	/**
	 * Retrieves an access key by name for a specific user
	 * @param {string} userId - User's ID
	 * @param {string} accessKeyName - Access key name
	 * @returns {Promise<TAccessKey>} Access key object
	 * @throws {StorageError} If access key not found
	 * @throws {InternalStorageError} If database query fails
	 */
	public async getAccessKeyByName(userId: TUser["id"], accessKeyName: TAccessKey["name"]): Promise<TAccessKey> {
		const [error, accessKeyInDb] = await queryWrapper(
			db.query.accessKey.findFirst({
				where: and(eq(accessKey.userId, userId), eq(accessKey.name, accessKeyName)),
			}),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.ACCESS_KEY.FAILED.GET_BY_NAME, error);
		}

		if (!accessKeyInDb) {
			throw new StorageError(STORAGE_ERROR_STRINGS.ACCESS_KEY.NOT_FOUND, HttpStatusCodes.NOT_FOUND);
		}

		return accessKeyInDb;
	}

	/**
	 * Updates an access key's name and/or expiration date
	 *
	 * @param userId - ID of the user who owns the access key
	 * @param accessKeyData - Object containing token and update fields (name and/or expiresAt)
	 * @returns Updated access key object
	 * @throws {StorageError} If access key name already exists for user
	 * @throws {InternalStorageError} If database update fails
	 */
	public async updateAccessKeyByToken(userId: TUser["id"], accessKeyData: TUpdateAccessKey): Promise<TAccessKey> {
		if (accessKeyData.name) {
			await this.throwIfAccessKeyNameDuplicate(userId, accessKeyData.name);
		}

		const [error, updatedAccessKey] = await queryWrapper(
			db
				.update(accessKey)
				.set({
					name: accessKeyData.name,
					expiresAt: accessKeyData.expiresAt,
				})
				.where(and(eq(accessKey.token, accessKeyData.token), eq(accessKey.userId, userId)))
				.returning(),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.ACCESS_KEY.FAILED.UPDATE, error);
		}

		return updatedAccessKey[0]!;
	}

	/**
	 * Deletes a specific access key for a user
	 *
	 * @param userId - ID of the user who owns the access key
	 * @param accessKeyToken - Token of the access key to delete
	 * @throws {InternalStorageError} If database deletion fails
	 */
	public async removeAccessKeyByToken(userId: TUser["id"], accessKeyToken: TAccessKey["token"]): Promise<void> {
		const [error] = await queryWrapper(
			db.delete(accessKey).where(and(eq(accessKey.token, accessKeyToken), eq(accessKey.userId, userId))),
		);

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.ACCESS_KEY.FAILED.REMOVE, error);
		}
	}

	/**
	 * Deletes all access keys for a user
	 *
	 * @param userId - ID of the user whose access keys should be deleted
	 * @throws {InternalStorageError} If database deletion fails
	 */
	public async removeAccessKeys(userId: TUser["id"]): Promise<void> {
		const [error] = await queryWrapper(db.delete(accessKey).where(eq(accessKey.userId, userId)));

		if (error) {
			throw new InternalStorageError(STORAGE_ERROR_STRINGS.ACCESS_KEY.FAILED.REMOVE, error);
		}
	}
}
