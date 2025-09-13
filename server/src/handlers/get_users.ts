import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

/**
 * Retrieves all users from the database.
 * This handler excludes sensitive information like passwords in the response.
 */
export const getUsers = async (): Promise<User[]> => {
  try {
    // Select all fields except password for security
    const result = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      name: usersTable.name,
      orcid: usersTable.orcid,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .execute();

    // Return users with password field set to empty string to match User type
    // This maintains type compatibility while ensuring password is never exposed
    return result.map(user => ({
      ...user,
      password: '' // Never expose actual password data
    }));
  } catch (error) {
    console.error('Failed to retrieve users:', error);
    throw error;
  }
};