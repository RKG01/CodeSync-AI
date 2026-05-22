/**
 * @module models/User
 * @description User model with static methods for CRUD operations.
 */

import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';

const SALT_ROUNDS = 12;

/**
 * User model class providing static methods for user data operations.
 */
class User {
  /**
   * Creates a new user with a hashed password.
   * @param {string} username - Unique username.
   * @param {string} email - Unique email address.
   * @param {string} password - Plain-text password (will be hashed).
   * @returns {Promise<Object>} The created user (without password_hash).
   * @throws {Error} If the username or email already exists.
   */
  static async create(username, email, password) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, avatar_url, created_at, updated_at`,
      [username, email, passwordHash]
    );

    return result.rows[0];
  }

  /**
   * Finds a user by their email address.
   * @param {string} email - The email to search for.
   * @returns {Promise<Object|null>} The user object (including password_hash) or null.
   */
  static async findByEmail(email) {
    const result = await query(
      `SELECT id, username, email, password_hash, avatar_url, created_at, updated_at, last_active_at
       FROM users WHERE email = $1`,
      [email]
    );

    return result.rows[0] || null;
  }

  /**
   * Finds a user by their ID.
   * @param {string} id - The user UUID.
   * @returns {Promise<Object|null>} The user object (without password_hash) or null.
   */
  static async findById(id) {
    const result = await query(
      `SELECT id, username, email, avatar_url, created_at, updated_at, last_active_at
       FROM users WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Finds a user by their username.
   * @param {string} username - The username to search for.
   * @returns {Promise<Object|null>} The user object (without password_hash) or null.
   */
  static async findByUsername(username) {
    const result = await query(
      `SELECT id, username, email, avatar_url, created_at, updated_at, last_active_at
       FROM users WHERE username = $1`,
      [username]
    );

    return result.rows[0] || null;
  }

  /**
   * Updates the last_active_at timestamp for a user.
   * @param {string} id - The user UUID.
   * @returns {Promise<void>}
   */
  static async updateLastActive(id) {
    await query(
      `UPDATE users SET last_active_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  /**
   * Validates a plain-text password against a hashed password.
   * @param {string} plainPassword - The plain-text password to check.
   * @param {string} hashedPassword - The stored hashed password.
   * @returns {Promise<boolean>} True if the password matches.
   */
  static async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

export default User;
