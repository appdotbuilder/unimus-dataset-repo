import { db } from '../db';
import { datasetsTable } from '../db/schema';
import { type Dataset } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Retrieves a specific dataset by ID with all related information.
 * Should include contributor details, files, and curation reviews for detail pages.
 * Handles access level permissions based on user role and dataset visibility.
 */
export async function getDatasetById(id: number): Promise<Dataset | null> {
  try {
    // Query the dataset by ID
    const results = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, id))
      .execute();

    // Return null if dataset not found
    if (results.length === 0) {
      return null;
    }

    const dataset = results[0];

    // Return dataset with proper type conversion
    return {
      ...dataset,
      // All fields are already the correct types from the database
      id: dataset.id,
      title: dataset.title,
      description: dataset.description,
      domain: dataset.domain,
      task: dataset.task,
      license: dataset.license,
      doi: dataset.doi,
      access_level: dataset.access_level,
      status: dataset.status,
      contributor_id: dataset.contributor_id,
      publication_year: dataset.publication_year,
      created_at: dataset.created_at,
      updated_at: dataset.updated_at
    };
  } catch (error) {
    console.error('Dataset retrieval failed:', error);
    throw error;
  }
}