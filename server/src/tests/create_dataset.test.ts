import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { datasetsTable, usersTable } from '../db/schema';
import { type CreateDatasetInput } from '../schema';
import { createDataset } from '../handlers/create_dataset';
import { eq } from 'drizzle-orm';

describe('createDataset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test user with contributor role
  const createTestUser = async (role = 'contributor') => {
    const result = await db.insert(usersTable)
      .values({
        email: 'contributor@example.com',
        password: 'password123',
        role: role as any,
        name: 'Test Contributor',
        orcid: null
      })
      .returning()
      .execute();
    return result[0];
  };

  // Test input with all required fields
  const createTestInput = (contributorId: number): CreateDatasetInput => ({
    title: 'Test Dataset',
    description: 'A comprehensive test dataset for machine learning',
    domain: 'Computer Science',
    task: 'Classification',
    license: 'MIT',
    doi: '10.1234/test.dataset',
    access_level: 'public',
    status: 'draft', // Include even though it has a Zod default
    contributor_id: contributorId,
    publication_year: 2024
  });

  it('should create a dataset with valid input', async () => {
    const contributor = await createTestUser('contributor');
    const testInput = createTestInput(contributor.id);

    const result = await createDataset(testInput);

    // Verify all fields are set correctly
    expect(result.title).toEqual('Test Dataset');
    expect(result.description).toEqual(testInput.description);
    expect(result.domain).toEqual('Computer Science');
    expect(result.task).toEqual('Classification');
    expect(result.license).toEqual('MIT');
    expect(result.doi).toEqual('10.1234/test.dataset');
    expect(result.access_level).toEqual('public');
    expect(result.status).toEqual('draft');
    expect(result.contributor_id).toEqual(contributor.id);
    expect(result.publication_year).toEqual(2024);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save dataset to database', async () => {
    const contributor = await createTestUser('contributor');
    const testInput = createTestInput(contributor.id);

    const result = await createDataset(testInput);

    // Verify dataset was saved to database
    const datasets = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, result.id))
      .execute();

    expect(datasets).toHaveLength(1);
    expect(datasets[0].title).toEqual('Test Dataset');
    expect(datasets[0].contributor_id).toEqual(contributor.id);
    expect(datasets[0].status).toEqual('draft');
    expect(datasets[0].created_at).toBeInstanceOf(Date);
  });

  it('should allow curator to create dataset', async () => {
    const curator = await createTestUser('curator');
    const testInput = createTestInput(curator.id);

    const result = await createDataset(testInput);

    expect(result.contributor_id).toEqual(curator.id);
    expect(result.title).toEqual('Test Dataset');
  });

  it('should allow admin to create dataset', async () => {
    const admin = await createTestUser('admin');
    const testInput = createTestInput(admin.id);

    const result = await createDataset(testInput);

    expect(result.contributor_id).toEqual(admin.id);
    expect(result.title).toEqual('Test Dataset');
  });

  it('should handle nullable doi field', async () => {
    const contributor = await createTestUser('contributor');
    const testInput = createTestInput(contributor.id);
    testInput.doi = null;

    const result = await createDataset(testInput);

    expect(result.doi).toBeNull();
  });

  it('should create dataset with private access level', async () => {
    const contributor = await createTestUser('contributor');
    const testInput = createTestInput(contributor.id);
    testInput.access_level = 'private';

    const result = await createDataset(testInput);

    expect(result.access_level).toEqual('private');
  });

  it('should create dataset with restricted access level', async () => {
    const contributor = await createTestUser('contributor');
    const testInput = createTestInput(contributor.id);
    testInput.access_level = 'restricted';

    const result = await createDataset(testInput);

    expect(result.access_level).toEqual('restricted');
  });

  it('should handle different publication years', async () => {
    const contributor = await createTestUser('contributor');
    const testInput = createTestInput(contributor.id);
    testInput.publication_year = 2020;

    const result = await createDataset(testInput);

    expect(result.publication_year).toEqual(2020);
  });

  it('should throw error when contributor does not exist', async () => {
    const testInput = createTestInput(999); // Non-existent user ID

    await expect(createDataset(testInput)).rejects.toThrow(/contributor not found/i);
  });

  it('should throw error when user has viewer role', async () => {
    const viewer = await createTestUser('viewer');
    const testInput = createTestInput(viewer.id);

    await expect(createDataset(testInput)).rejects.toThrow(/does not have permission/i);
  });

  it('should create multiple datasets for same contributor', async () => {
    const contributor = await createTestUser('contributor');
    
    const testInput1 = createTestInput(contributor.id);
    testInput1.title = 'First Dataset';
    
    const testInput2 = createTestInput(contributor.id);
    testInput2.title = 'Second Dataset';
    testInput2.domain = 'Biology';

    const result1 = await createDataset(testInput1);
    const result2 = await createDataset(testInput2);

    expect(result1.title).toEqual('First Dataset');
    expect(result2.title).toEqual('Second Dataset');
    expect(result1.contributor_id).toEqual(contributor.id);
    expect(result2.contributor_id).toEqual(contributor.id);
    expect(result1.id).not.toEqual(result2.id);
  });
});