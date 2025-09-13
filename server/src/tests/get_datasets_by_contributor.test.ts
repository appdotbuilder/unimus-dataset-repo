import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, datasetsTable } from '../db/schema';
import { getDatasetsByContributor } from '../handlers/get_datasets_by_contributor';

describe('getDatasetsByContributor', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return datasets for a specific contributor', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'contributor@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Test Contributor'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test datasets for this contributor
    const datasetInputs = [
      {
        title: 'Dataset 1',
        description: 'First test dataset',
        domain: 'Computer Science',
        task: 'Classification',
        license: 'MIT',
        doi: null,
        access_level: 'public' as const,
        status: 'published' as const,
        contributor_id: userId,
        publication_year: 2023
      },
      {
        title: 'Dataset 2',
        description: 'Second test dataset',
        domain: 'Machine Learning',
        task: 'Regression',
        license: 'Apache-2.0',
        doi: '10.1234/example',
        access_level: 'private' as const,
        status: 'draft' as const,
        contributor_id: userId,
        publication_year: 2024
      }
    ];

    await db.insert(datasetsTable)
      .values(datasetInputs)
      .execute();

    // Test the handler
    const result = await getDatasetsByContributor(userId);

    // Verify results
    expect(result).toHaveLength(2);
    
    // Check first dataset
    const dataset1 = result.find(d => d.title === 'Dataset 1');
    expect(dataset1).toBeDefined();
    expect(dataset1!.description).toEqual('First test dataset');
    expect(dataset1!.domain).toEqual('Computer Science');
    expect(dataset1!.task).toEqual('Classification');
    expect(dataset1!.license).toEqual('MIT');
    expect(dataset1!.doi).toBeNull();
    expect(dataset1!.access_level).toEqual('public');
    expect(dataset1!.status).toEqual('published');
    expect(dataset1!.contributor_id).toEqual(userId);
    expect(dataset1!.publication_year).toEqual(2023);
    expect(dataset1!.created_at).toBeInstanceOf(Date);
    expect(dataset1!.updated_at).toBeInstanceOf(Date);

    // Check second dataset
    const dataset2 = result.find(d => d.title === 'Dataset 2');
    expect(dataset2).toBeDefined();
    expect(dataset2!.description).toEqual('Second test dataset');
    expect(dataset2!.domain).toEqual('Machine Learning');
    expect(dataset2!.task).toEqual('Regression');
    expect(dataset2!.license).toEqual('Apache-2.0');
    expect(dataset2!.doi).toEqual('10.1234/example');
    expect(dataset2!.access_level).toEqual('private');
    expect(dataset2!.status).toEqual('draft');
    expect(dataset2!.contributor_id).toEqual(userId);
    expect(dataset2!.publication_year).toEqual(2024);
  });

  it('should return empty array when contributor has no datasets', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'contributor@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Test Contributor'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Test the handler without creating any datasets
    const result = await getDatasetsByContributor(userId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent contributor', async () => {
    const nonExistentId = 99999;

    const result = await getDatasetsByContributor(nonExistentId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return datasets from the specified contributor', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'contributor1@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Contributor 1'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'contributor2@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Contributor 2'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create datasets for both users
    await db.insert(datasetsTable)
      .values([
        {
          title: 'User 1 Dataset',
          description: 'Dataset by user 1',
          domain: 'Computer Science',
          task: 'Classification',
          license: 'MIT',
          doi: null,
          access_level: 'public' as const,
          status: 'published' as const,
          contributor_id: user1Id,
          publication_year: 2023
        },
        {
          title: 'User 2 Dataset',
          description: 'Dataset by user 2',
          domain: 'Machine Learning',
          task: 'Regression',
          license: 'Apache-2.0',
          doi: null,
          access_level: 'private' as const,
          status: 'draft' as const,
          contributor_id: user2Id,
          publication_year: 2024
        }
      ])
      .execute();

    // Test that each user only gets their own datasets
    const user1Datasets = await getDatasetsByContributor(user1Id);
    expect(user1Datasets).toHaveLength(1);
    expect(user1Datasets[0].title).toEqual('User 1 Dataset');
    expect(user1Datasets[0].contributor_id).toEqual(user1Id);

    const user2Datasets = await getDatasetsByContributor(user2Id);
    expect(user2Datasets).toHaveLength(1);
    expect(user2Datasets[0].title).toEqual('User 2 Dataset');
    expect(user2Datasets[0].contributor_id).toEqual(user2Id);
  });

  it('should return datasets with all different statuses', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'contributor@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Test Contributor'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create datasets with different statuses
    const statusTypes = ['draft', 'review', 'approved', 'published'] as const;
    const datasetInputs = statusTypes.map((status, index) => ({
      title: `Dataset ${status}`,
      description: `Dataset with ${status} status`,
      domain: 'Computer Science',
      task: 'Classification',
      license: 'MIT',
      doi: null,
      access_level: 'public' as const,
      status: status,
      contributor_id: userId,
      publication_year: 2023 + index
    }));

    await db.insert(datasetsTable)
      .values(datasetInputs)
      .execute();

    const result = await getDatasetsByContributor(userId);

    expect(result).toHaveLength(4);

    // Check that all status types are present
    const resultStatuses = result.map(d => d.status).sort();
    expect(resultStatuses).toEqual(['approved', 'draft', 'published', 'review']);
  });
});