import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Creates a new user with email, password, role, and optional name/ORCID.
 * This handler hashes the password before storing it in the database.
 * Validates that email is unique before creating the user.
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Check if email already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('Email already exists');
    }

    // Hash the password using Bun's built-in password hashing
    const hashedPassword = await Bun.password.hash(input.password, {
      algorithm: 'bcrypt',
      cost: 10
    });

    // Insert the new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password: hashedPassword,
        role: input.role,
        name: input.name,
        orcid: input.orcid
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}