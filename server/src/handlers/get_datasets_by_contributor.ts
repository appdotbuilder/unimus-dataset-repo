import { db } from '../db';
import { datasetsTable } from '../db/schema';
import { type Dataset } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Retrieves all datasets contributed by a specific user.
 * Used for user profile pages and contributor management.
 * Should include dataset status and file counts for overview display.
 */
export async function getDatasetsByContributor(contributorId: number): Promise<Dataset[]> {
  try {
    const results = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.contributor_id, contributorId))
      .execute();

    // No numeric fields to convert in datasets table - all are integers or text
    return results;
  } catch (error) {
    console.error('Failed to get datasets by contributor:', error);
    throw error;
  }
}