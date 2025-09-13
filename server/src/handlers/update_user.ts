import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq, and, ne } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';

/**
 * Updates an existing user's information.
 * Validates that the user exists and handles password hashing if password is being updated.
 * Validates email uniqueness if email is being changed.
 */
export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    // First, check if the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    const currentUser = existingUser[0];

    // If email is being updated, check for uniqueness
    if (input.email && input.email !== currentUser.email) {
      const emailExists = await db.select()
        .from(usersTable)
        .where(and(
          eq(usersTable.email, input.email),
          ne(usersTable.id, input.id)
        ))
        .execute();

      if (emailExists.length > 0) {
        throw new Error(`Email ${input.email} is already in use`);
      }
    }

    // Prepare update values
    const updateValues: any = {
      updated_at: new Date()
    };

    // Add fields that are being updated
    if (input.email !== undefined) {
      updateValues.email = input.email;
    }
    if (input.role !== undefined) {
      updateValues.role = input.role;
    }
    if (input.name !== undefined) {
      updateValues.name = input.name;
    }
    if (input.orcid !== undefined) {
      updateValues.orcid = input.orcid;
    }

    // Hash password if it's being updated
    if (input.password !== undefined) {
      // Create a simple hash with salt using Node.js crypto
      const salt = randomBytes(16).toString('hex');
      const hash = createHash('sha256').update(input.password + salt).digest('hex');
      updateValues.password = `${salt}:${hash}`;
    }

    // Perform the update
    const result = await db.update(usersTable)
      .set(updateValues)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}