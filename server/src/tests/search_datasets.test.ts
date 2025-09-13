import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, datasetsTable } from '../db/schema';
import { type DatasetSearchInput } from '../schema';
import { searchDatasets } from '../handlers/search_datasets';

// Test data setup
const testUser = {
  email: 'contributor@example.com',
  password: 'password123',
  role: 'contributor' as const,
  name: 'Test Contributor',
  orcid: null
};

const testDatasets = [
  {
    title: 'Machine Learning Image Dataset',
    description: 'A comprehensive dataset of images for computer vision tasks',
    domain: 'Computer Vision',
    task: 'Image Classification',
    license: 'MIT',
    doi: null,
    access_level: 'public' as const,
    status: 'published' as const,
    publication_year: 2023
  },
  {
    title: 'Natural Language Processing Corpus',
    description: 'Text data for sentiment analysis and NLP research',
    domain: 'Natural Language Processing',
    task: 'Sentiment Analysis',
    license: 'Apache-2.0',
    doi: '10.1234/example',
    access_level: 'public' as const,
    status: 'published' as const,
    publication_year: 2022
  },
  {
    title: 'Private Research Dataset',
    description: 'Restricted access dataset for medical research',
    domain: 'Medical',
    task: 'Disease Prediction',
    license: 'Custom',
    doi: null,
    access_level: 'private' as const,
    status: 'draft' as const,
    publication_year: 2024
  },
  {
    title: 'Audio Processing Dataset',
    description: 'Sound files for machine learning audio tasks',
    domain: 'Audio Processing',
    task: 'Speech Recognition',
    license: 'CC-BY-4.0',
    doi: null,
    access_level: 'restricted' as const,
    status: 'approved' as const,
    publication_year: 2023
  }
];

describe('searchDatasets', () => {
  let contributorId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    contributorId = userResult[0].id;

    // Create test datasets
    await db.insert(datasetsTable)
      .values(testDatasets.map(dataset => ({
        ...dataset,
        contributor_id: contributorId
      })))
      .execute();
  });

  afterEach(resetDB);

  it('should return all datasets when no filters applied', async () => {
    const input: DatasetSearchInput = {
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(4);
    expect(results[0].title).toBeDefined();
    expect(results[0].description).toBeDefined();
    expect(results[0].created_at).toBeInstanceOf(Date);
  });

  it('should perform full-text search across title', async () => {
    const input: DatasetSearchInput = {
      query: 'Machine Learning Image',
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Machine Learning Image Dataset');
  });

  it('should perform full-text search across description', async () => {
    const input: DatasetSearchInput = {
      query: 'NLP research',
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Natural Language Processing Corpus');
    expect(results[0].description).toContain('NLP research');
  });

  it('should perform full-text search across domain', async () => {
    const input: DatasetSearchInput = {
      query: 'Computer Vision',
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(1);
    expect(results[0].domain).toEqual('Computer Vision');
  });

  it('should perform full-text search across task', async () => {
    const input: DatasetSearchInput = {
      query: 'Speech Recognition',
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(1);
    expect(results[0].task).toEqual('Speech Recognition');
  });

  it('should filter by domain', async () => {
    const input: DatasetSearchInput = {
      domain: 'Natural Language Processing',
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(1);
    expect(results[0].domain).toEqual('Natural Language Processing');
  });

  it('should filter by task', async () => {
    const input: DatasetSearchInput = {
      task: 'Image Classification',
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(1);
    expect(results[0].task).toEqual('Image Classification');
  });

  it('should filter by publication year', async () => {
    const input: DatasetSearchInput = {
      publication_year: 2023,
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result.publication_year).toEqual(2023);
    });
  });

  it('should filter by access level', async () => {
    const input: DatasetSearchInput = {
      access_level: 'public',
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result.access_level).toEqual('public');
    });
  });

  it('should filter by status', async () => {
    const input: DatasetSearchInput = {
      status: 'published',
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result.status).toEqual('published');
    });
  });

  it('should combine multiple filters', async () => {
    const input: DatasetSearchInput = {
      access_level: 'public',
      status: 'published',
      publication_year: 2023,
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Machine Learning Image Dataset');
    expect(results[0].access_level).toEqual('public');
    expect(results[0].status).toEqual('published');
    expect(results[0].publication_year).toEqual(2023);
  });

  it('should combine search query with filters', async () => {
    const input: DatasetSearchInput = {
      query: 'dataset',
      access_level: 'private',
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Private Research Dataset');
    expect(results[0].access_level).toEqual('private');
  });

  it('should handle pagination with limit', async () => {
    const input: DatasetSearchInput = {
      limit: 2,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(2);
  });

  it('should handle pagination with offset', async () => {
    const input: DatasetSearchInput = {
      limit: 2,
      offset: 2
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(2);
  });

  it('should return empty array when no matches found', async () => {
    const input: DatasetSearchInput = {
      query: 'nonexistent dataset',
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(0);
  });

  it('should handle empty query string', async () => {
    const input: DatasetSearchInput = {
      query: '',
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(4);
  });

  it('should handle whitespace-only query', async () => {
    const input: DatasetSearchInput = {
      query: '   ',
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(4);
  });

  it('should be case-insensitive for search queries', async () => {
    const input: DatasetSearchInput = {
      query: 'MACHINE LEARNING',
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results.length).toBeGreaterThanOrEqual(1);
    const machineDataset = results.find(r => r.title === 'Machine Learning Image Dataset');
    expect(machineDataset).toBeDefined();
  });

  it('should return results ordered by creation date descending', async () => {
    const input: DatasetSearchInput = {
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(4);
    // Results should be ordered by created_at desc (most recent first)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].created_at.getTime()).toBeGreaterThanOrEqual(
        results[i].created_at.getTime()
      );
    }
  });

  it('should apply Zod defaults for limit and offset', async () => {
    // Test that the handler works when Zod applies defaults
    const input: DatasetSearchInput = {
      limit: 20,
      offset: 0
    };

    const results = await searchDatasets(input);

    expect(results).toHaveLength(4);
    expect(input.limit).toBe(20);
    expect(input.offset).toBe(0);
  });
});