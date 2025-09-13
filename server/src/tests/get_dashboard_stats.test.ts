import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, datasetsTable, curationReviewsTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';
import { sql } from 'drizzle-orm';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero counts for empty database', async () => {
    const stats = await getDashboardStats();

    expect(stats.totalDatasets).toEqual(0);
    expect(stats.publishedDatasets).toEqual(0);
    expect(stats.datasetsInReview).toEqual(0);
    expect(stats.totalContributors).toEqual(0);
    expect(stats.totalCurators).toEqual(0);
    expect(stats.recentSubmissions).toEqual(0);
    expect(stats.pendingReviews).toEqual(0);
  });

  it('should count datasets by status correctly', async () => {
    // Create test users first
    const contributorResult = await db.insert(usersTable).values({
      email: 'contributor@test.com',
      password: 'password123',
      role: 'contributor',
      name: 'Test Contributor',
      orcid: null
    }).returning().execute();

    const contributorId = contributorResult[0].id;

    // Create datasets with different statuses
    await db.insert(datasetsTable).values([
      {
        title: 'Draft Dataset',
        description: 'A draft dataset',
        domain: 'ML',
        task: 'classification',
        license: 'MIT',
        doi: null,
        access_level: 'public',
        status: 'draft',
        contributor_id: contributorId,
        publication_year: 2024
      },
      {
        title: 'Published Dataset 1',
        description: 'First published dataset',
        domain: 'NLP',
        task: 'sentiment',
        license: 'Apache-2.0',
        doi: null,
        access_level: 'public',
        status: 'published',
        contributor_id: contributorId,
        publication_year: 2024
      },
      {
        title: 'Published Dataset 2',
        description: 'Second published dataset',
        domain: 'CV',
        task: 'detection',
        license: 'BSD-3',
        doi: null,
        access_level: 'public',
        status: 'published',
        contributor_id: contributorId,
        publication_year: 2023
      },
      {
        title: 'Review Dataset',
        description: 'Dataset in review',
        domain: 'ML',
        task: 'regression',
        license: 'GPL-3.0',
        doi: null,
        access_level: 'private',
        status: 'review',
        contributor_id: contributorId,
        publication_year: 2024
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.totalDatasets).toEqual(4);
    expect(stats.publishedDatasets).toEqual(2);
    expect(stats.datasetsInReview).toEqual(1);
  });

  it('should count users by role correctly', async () => {
    // Create users with different roles
    await db.insert(usersTable).values([
      {
        email: 'contributor1@test.com',
        password: 'password123',
        role: 'contributor',
        name: 'Contributor 1',
        orcid: null
      },
      {
        email: 'contributor2@test.com',
        password: 'password123',
        role: 'contributor',
        name: 'Contributor 2',
        orcid: null
      },
      {
        email: 'curator1@test.com',
        password: 'password123',
        role: 'curator',
        name: 'Curator 1',
        orcid: null
      },
      {
        email: 'curator2@test.com',
        password: 'password123',
        role: 'curator',
        name: 'Curator 2',
        orcid: null
      },
      {
        email: 'curator3@test.com',
        password: 'password123',
        role: 'curator',
        name: 'Curator 3',
        orcid: null
      },
      {
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
        name: 'Admin User',
        orcid: null
      },
      {
        email: 'viewer@test.com',
        password: 'password123',
        role: 'viewer',
        name: 'Viewer User',
        orcid: null
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.totalContributors).toEqual(2);
    expect(stats.totalCurators).toEqual(3);
  });

  it('should count recent submissions (last 30 days)', async () => {
    // Create a contributor user
    const contributorResult = await db.insert(usersTable).values({
      email: 'contributor@test.com',
      password: 'password123',
      role: 'contributor',
      name: 'Test Contributor',
      orcid: null
    }).returning().execute();

    const contributorId = contributorResult[0].id;

    // Calculate dates
    const now = new Date();
    const twentyDaysAgo = new Date(now);
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    const fortyDaysAgo = new Date(now);
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

    // Create datasets: 2 recent, 1 old
    await db.insert(datasetsTable).values([
      {
        title: 'Recent Dataset 1',
        description: 'Recent dataset',
        domain: 'ML',
        task: 'classification',
        license: 'MIT',
        doi: null,
        access_level: 'public',
        status: 'draft',
        contributor_id: contributorId,
        publication_year: 2024
      },
      {
        title: 'Recent Dataset 2',
        description: 'Another recent dataset',
        domain: 'NLP',
        task: 'sentiment',
        license: 'Apache-2.0',
        doi: null,
        access_level: 'public',
        status: 'published',
        contributor_id: contributorId,
        publication_year: 2024
      }
    ]).execute();

    // Update one dataset to have an older creation date
    const oldDatasetResult = await db.insert(datasetsTable).values({
      title: 'Old Dataset',
      description: 'Old dataset',
      domain: 'CV',
      task: 'detection',
      license: 'BSD-3',
      doi: null,
      access_level: 'public',
      status: 'published',
      contributor_id: contributorId,
      publication_year: 2023
    }).returning().execute();

    // Manually update the created_at timestamp to be older than 30 days
    await db.execute(sql`UPDATE datasets SET created_at = ${fortyDaysAgo} WHERE id = ${oldDatasetResult[0].id}`);

    const stats = await getDashboardStats();

    expect(stats.totalDatasets).toEqual(3);
    expect(stats.recentSubmissions).toEqual(2); // Only 2 within last 30 days
  });

  it('should count pending reviews correctly', async () => {
    // Create test users
    const contributorResult = await db.insert(usersTable).values({
      email: 'contributor@test.com',
      password: 'password123',
      role: 'contributor',
      name: 'Test Contributor',
      orcid: null
    }).returning().execute();

    const reviewerResult = await db.insert(usersTable).values({
      email: 'reviewer@test.com',
      password: 'password123',
      role: 'curator',
      name: 'Test Reviewer',
      orcid: null
    }).returning().execute();

    const contributorId = contributorResult[0].id;
    const reviewerId = reviewerResult[0].id;

    // Create test datasets
    const datasetResults = await db.insert(datasetsTable).values([
      {
        title: 'Dataset 1',
        description: 'First dataset',
        domain: 'ML',
        task: 'classification',
        license: 'MIT',
        doi: null,
        access_level: 'public',
        status: 'review',
        contributor_id: contributorId,
        publication_year: 2024
      },
      {
        title: 'Dataset 2',
        description: 'Second dataset',
        domain: 'NLP',
        task: 'sentiment',
        license: 'Apache-2.0',
        doi: null,
        access_level: 'public',
        status: 'review',
        contributor_id: contributorId,
        publication_year: 2024
      }
    ]).returning().execute();

    // Create reviews with different statuses
    await db.insert(curationReviewsTable).values([
      {
        dataset_id: datasetResults[0].id,
        reviewer_id: reviewerId,
        status: 'pending',
        notes: 'Pending review',
        reviewed_at: new Date()
      },
      {
        dataset_id: datasetResults[1].id,
        reviewer_id: reviewerId,
        status: 'pending',
        notes: 'Another pending review',
        reviewed_at: new Date()
      },
      {
        dataset_id: datasetResults[0].id,
        reviewer_id: reviewerId,
        status: 'approved',
        notes: 'Approved review',
        reviewed_at: new Date()
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.pendingReviews).toEqual(2);
  });

  it('should handle comprehensive scenario with all statistics', async () => {
    // Create users
    const userResults = await db.insert(usersTable).values([
      {
        email: 'contributor1@test.com',
        password: 'password123',
        role: 'contributor',
        name: 'Contributor 1',
        orcid: null
      },
      {
        email: 'contributor2@test.com',
        password: 'password123',
        role: 'contributor',
        name: 'Contributor 2',
        orcid: null
      },
      {
        email: 'curator1@test.com',
        password: 'password123',
        role: 'curator',
        name: 'Curator 1',
        orcid: null
      },
      {
        email: 'curator2@test.com',
        password: 'password123',
        role: 'curator',
        name: 'Curator 2',
        orcid: null
      },
      {
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
        name: 'Admin User',
        orcid: null
      }
    ]).returning().execute();

    const contributor1Id = userResults[0].id;
    const contributor2Id = userResults[1].id;
    const curator1Id = userResults[2].id;

    // Create datasets
    const datasetResults = await db.insert(datasetsTable).values([
      {
        title: 'Draft Dataset',
        description: 'Draft dataset',
        domain: 'ML',
        task: 'classification',
        license: 'MIT',
        doi: null,
        access_level: 'public',
        status: 'draft',
        contributor_id: contributor1Id,
        publication_year: 2024
      },
      {
        title: 'Published Dataset 1',
        description: 'First published dataset',
        domain: 'NLP',
        task: 'sentiment',
        license: 'Apache-2.0',
        doi: null,
        access_level: 'public',
        status: 'published',
        contributor_id: contributor1Id,
        publication_year: 2024
      },
      {
        title: 'Published Dataset 2',
        description: 'Second published dataset',
        domain: 'CV',
        task: 'detection',
        license: 'BSD-3',
        doi: null,
        access_level: 'private',
        status: 'published',
        contributor_id: contributor2Id,
        publication_year: 2023
      },
      {
        title: 'Review Dataset',
        description: 'Dataset in review',
        domain: 'ML',
        task: 'regression',
        license: 'GPL-3.0',
        doi: null,
        access_level: 'restricted',
        status: 'review',
        contributor_id: contributor2Id,
        publication_year: 2024
      },
      {
        title: 'Approved Dataset',
        description: 'Approved dataset',
        domain: 'Statistics',
        task: 'analysis',
        license: 'MIT',
        doi: null,
        access_level: 'public',
        status: 'approved',
        contributor_id: contributor1Id,
        publication_year: 2024
      }
    ]).returning().execute();

    // Create reviews
    await db.insert(curationReviewsTable).values([
      {
        dataset_id: datasetResults[3].id,
        reviewer_id: curator1Id,
        status: 'pending',
        notes: 'Under review',
        reviewed_at: new Date()
      },
      {
        dataset_id: datasetResults[1].id,
        reviewer_id: curator1Id,
        status: 'approved',
        notes: 'Looks good',
        reviewed_at: new Date()
      },
      {
        dataset_id: datasetResults[4].id,
        reviewer_id: curator1Id,
        status: 'pending',
        notes: 'Pending final review',
        reviewed_at: new Date()
      }
    ]).execute();

    const stats = await getDashboardStats();

    // Verify all statistics
    expect(stats.totalDatasets).toEqual(5);
    expect(stats.publishedDatasets).toEqual(2);
    expect(stats.datasetsInReview).toEqual(1);
    expect(stats.totalContributors).toEqual(2);
    expect(stats.totalCurators).toEqual(2);
    expect(stats.recentSubmissions).toEqual(5); // All created within last 30 days
    expect(stats.pendingReviews).toEqual(2);
  });
});