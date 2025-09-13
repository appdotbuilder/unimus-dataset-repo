import { db } from '../db';
import { profilesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Profile } from '../schema';

/**
 * Retrieves a specific user's profile by user ID.
 * Should include user details and all contributed datasets for profile pages.
 * Returns null if the user doesn't have a profile.
 */
export const getProfileByUser = async (userId: number): Promise<Profile | null> => {
  try {
    const profiles = await db.select()
      .from(profilesTable)
      .where(eq(profilesTable.user_id, userId))
      .execute();

    if (profiles.length === 0) {
      return null;
    }

    return profiles[0];
  } catch (error) {
    console.error('Profile retrieval failed:', error);
    throw error;
  }
};