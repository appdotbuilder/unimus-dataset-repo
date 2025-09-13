import { db } from '../db';
import { datasetsTable, usersTable } from '../db/schema';
import { type CreateDatasetInput, type Dataset } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Creates a new dataset with metadata provided by contributors.
 * Should validate that the contributor exists and has appropriate permissions.
 * Sets initial status to 'draft' and handles publication year validation.
 */
export async function createDataset(input: CreateDatasetInput): Promise<Dataset> {
  try {
    // Validate that the contributor exists
    const contributor = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.contributor_id))
      .execute();

    if (contributor.length === 0) {
      throw new Error('Contributor not found');
    }

    // Check if the contributor has appropriate permissions (contributor, curator, or admin)
    const validRoles = ['contributor', 'curator', 'admin'];
    if (!validRoles.includes(contributor[0].role)) {
      throw new Error('User does not have permission to create datasets');
    }

    // Insert dataset record
    const result = await db.insert(datasetsTable)
      .values({
        title: input.title,
        description: input.description,
        domain: input.domain,
        task: input.task,
        license: input.license,
        doi: input.doi,
        access_level: input.access_level,
        status: input.status, // Zod default 'draft' is already applied
        contributor_id: input.contributor_id,
        publication_year: input.publication_year
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Dataset creation failed:', error);
    throw error;
  }
}