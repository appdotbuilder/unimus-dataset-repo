import { db } from '../db';
import { datasetFilesTable, datasetsTable } from '../db/schema';
import { type DatasetFile } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Retrieves all files associated with a specific dataset.
 * Should validate user permissions to access the dataset files.
 * Returns file metadata for dataset detail pages and file management.
 */
export async function getDatasetFiles(datasetId: number): Promise<DatasetFile[]> {
  try {
    // First verify the dataset exists
    const dataset = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, datasetId))
      .execute();

    if (dataset.length === 0) {
      throw new Error(`Dataset with id ${datasetId} not found`);
    }

    // Fetch all files for the dataset
    const files = await db.select()
      .from(datasetFilesTable)
      .where(eq(datasetFilesTable.dataset_id, datasetId))
      .execute();

    return files;
  } catch (error) {
    console.error('Failed to get dataset files:', error);
    throw error;
  }
}