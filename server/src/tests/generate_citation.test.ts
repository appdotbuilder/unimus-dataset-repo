import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, datasetsTable } from '../db/schema';
import { type Dataset } from '../schema';
import { generateCitation } from '../handlers/generate_citation';

describe('generateCitation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate citations with contributor name and DOI', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'john.doe@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'John Doe',
        orcid: '0000-0000-0000-0000'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a dataset
    const datasetResult = await db.insert(datasetsTable)
      .values({
        title: 'Machine Learning Dataset',
        description: 'A comprehensive dataset for ML research',
        domain: 'Computer Science',
        task: 'Classification',
        license: 'MIT',
        doi: '10.1234/example.doi',
        access_level: 'public',
        status: 'published',
        contributor_id: user.id,
        publication_year: 2023
      })
      .returning()
      .execute();

    const dataset = datasetResult[0] as Dataset;

    const citation = await generateCitation(dataset);

    // Check APA format
    expect(citation.apa).toBe(
      'John Doe. (2023). Machine Learning Dataset [Dataset]. https://doi.org/10.1234/example.doi.'
    );

    // Check IEEE format
    expect(citation.ieee).toBe(
      'John Doe, "Machine Learning Dataset," Dataset, 2023. [Online]. Available: https://doi.org/10.1234/example.doi'
    );
  });

  it('should generate citations without DOI', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'jane.smith@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Jane Smith',
        orcid: null
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a dataset without DOI
    const datasetResult = await db.insert(datasetsTable)
      .values({
        title: 'Research Data Collection',
        description: 'Data collected for research purposes',
        domain: 'Biology',
        task: 'Analysis',
        license: 'CC BY 4.0',
        doi: null,
        access_level: 'public',
        status: 'published',
        contributor_id: user.id,
        publication_year: 2022
      })
      .returning()
      .execute();

    const dataset = datasetResult[0] as Dataset;

    const citation = await generateCitation(dataset);

    // Check APA format without DOI
    expect(citation.apa).toBe(
      'Jane Smith. (2022). Research Data Collection [Dataset]. Unimus Repository.'
    );

    // Check IEEE format without DOI
    expect(citation.ieee).toBe(
      'Jane Smith, "Research Data Collection," Dataset, 2022. [Database]'
    );
  });

  it('should use email when contributor name is null', async () => {
    // Create a user without name
    const userResult = await db.insert(usersTable)
      .values({
        email: 'contributor@example.com',
        password: 'password123',
        role: 'contributor',
        name: null,
        orcid: null
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a dataset
    const datasetResult = await db.insert(datasetsTable)
      .values({
        title: 'Anonymous Dataset',
        description: 'Dataset from anonymous contributor',
        domain: 'Mathematics',
        task: 'Computation',
        license: 'GPL v3',
        doi: '10.5678/anon.dataset',
        access_level: 'public',
        status: 'published',
        contributor_id: user.id,
        publication_year: 2024
      })
      .returning()
      .execute();

    const dataset = datasetResult[0] as Dataset;

    const citation = await generateCitation(dataset);

    // Should use email as author when name is null
    expect(citation.apa).toContain('contributor@example.com');
    expect(citation.ieee).toContain('contributor@example.com');
  });

  it('should handle special characters in dataset title', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'researcher@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Dr. María González',
        orcid: null
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a dataset with special characters
    const datasetResult = await db.insert(datasetsTable)
      .values({
        title: 'COVID-19 Data: Analysis & Trends (2020-2023)',
        description: 'Comprehensive COVID-19 analysis',
        domain: 'Public Health',
        task: 'Epidemiological Analysis',
        license: 'Apache 2.0',
        doi: null,
        access_level: 'public',
        status: 'published',
        contributor_id: user.id,
        publication_year: 2023
      })
      .returning()
      .execute();

    const dataset = datasetResult[0] as Dataset;

    const citation = await generateCitation(dataset);

    // Should properly handle special characters
    expect(citation.apa).toBe(
      'Dr. María González. (2023). COVID-19 Data: Analysis & Trends (2020-2023) [Dataset]. Unimus Repository.'
    );
    expect(citation.ieee).toBe(
      'Dr. María González, "COVID-19 Data: Analysis & Trends (2020-2023)," Dataset, 2023. [Database]'
    );
  });

  it('should handle different publication years correctly', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'historian@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Historical Data Curator',
        orcid: null
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a dataset with historical publication year
    const datasetResult = await db.insert(datasetsTable)
      .values({
        title: 'Historical Census Data',
        description: 'Census data from the past century',
        domain: 'History',
        task: 'Historical Analysis',
        license: 'Public Domain',
        doi: '10.9999/historical.census',
        access_level: 'public',
        status: 'published',
        contributor_id: user.id,
        publication_year: 1950
      })
      .returning()
      .execute();

    const dataset = datasetResult[0] as Dataset;

    const citation = await generateCitation(dataset);

    // Should correctly format older publication years
    expect(citation.apa).toContain('(1950)');
    expect(citation.ieee).toContain('Dataset, 1950.');
  });

  it('should handle long dataset titles appropriately', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'verbose@example.com',
        password: 'password123',
        role: 'contributor',
        name: 'Verbose Researcher',
        orcid: null
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a dataset with a very long title
    const longTitle = 'A Comprehensive Multi-Modal Dataset for Advanced Machine Learning Research Including Computer Vision, Natural Language Processing, and Time Series Analysis with Extensive Metadata and Quality Annotations';
    
    const datasetResult = await db.insert(datasetsTable)
      .values({
        title: longTitle,
        description: 'Very comprehensive dataset',
        domain: 'Computer Science',
        task: 'Multi-modal Learning',
        license: 'Creative Commons',
        doi: '10.1111/long.title.dataset',
        access_level: 'public',
        status: 'published',
        contributor_id: user.id,
        publication_year: 2024
      })
      .returning()
      .execute();

    const dataset = datasetResult[0] as Dataset;

    const citation = await generateCitation(dataset);

    // Should handle long titles properly
    expect(citation.apa).toContain(longTitle);
    expect(citation.ieee).toContain(`"${longTitle},"`);
    expect(citation.apa).toContain('[Dataset]');
    expect(citation.ieee).toContain('Dataset, 2024');
  });
});