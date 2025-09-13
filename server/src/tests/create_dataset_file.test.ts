import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { datasetFilesTable, datasetsTable, usersTable } from '../db/schema';
import { type CreateDatasetFileInput } from '../schema';
import { createDatasetFile } from '../handlers/create_dataset_file';
import { eq } from 'drizzle-orm';

describe('createDatasetFile', () => {
  let testUserId: number;
  let testDatasetId: number;

  beforeEach(async () => {
    await createDB();

    // Create a test user first (required for dataset)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Test User',
        orcid: null
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create a test dataset
    const datasetResult = await db.insert(datasetsTable)
      .values({
        title: 'Test Dataset',
        description: 'A test dataset',
        domain: 'machine-learning',
        task: 'classification',
        license: 'MIT',
        doi: null,
        access_level: 'public',
        status: 'draft',
        contributor_id: testUserId,
        publication_year: 2024
      })
      .returning()
      .execute();
    testDatasetId = datasetResult[0].id;
  });

  afterEach(resetDB);

  const validInput: CreateDatasetFileInput = {
    dataset_id: 1, // Will be overridden in tests
    filename: 'test_data.csv',
    path: '/uploads/test_data.csv',
    size: 1024,
    type: 'csv'
  };

  it('should create a dataset file with valid input', async () => {
    const input = { ...validInput, dataset_id: testDatasetId };
    const result = await createDatasetFile(input);

    expect(result.dataset_id).toEqual(testDatasetId);
    expect(result.filename).toEqual('test_data.csv');
    expect(result.path).toEqual('/uploads/test_data.csv');
    expect(result.size).toEqual(1024);
    expect(result.type).toEqual('csv');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save dataset file to database', async () => {
    const input = { ...validInput, dataset_id: testDatasetId };
    const result = await createDatasetFile(input);

    const files = await db.select()
      .from(datasetFilesTable)
      .where(eq(datasetFilesTable.id, result.id))
      .execute();

    expect(files).toHaveLength(1);
    expect(files[0].filename).toEqual('test_data.csv');
    expect(files[0].dataset_id).toEqual(testDatasetId);
    expect(files[0].path).toEqual('/uploads/test_data.csv');
    expect(files[0].size).toEqual(1024);
    expect(files[0].type).toEqual('csv');
  });

  it('should accept CSV file type', async () => {
    const input = { ...validInput, dataset_id: testDatasetId, type: 'csv' };
    const result = await createDatasetFile(input);
    expect(result.type).toEqual('csv');
  });

  it('should accept JSON file type', async () => {
    const input = { ...validInput, dataset_id: testDatasetId, type: 'json', filename: 'data.json' };
    const result = await createDatasetFile(input);
    expect(result.type).toEqual('json');
  });

  it('should accept ARFF file type', async () => {
    const input = { ...validInput, dataset_id: testDatasetId, type: 'arff', filename: 'data.arff' };
    const result = await createDatasetFile(input);
    expect(result.type).toEqual('arff');
  });

  it('should reject invalid file type', async () => {
    const input = { ...validInput, dataset_id: testDatasetId, type: 'txt' };
    
    await expect(createDatasetFile(input)).rejects.toThrow(/invalid file type.*txt/i);
  });

  it('should reject file type with different case if not in allowed list', async () => {
    const input = { ...validInput, dataset_id: testDatasetId, type: 'PDF' };
    
    await expect(createDatasetFile(input)).rejects.toThrow(/invalid file type.*pdf/i);
  });

  it('should handle mixed case file types for allowed types', async () => {
    const input = { ...validInput, dataset_id: testDatasetId, type: 'CSV' };
    const result = await createDatasetFile(input);
    expect(result.type).toEqual('CSV');
  });

  it('should reject file size exceeding 100MB limit', async () => {
    const input = { ...validInput, dataset_id: testDatasetId, size: 101 * 1024 * 1024 }; // 101MB
    
    await expect(createDatasetFile(input)).rejects.toThrow(/file size.*exceeds maximum/i);
  });

  it('should accept file size at 100MB limit', async () => {
    const input = { ...validInput, dataset_id: testDatasetId, size: 100 * 1024 * 1024 }; // Exactly 100MB
    const result = await createDatasetFile(input);
    expect(result.size).toEqual(100 * 1024 * 1024);
  });

  it('should reject negative file size', async () => {
    const input = { ...validInput, dataset_id: testDatasetId, size: -1 };
    
    await expect(createDatasetFile(input)).rejects.toThrow(/file size cannot be negative/i);
  });

  it('should accept zero file size', async () => {
    const input = { ...validInput, dataset_id: testDatasetId, size: 0 };
    const result = await createDatasetFile(input);
    expect(result.size).toEqual(0);
  });

  it('should reject non-existent dataset_id', async () => {
    const input = { ...validInput, dataset_id: 99999 };
    
    await expect(createDatasetFile(input)).rejects.toThrow(/dataset with id 99999 does not exist/i);
  });

  it('should handle different filename extensions', async () => {
    const inputs = [
      { ...validInput, dataset_id: testDatasetId, filename: 'data.csv', type: 'csv' },
      { ...validInput, dataset_id: testDatasetId, filename: 'results.json', type: 'json' },
      { ...validInput, dataset_id: testDatasetId, filename: 'dataset.arff', type: 'arff' }
    ];

    for (const input of inputs) {
      const result = await createDatasetFile(input);
      expect(result.filename).toEqual(input.filename);
      expect(result.type).toEqual(input.type);
    }
  });

  it('should handle long file paths', async () => {
    const longPath = '/uploads/very/long/nested/directory/structure/test_data.csv';
    const input = { ...validInput, dataset_id: testDatasetId, path: longPath };
    
    const result = await createDatasetFile(input);
    expect(result.path).toEqual(longPath);
  });
});