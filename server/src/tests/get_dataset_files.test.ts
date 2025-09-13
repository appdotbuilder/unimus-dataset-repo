import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, datasetsTable, datasetFilesTable } from '../db/schema';
import { type CreateUserInput, type CreateDatasetInput, type CreateDatasetFileInput } from '../schema';
import { getDatasetFiles } from '../handlers/get_dataset_files';

// Test data
const testUser: CreateUserInput = {
  email: 'contributor@example.com',
  password: 'password123',
  role: 'contributor',
  name: 'Test Contributor',
  orcid: null
};

const testDataset: CreateDatasetInput = {
  title: 'Test Dataset',
  description: 'A dataset for testing file retrieval',
  domain: 'computer_science',
  task: 'classification',
  license: 'MIT',
  doi: null,
  access_level: 'public',
  status: 'published',
  contributor_id: 1, // Will be set after user creation
  publication_year: 2024
};

const testFiles: CreateDatasetFileInput[] = [
  {
    dataset_id: 1, // Will be set after dataset creation
    filename: 'data.csv',
    path: '/datasets/1/data.csv',
    size: 1024,
    type: 'text/csv'
  },
  {
    dataset_id: 1, // Will be set after dataset creation
    filename: 'readme.txt',
    path: '/datasets/1/readme.txt',
    size: 512,
    type: 'text/plain'
  },
  {
    dataset_id: 1, // Will be set after dataset creation
    filename: 'model.json',
    path: '/datasets/1/model.json',
    size: 2048,
    type: 'application/json'
  }
];

describe('getDatasetFiles', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve all files for a dataset', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create dataset
    const datasetResult = await db.insert(datasetsTable)
      .values({
        ...testDataset,
        contributor_id: userId
      })
      .returning()
      .execute();

    const datasetId = datasetResult[0].id;

    // Create files for the dataset
    const filesWithDatasetId = testFiles.map(file => ({
      ...file,
      dataset_id: datasetId
    }));

    await db.insert(datasetFilesTable)
      .values(filesWithDatasetId)
      .execute();

    // Get dataset files
    const result = await getDatasetFiles(datasetId);

    expect(result).toHaveLength(3);
    
    // Verify each file
    const fileNames = result.map(f => f.filename).sort();
    expect(fileNames).toEqual(['data.csv', 'model.json', 'readme.txt']);

    // Verify first file details
    const csvFile = result.find(f => f.filename === 'data.csv');
    expect(csvFile).toBeDefined();
    expect(csvFile!.path).toEqual('/datasets/1/data.csv');
    expect(csvFile!.size).toEqual(1024);
    expect(csvFile!.type).toEqual('text/csv');
    expect(csvFile!.dataset_id).toEqual(datasetId);
    expect(csvFile!.id).toBeDefined();
    expect(csvFile!.created_at).toBeInstanceOf(Date);
  });

  it('should return empty array for dataset with no files', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create dataset without files
    const datasetResult = await db.insert(datasetsTable)
      .values({
        ...testDataset,
        contributor_id: userId
      })
      .returning()
      .execute();

    const datasetId = datasetResult[0].id;

    // Get dataset files
    const result = await getDatasetFiles(datasetId);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should throw error for non-existent dataset', async () => {
    const nonExistentDatasetId = 999;

    await expect(getDatasetFiles(nonExistentDatasetId))
      .rejects
      .toThrow(/Dataset with id 999 not found/i);
  });

  it('should only return files for the specified dataset', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create two datasets
    const dataset1Result = await db.insert(datasetsTable)
      .values({
        ...testDataset,
        title: 'Dataset 1',
        contributor_id: userId
      })
      .returning()
      .execute();

    const dataset2Result = await db.insert(datasetsTable)
      .values({
        ...testDataset,
        title: 'Dataset 2',
        contributor_id: userId
      })
      .returning()
      .execute();

    const dataset1Id = dataset1Result[0].id;
    const dataset2Id = dataset2Result[0].id;

    // Create files for dataset 1
    await db.insert(datasetFilesTable)
      .values([
        {
          dataset_id: dataset1Id,
          filename: 'file1.csv',
          path: '/datasets/1/file1.csv',
          size: 100,
          type: 'text/csv'
        },
        {
          dataset_id: dataset1Id,
          filename: 'file2.txt',
          path: '/datasets/1/file2.txt',
          size: 200,
          type: 'text/plain'
        }
      ])
      .execute();

    // Create files for dataset 2
    await db.insert(datasetFilesTable)
      .values([
        {
          dataset_id: dataset2Id,
          filename: 'other_file.json',
          path: '/datasets/2/other_file.json',
          size: 300,
          type: 'application/json'
        }
      ])
      .execute();

    // Get files for dataset 1 only
    const result = await getDatasetFiles(dataset1Id);

    expect(result).toHaveLength(2);
    
    const fileNames = result.map(f => f.filename).sort();
    expect(fileNames).toEqual(['file1.csv', 'file2.txt']);

    // Verify all files belong to dataset 1
    result.forEach(file => {
      expect(file.dataset_id).toEqual(dataset1Id);
    });
  });

  it('should preserve file metadata correctly', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create dataset
    const datasetResult = await db.insert(datasetsTable)
      .values({
        ...testDataset,
        contributor_id: userId
      })
      .returning()
      .execute();

    const datasetId = datasetResult[0].id;

    // Create file with specific metadata
    const specificFile = {
      dataset_id: datasetId,
      filename: 'large_dataset.csv',
      path: '/datasets/special/large_dataset.csv',
      size: 1048576, // 1MB
      type: 'text/csv'
    };

    await db.insert(datasetFilesTable)
      .values([specificFile])
      .execute();

    // Get dataset files
    const result = await getDatasetFiles(datasetId);

    expect(result).toHaveLength(1);
    
    const file = result[0];
    expect(file.filename).toEqual('large_dataset.csv');
    expect(file.path).toEqual('/datasets/special/large_dataset.csv');
    expect(file.size).toEqual(1048576);
    expect(file.type).toEqual('text/csv');
    expect(file.dataset_id).toEqual(datasetId);
    expect(file.created_at).toBeInstanceOf(Date);
    expect(typeof file.id).toEqual('number');
  });
});