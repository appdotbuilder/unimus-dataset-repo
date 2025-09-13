import { db } from '../db';
import { profilesTable, usersTable } from '../db/schema';
import { type Profile } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Retrieves all profiles from the database with their associated user information.
 * Returns complete profile information including user details.
 */
export const getProfiles = async (): Promise<Profile[]> => {
  try {
    // Join profiles with users to get complete information
    const results = await db.select()
      .from(profilesTable)
      .innerJoin(usersTable, eq(profilesTable.user_id, usersTable.id))
      .execute();

    // Map joined results to Profile objects
    return results.map(result => ({
      id: result.profiles.id,
      user_id: result.profiles.user_id,
      type: result.profiles.type,
      institution: result.profiles.institution,
      department: result.profiles.department,
      orcid: result.profiles.orcid,
      created_at: result.profiles.created_at,
      updated_at: result.profiles.updated_at
    }));
  } catch (error) {
    console.error('Failed to retrieve profiles:', error);
    throw error;
  }
};