import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, datasetsTable } from '../db/schema';
import { type UpdateDatasetInput } from '../schema';
import { updateDataset } from '../handlers/update_dataset';
import { eq } from 'drizzle-orm';

describe('updateDataset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testDataset: any;

  beforeEach(async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Test User'
      })
      .returning()
      .execute();

    testUser = userResult[0];

    // Create a test dataset
    const datasetResult = await db.insert(datasetsTable)
      .values({
        title: 'Original Dataset',
        description: 'Original description',
        domain: 'machine-learning',
        task: 'classification',
        license: 'MIT',
        access_level: 'public',
        status: 'draft',
        contributor_id: testUser.id,
        publication_year: 2024
      })
      .returning()
      .execute();

    testDataset = datasetResult[0];
  });

  it('should update dataset title', async () => {
    const input: UpdateDatasetInput = {
      id: testDataset.id,
      title: 'Updated Dataset Title'
    };

    const result = await updateDataset(input);

    expect(result.id).toBe(testDataset.id);
    expect(result.title).toBe('Updated Dataset Title');
    expect(result.description).toBe('Original description'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testDataset.updated_at).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateDatasetInput = {
      id: testDataset.id,
      title: 'Updated Title',
      description: 'Updated description',
      domain: 'computer-vision',
      task: 'object-detection',
      license: 'Apache-2.0'
    };

    const result = await updateDataset(input);

    expect(result.title).toBe('Updated Title');
    expect(result.description).toBe('Updated description');
    expect(result.domain).toBe('computer-vision');
    expect(result.task).toBe('object-detection');
    expect(result.license).toBe('Apache-2.0');
    // Fields not in input should remain unchanged
    expect(result.access_level).toBe('public');
    expect(result.status).toBe('draft');
    expect(result.contributor_id).toBe(testUser.id);
    expect(result.publication_year).toBe(2024);
  });

  it('should update status and access level', async () => {
    const input: UpdateDatasetInput = {
      id: testDataset.id,
      status: 'review',
      access_level: 'restricted'
    };

    const result = await updateDataset(input);

    expect(result.status).toBe('review');
    expect(result.access_level).toBe('restricted');
    expect(result.title).toBe('Original Dataset'); // Should remain unchanged
  });

  it('should update publication year', async () => {
    const input: UpdateDatasetInput = {
      id: testDataset.id,
      publication_year: 2023
    };

    const result = await updateDataset(input);

    expect(result.publication_year).toBe(2023);
  });

  it('should update DOI field', async () => {
    const input: UpdateDatasetInput = {
      id: testDataset.id,
      doi: '10.1234/example.doi'
    };

    const result = await updateDataset(input);

    expect(result.doi).toBe('10.1234/example.doi');
  });

  it('should set DOI to null', async () => {
    // First set a DOI
    await db.update(datasetsTable)
      .set({ doi: '10.1234/existing.doi' })
      .where(eq(datasetsTable.id, testDataset.id))
      .execute();

    const input: UpdateDatasetInput = {
      id: testDataset.id,
      doi: null
    };

    const result = await updateDataset(input);

    expect(result.doi).toBeNull();
  });

  it('should update contributor_id', async () => {
    // Create another user
    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'another@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Another User'
      })
      .returning()
      .execute();

    const anotherUser = anotherUserResult[0];

    const input: UpdateDatasetInput = {
      id: testDataset.id,
      contributor_id: anotherUser.id
    };

    const result = await updateDataset(input);

    expect(result.contributor_id).toBe(anotherUser.id);
  });

  it('should persist changes to database', async () => {
    const input: UpdateDatasetInput = {
      id: testDataset.id,
      title: 'Persistent Title',
      status: 'approved'
    };

    await updateDataset(input);

    // Query database directly to verify persistence
    const datasets = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, testDataset.id))
      .execute();

    expect(datasets).toHaveLength(1);
    expect(datasets[0].title).toBe('Persistent Title');
    expect(datasets[0].status).toBe('approved');
    expect(datasets[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when dataset does not exist', async () => {
    const input: UpdateDatasetInput = {
      id: 99999, // Non-existent ID
      title: 'Should not work'
    };

    await expect(updateDataset(input)).rejects.toThrow(/Dataset with id 99999 not found/i);
  });

  it('should throw error when contributor_id references non-existent user', async () => {
    const input: UpdateDatasetInput = {
      id: testDataset.id,
      contributor_id: 99999 // Non-existent user ID
    };

    await expect(updateDataset(input)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should handle partial updates correctly', async () => {
    // Only update one field
    const input: UpdateDatasetInput = {
      id: testDataset.id,
      domain: 'natural-language-processing'
    };

    const result = await updateDataset(input);

    // Updated field
    expect(result.domain).toBe('natural-language-processing');
    
    // All other fields should remain the same
    expect(result.title).toBe(testDataset.title);
    expect(result.description).toBe(testDataset.description);
    expect(result.task).toBe(testDataset.task);
    expect(result.license).toBe(testDataset.license);
    expect(result.access_level).toBe(testDataset.access_level);
    expect(result.status).toBe(testDataset.status);
    expect(result.contributor_id).toBe(testDataset.contributor_id);
    expect(result.publication_year).toBe(testDataset.publication_year);
  });

  it('should update all possible enum values correctly', async () => {
    const testCases = [
      { field: 'access_level', values: ['public', 'private', 'restricted'] },
      { field: 'status', values: ['draft', 'review', 'approved', 'published'] }
    ];

    for (const testCase of testCases) {
      for (const value of testCase.values) {
        const input: UpdateDatasetInput = {
          id: testDataset.id,
          [testCase.field]: value
        };

        const result = await updateDataset(input);
        expect(result[testCase.field as keyof typeof result]).toBe(value);
      }
    }
  });
});