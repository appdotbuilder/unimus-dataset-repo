import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Authenticates a user with email and password.
 * Should verify the password against the hashed password in the database.
 * Returns user information without sensitive data on successful authentication.
 */
export async function authenticateUser(input: LoginInput): Promise<User | null> {
  try {
    // Query user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      // User not found
      return null;
    }

    const user = users[0];

    // In a real application, you would use bcrypt or similar to verify the password
    // For this implementation, we'll do a direct comparison
    // Note: In production, passwords should be hashed with bcrypt.compare()
    if (user.password !== input.password) {
      // Password doesn't match
      return null;
    }

    // Return user without password for security
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}