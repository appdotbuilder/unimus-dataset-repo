import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, datasetsTable, curationReviewsTable } from '../db/schema';
import { getCurationReviews, type GetCurationReviewsFilters } from '../handlers/get_curation_reviews';

// Test data
const testUser = {
  email: 'reviewer@example.com',
  password: 'password123',
  role: 'curator' as const,
  name: 'John Reviewer',
  orcid: null
};

const testContributor = {
  email: 'contributor@example.com',
  password: 'password123',
  role: 'contributor' as const,
  name: 'Jane Contributor',
  orcid: null
};

const testDataset = {
  title: 'Test Dataset',
  description: 'A dataset for testing',
  domain: 'computer_science',
  task: 'classification',
  license: 'MIT',
  doi: null,
  access_level: 'public' as const,
  status: 'review' as const,
  contributor_id: 0, // Will be set after user creation
  publication_year: 2024
};

const testReview = {
  dataset_id: 0, // Will be set after dataset creation
  reviewer_id: 0, // Will be set after user creation
  status: 'pending' as const,
  notes: 'Initial review notes',
  reviewed_at: new Date()
};

describe('getCurationReviews', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve all curation reviews with details', async () => {
    // Create test data
    const [reviewer] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [contributor] = await db.insert(usersTable)
      .values(testContributor)
      .returning()
      .execute();

    const [dataset] = await db.insert(datasetsTable)
      .values({ ...testDataset, contributor_id: contributor.id })
      .returning()
      .execute();

    const [review] = await db.insert(curationReviewsTable)
      .values({
        ...testReview,
        dataset_id: dataset.id,
        reviewer_id: reviewer.id
      })
      .returning()
      .execute();

    const result = await getCurationReviews();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(review.id);
    expect(result[0].dataset_id).toBe(dataset.id);
    expect(result[0].reviewer_id).toBe(reviewer.id);
    expect(result[0].status).toBe('pending');
    expect(result[0].notes).toBe('Initial review notes');
    expect(result[0].reviewer_name).toBe('John Reviewer');
    expect(result[0].reviewer_email).toBe('reviewer@example.com');
    expect(result[0].dataset_title).toBe('Test Dataset');
    expect(result[0].reviewed_at).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter reviews by dataset ID', async () => {
    // Create test data
    const [reviewer] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [contributor] = await db.insert(usersTable)
      .values(testContributor)
      .returning()
      .execute();

    const [dataset1] = await db.insert(datasetsTable)
      .values({ ...testDataset, contributor_id: contributor.id, title: 'Dataset 1' })
      .returning()
      .execute();

    const [dataset2] = await db.insert(datasetsTable)
      .values({ ...testDataset, contributor_id: contributor.id, title: 'Dataset 2' })
      .returning()
      .execute();

    // Create reviews for both datasets
    await db.insert(curationReviewsTable)
      .values({
        ...testReview,
        dataset_id: dataset1.id,
        reviewer_id: reviewer.id,
        notes: 'Review for dataset 1'
      })
      .execute();

    await db.insert(curationReviewsTable)
      .values({
        ...testReview,
        dataset_id: dataset2.id,
        reviewer_id: reviewer.id,
        notes: 'Review for dataset 2'
      })
      .execute();

    const filters: GetCurationReviewsFilters = {
      datasetId: dataset1.id
    };

    const result = await getCurationReviews(filters);

    expect(result).toHaveLength(1);
    expect(result[0].dataset_id).toBe(dataset1.id);
    expect(result[0].dataset_title).toBe('Dataset 1');
    expect(result[0].notes).toBe('Review for dataset 1');
  });

  it('should filter reviews by reviewer ID', async () => {
    // Create test data
    const [reviewer1] = await db.insert(usersTable)
      .values({ ...testUser, email: 'reviewer1@example.com', name: 'Reviewer One' })
      .returning()
      .execute();

    const [reviewer2] = await db.insert(usersTable)
      .values({ ...testUser, email: 'reviewer2@example.com', name: 'Reviewer Two' })
      .returning()
      .execute();

    const [contributor] = await db.insert(usersTable)
      .values(testContributor)
      .returning()
      .execute();

    const [dataset] = await db.insert(datasetsTable)
      .values({ ...testDataset, contributor_id: contributor.id })
      .returning()
      .execute();

    // Create reviews by both reviewers
    await db.insert(curationReviewsTable)
      .values({
        ...testReview,
        dataset_id: dataset.id,
        reviewer_id: reviewer1.id,
        notes: 'Review by reviewer 1'
      })
      .execute();

    await db.insert(curationReviewsTable)
      .values({
        ...testReview,
        dataset_id: dataset.id,
        reviewer_id: reviewer2.id,
        notes: 'Review by reviewer 2'
      })
      .execute();

    const filters: GetCurationReviewsFilters = {
      reviewerId: reviewer2.id
    };

    const result = await getCurationReviews(filters);

    expect(result).toHaveLength(1);
    expect(result[0].reviewer_id).toBe(reviewer2.id);
    expect(result[0].reviewer_name).toBe('Reviewer Two');
    expect(result[0].notes).toBe('Review by reviewer 2');
  });

  it('should filter reviews by status', async () => {
    // Create test data
    const [reviewer] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [contributor] = await db.insert(usersTable)
      .values(testContributor)
      .returning()
      .execute();

    const [dataset] = await db.insert(datasetsTable)
      .values({ ...testDataset, contributor_id: contributor.id })
      .returning()
      .execute();

    // Create reviews with different statuses
    await db.insert(curationReviewsTable)
      .values({
        ...testReview,
        dataset_id: dataset.id,
        reviewer_id: reviewer.id,
        status: 'pending',
        notes: 'Pending review'
      })
      .execute();

    await db.insert(curationReviewsTable)
      .values({
        ...testReview,
        dataset_id: dataset.id,
        reviewer_id: reviewer.id,
        status: 'approved',
        notes: 'Approved review'
      })
      .execute();

    const filters: GetCurationReviewsFilters = {
      status: 'approved'
    };

    const result = await getCurationReviews(filters);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('approved');
    expect(result[0].notes).toBe('Approved review');
  });

  it('should handle multiple filters simultaneously', async () => {
    // Create test data
    const [reviewer1] = await db.insert(usersTable)
      .values({ ...testUser, email: 'reviewer1@example.com' })
      .returning()
      .execute();

    const [reviewer2] = await db.insert(usersTable)
      .values({ ...testUser, email: 'reviewer2@example.com' })
      .returning()
      .execute();

    const [contributor] = await db.insert(usersTable)
      .values(testContributor)
      .returning()
      .execute();

    const [dataset1] = await db.insert(datasetsTable)
      .values({ ...testDataset, contributor_id: contributor.id, title: 'Dataset 1' })
      .returning()
      .execute();

    const [dataset2] = await db.insert(datasetsTable)
      .values({ ...testDataset, contributor_id: contributor.id, title: 'Dataset 2' })
      .returning()
      .execute();

    // Create various reviews
    await db.insert(curationReviewsTable)
      .values({
        ...testReview,
        dataset_id: dataset1.id,
        reviewer_id: reviewer1.id,
        status: 'approved'
      })
      .execute();

    await db.insert(curationReviewsTable)
      .values({
        ...testReview,
        dataset_id: dataset1.id,
        reviewer_id: reviewer2.id,
        status: 'pending'
      })
      .execute();

    await db.insert(curationReviewsTable)
      .values({
        ...testReview,
        dataset_id: dataset2.id,
        reviewer_id: reviewer1.id,
        status: 'approved'
      })
      .execute();

    const filters: GetCurationReviewsFilters = {
      datasetId: dataset1.id,
      status: 'approved'
    };

    const result = await getCurationReviews(filters);

    expect(result).toHaveLength(1);
    expect(result[0].dataset_id).toBe(dataset1.id);
    expect(result[0].reviewer_id).toBe(reviewer1.id);
    expect(result[0].status).toBe('approved');
  });

  it('should return empty array when no reviews match filters', async () => {
    // Create test data
    const [reviewer] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [contributor] = await db.insert(usersTable)
      .values(testContributor)
      .returning()
      .execute();

    const [dataset] = await db.insert(datasetsTable)
      .values({ ...testDataset, contributor_id: contributor.id })
      .returning()
      .execute();

    await db.insert(curationReviewsTable)
      .values({
        ...testReview,
        dataset_id: dataset.id,
        reviewer_id: reviewer.id,
        status: 'pending'
      })
      .execute();

    const filters: GetCurationReviewsFilters = {
      status: 'rejected'
    };

    const result = await getCurationReviews(filters);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no reviews exist', async () => {
    const result = await getCurationReviews();

    expect(result).toHaveLength(0);
  });

  it('should order reviews by reviewed_at date in descending order', async () => {
    // Create test data
    const [reviewer] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [contributor] = await db.insert(usersTable)
      .values(testContributor)
      .returning()
      .execute();

    const [dataset] = await db.insert(datasetsTable)
      .values({ ...testDataset, contributor_id: contributor.id })
      .returning()
      .execute();

    const earlierDate = new Date('2024-01-01');
    const laterDate = new Date('2024-02-01');

    // Insert reviews in non-chronological order
    await db.insert(curationReviewsTable)
      .values({
        ...testReview,
        dataset_id: dataset.id,
        reviewer_id: reviewer.id,
        reviewed_at: earlierDate,
        notes: 'Earlier review'
      })
      .execute();

    await db.insert(curationReviewsTable)
      .values({
        ...testReview,
        dataset_id: dataset.id,
        reviewer_id: reviewer.id,
        reviewed_at: laterDate,
        notes: 'Later review'
      })
      .execute();

    const result = await getCurationReviews();

    expect(result).toHaveLength(2);
    // Should be ordered by reviewed_at desc (most recent first)
    expect(result[0].notes).toBe('Later review');
    expect(result[1].notes).toBe('Earlier review');
    expect(result[0].reviewed_at.getTime()).toBeGreaterThan(result[1].reviewed_at.getTime());
  });
});