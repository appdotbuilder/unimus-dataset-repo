import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, datasetsTable } from '../db/schema';
import { type CreateUserInput, type CreateDatasetInput } from '../schema';
import { getDatasetById } from '../handlers/get_dataset_by_id';

// Test data
const testUser: CreateUserInput = {
  email: 'contributor@example.com',
  password: 'password123',
  role: 'contributor',
  name: 'Test Contributor',
  orcid: '0000-0000-0000-0000'
};

const testDataset: CreateDatasetInput = {
  title: 'Test Dataset',
  description: 'A dataset for testing purposes',
  domain: 'machine learning',
  task: 'classification',
  license: 'MIT',
  doi: '10.1000/test.doi',
  access_level: 'public',
  status: 'published',
  contributor_id: 1, // Will be set after user creation
  publication_year: 2023
};

describe('getDatasetById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve a dataset by ID', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password: testUser.password,
        role: testUser.role,
        name: testUser.name,
        orcid: testUser.orcid
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test dataset
    const datasetResult = await db.insert(datasetsTable)
      .values({
        ...testDataset,
        contributor_id: userId
      })
      .returning()
      .execute();

    const datasetId = datasetResult[0].id;

    // Test the handler
    const result = await getDatasetById(datasetId);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toBe(datasetId);
    expect(result!.title).toBe('Test Dataset');
    expect(result!.description).toBe(testDataset.description);
    expect(result!.domain).toBe('machine learning');
    expect(result!.task).toBe('classification');
    expect(result!.license).toBe('MIT');
    expect(result!.doi).toBe('10.1000/test.doi');
    expect(result!.access_level).toBe('public');
    expect(result!.status).toBe('published');
    expect(result!.contributor_id).toBe(userId);
    expect(result!.publication_year).toBe(2023);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent dataset', async () => {
    const result = await getDatasetById(999);
    expect(result).toBeNull();
  });

  it('should handle draft status dataset', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password: testUser.password,
        role: testUser.role,
        name: testUser.name,
        orcid: testUser.orcid
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create draft dataset
    const draftDataset = {
      ...testDataset,
      status: 'draft' as const,
      contributor_id: userId
    };

    const datasetResult = await db.insert(datasetsTable)
      .values(draftDataset)
      .returning()
      .execute();

    const datasetId = datasetResult[0].id;

    // Test the handler
    const result = await getDatasetById(datasetId);

    expect(result).not.toBeNull();
    expect(result!.status).toBe('draft');
    expect(result!.id).toBe(datasetId);
  });

  it('should handle private access level dataset', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password: testUser.password,
        role: testUser.role,
        name: testUser.name,
        orcid: testUser.orcid
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create private dataset
    const privateDataset = {
      ...testDataset,
      access_level: 'private' as const,
      contributor_id: userId
    };

    const datasetResult = await db.insert(datasetsTable)
      .values(privateDataset)
      .returning()
      .execute();

    const datasetId = datasetResult[0].id;

    // Test the handler
    const result = await getDatasetById(datasetId);

    expect(result).not.toBeNull();
    expect(result!.access_level).toBe('private');
    expect(result!.id).toBe(datasetId);
  });

  it('should handle dataset with nullable fields', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password: testUser.password,
        role: testUser.role,
        name: testUser.name,
        orcid: testUser.orcid
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create dataset with null DOI
    const datasetWithNulls = {
      ...testDataset,
      doi: null,
      contributor_id: userId
    };

    const datasetResult = await db.insert(datasetsTable)
      .values(datasetWithNulls)
      .returning()
      .execute();

    const datasetId = datasetResult[0].id;

    // Test the handler
    const result = await getDatasetById(datasetId);

    expect(result).not.toBeNull();
    expect(result!.doi).toBeNull();
    expect(result!.title).toBe('Test Dataset');
  });

  it('should handle datasets with different publication years', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password: testUser.password,
        role: testUser.role,
        name: testUser.name,
        orcid: testUser.orcid
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create datasets with different publication years
    const oldDataset = {
      ...testDataset,
      title: 'Old Dataset',
      publication_year: 2020,
      contributor_id: userId
    };

    const recentDataset = {
      ...testDataset,
      title: 'Recent Dataset',
      publication_year: 2024,
      contributor_id: userId
    };

    const oldResult = await db.insert(datasetsTable)
      .values(oldDataset)
      .returning()
      .execute();

    const recentResult = await db.insert(datasetsTable)
      .values(recentDataset)
      .returning()
      .execute();

    // Test both datasets
    const oldDatasetResult = await getDatasetById(oldResult[0].id);
    const recentDatasetResult = await getDatasetById(recentResult[0].id);

    expect(oldDatasetResult).not.toBeNull();
    expect(oldDatasetResult!.publication_year).toBe(2020);
    expect(oldDatasetResult!.title).toBe('Old Dataset');

    expect(recentDatasetResult).not.toBeNull();
    expect(recentDatasetResult!.publication_year).toBe(2024);
    expect(recentDatasetResult!.title).toBe('Recent Dataset');
  });
});