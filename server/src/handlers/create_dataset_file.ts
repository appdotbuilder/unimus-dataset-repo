import { db } from '../db';
import { datasetFilesTable, datasetsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateDatasetFileInput, type DatasetFile } from '../schema';

const ALLOWED_FILE_TYPES = ['csv', 'json', 'arff'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

/**
 * Creates a new dataset file record after file upload.
 * Should validate file types (CSV, JSON, ARFF) and size limits.
 * Links uploaded files to datasets and stores metadata for access.
 */
export async function createDatasetFile(input: CreateDatasetFileInput): Promise<DatasetFile> {
  try {
    // Validate file type
    const fileExtension = input.type.toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
      throw new Error(`Invalid file type: ${input.type}. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`);
    }

    // Validate file size
    if (input.size > MAX_FILE_SIZE) {
      throw new Error(`File size ${input.size} exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
    }

    if (input.size < 0) {
      throw new Error('File size cannot be negative');
    }

    // Verify that the dataset exists
    const existingDataset = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, input.dataset_id))
      .execute();

    if (existingDataset.length === 0) {
      throw new Error(`Dataset with ID ${input.dataset_id} does not exist`);
    }

    // Insert the dataset file record
    const result = await db.insert(datasetFilesTable)
      .values({
        dataset_id: input.dataset_id,
        filename: input.filename,
        path: input.path,
        size: input.size,
        type: input.type
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Dataset file creation failed:', error);
    throw error;
  }
}