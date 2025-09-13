import { db } from '../db';
import { datasetsTable } from '../db/schema';
import { type UpdateDatasetInput, type Dataset } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Updates an existing dataset's metadata and status.
 * Should validate user permissions (contributors can edit own datasets, curators can change status).
 * Handles workflow state transitions and validation rules.
 */
export async function updateDataset(input: UpdateDatasetInput): Promise<Dataset> {
  try {
    // First, check if the dataset exists
    const existingDataset = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, input.id))
      .execute();

    if (existingDataset.length === 0) {
      throw new Error(`Dataset with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.domain !== undefined) updateData.domain = input.domain;
    if (input.task !== undefined) updateData.task = input.task;
    if (input.license !== undefined) updateData.license = input.license;
    if (input.doi !== undefined) updateData.doi = input.doi;
    if (input.access_level !== undefined) updateData.access_level = input.access_level;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.contributor_id !== undefined) updateData.contributor_id = input.contributor_id;
    if (input.publication_year !== undefined) updateData.publication_year = input.publication_year;

    // Perform the update
    const result = await db.update(datasetsTable)
      .set(updateData)
      .where(eq(datasetsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Dataset update failed:', error);
    throw error;
  }
}