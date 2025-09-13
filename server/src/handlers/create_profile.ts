import { db } from '../db';
import { profilesTable, usersTable } from '../db/schema';
import { type CreateProfileInput, type Profile } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Creates a new profile for a user (lecturer or student).
 * Should validate that the user exists and doesn't already have a profile.
 * Links additional academic information to a user account.
 */
export async function createProfile(input: CreateProfileInput): Promise<Profile> {
  try {
    // Validate that the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Check if user already has a profile
    const existingProfile = await db.select()
      .from(profilesTable)
      .where(eq(profilesTable.user_id, input.user_id))
      .execute();

    if (existingProfile.length > 0) {
      throw new Error(`User with id ${input.user_id} already has a profile`);
    }

    // Insert new profile
    const result = await db.insert(profilesTable)
      .values({
        user_id: input.user_id,
        type: input.type,
        institution: input.institution,
        department: input.department,
        orcid: input.orcid
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Profile creation failed:', error);
    throw error;
  }
}