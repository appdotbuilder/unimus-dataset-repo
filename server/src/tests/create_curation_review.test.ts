import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, datasetsTable, curationReviewsTable } from '../db/schema';
import { type CreateCurationReviewInput } from '../schema';
import { createCurationReview } from '../handlers/create_curation_review';
import { eq, and } from 'drizzle-orm';

describe('createCurationReview', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create a contributor user
    const contributorResult = await db.insert(usersTable)
      .values({
        email: 'contributor@test.com',
        password: 'password123',
        role: 'contributor',
        name: 'Test Contributor'
      })
      .returning()
      .execute();

    // Create a curator user
    const curatorResult = await db.insert(usersTable)
      .values({
        email: 'curator@test.com',
        password: 'password123',
        role: 'curator',
        name: 'Test Curator'
      })
      .returning()
      .execute();

    // Create an admin user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
        name: 'Test Admin'
      })
      .returning()
      .execute();

    // Create a viewer user (no curator permissions)
    const viewerResult = await db.insert(usersTable)
      .values({
        email: 'viewer@test.com',
        password: 'password123',
        role: 'viewer',
        name: 'Test Viewer'
      })
      .returning()
      .execute();

    // Create a test dataset
    const datasetResult = await db.insert(datasetsTable)
      .values({
        title: 'Test Dataset',
        description: 'A dataset for testing',
        domain: 'Computer Science',
        task: 'Classification',
        license: 'MIT',
        access_level: 'public',
        status: 'review',
        contributor_id: contributorResult[0].id,
        publication_year: 2024
      })
      .returning()
      .execute();

    return {
      contributor: contributorResult[0],
      curator: curatorResult[0],
      admin: adminResult[0],
      viewer: viewerResult[0],
      dataset: datasetResult[0]
    };
  };

  it('should create a curation review with curator permissions', async () => {
    const testData = await createTestData();

    const input: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: testData.curator.id,
      status: 'approved',
      notes: 'Dataset meets all quality standards',
      reviewed_at: new Date()
    };

    const result = await createCurationReview(input);

    // Validate returned curation review
    expect(result.id).toBeDefined();
    expect(result.dataset_id).toEqual(testData.dataset.id);
    expect(result.reviewer_id).toEqual(testData.curator.id);
    expect(result.status).toEqual('approved');
    expect(result.notes).toEqual('Dataset meets all quality standards');
    expect(result.reviewed_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a curation review with admin permissions', async () => {
    const testData = await createTestData();

    const input: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: testData.admin.id,
      status: 'rejected',
      notes: 'Dataset needs improvements',
      reviewed_at: new Date()
    };

    const result = await createCurationReview(input);

    expect(result.id).toBeDefined();
    expect(result.reviewer_id).toEqual(testData.admin.id);
    expect(result.status).toEqual('rejected');
  });

  it('should save curation review to database', async () => {
    const testData = await createTestData();

    const input: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: testData.curator.id,
      status: 'pending',
      notes: 'Initial review started',
      reviewed_at: new Date()
    };

    const result = await createCurationReview(input);

    // Query database to verify the record was saved
    const reviews = await db.select()
      .from(curationReviewsTable)
      .where(eq(curationReviewsTable.id, result.id))
      .execute();

    expect(reviews).toHaveLength(1);
    expect(reviews[0].dataset_id).toEqual(testData.dataset.id);
    expect(reviews[0].reviewer_id).toEqual(testData.curator.id);
    expect(reviews[0].status).toEqual('pending');
    expect(reviews[0].notes).toEqual('Initial review started');
    expect(reviews[0].reviewed_at).toBeInstanceOf(Date);
    expect(reviews[0].created_at).toBeInstanceOf(Date);
  });

  it('should update dataset status to approved when review is approved', async () => {
    const testData = await createTestData();

    const input: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: testData.curator.id,
      status: 'approved',
      notes: 'Dataset approved',
      reviewed_at: new Date()
    };

    await createCurationReview(input);

    // Check that dataset status was updated
    const updatedDataset = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, testData.dataset.id))
      .execute();

    expect(updatedDataset[0].status).toEqual('approved');
  });

  it('should update dataset status to draft when review is rejected', async () => {
    const testData = await createTestData();

    const input: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: testData.curator.id,
      status: 'rejected',
      notes: 'Dataset needs revisions',
      reviewed_at: new Date()
    };

    await createCurationReview(input);

    // Check that dataset status was updated
    const updatedDataset = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, testData.dataset.id))
      .execute();

    expect(updatedDataset[0].status).toEqual('draft');
  });

  it('should not update dataset status for pending reviews', async () => {
    const testData = await createTestData();

    const input: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: testData.curator.id,
      status: 'pending',
      notes: 'Review in progress',
      reviewed_at: new Date()
    };

    await createCurationReview(input);

    // Check that dataset status remained the same
    const updatedDataset = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, testData.dataset.id))
      .execute();

    expect(updatedDataset[0].status).toEqual('review'); // Original status
  });

  it('should use current date as reviewed_at when not provided', async () => {
    const testData = await createTestData();

    const input: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: testData.curator.id,
      status: 'approved',
      notes: 'Dataset approved'
      // reviewed_at not provided
    };

    const before = new Date();
    const result = await createCurationReview(input);
    const after = new Date();

    expect(result.reviewed_at).toBeInstanceOf(Date);
    expect(result.reviewed_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.reviewed_at.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should handle nullable notes field', async () => {
    const testData = await createTestData();

    const input: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: testData.curator.id,
      status: 'approved',
      notes: null,
      reviewed_at: new Date()
    };

    const result = await createCurationReview(input);

    expect(result.notes).toBeNull();
  });

  it('should throw error when reviewer does not exist', async () => {
    const testData = await createTestData();

    const input: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: 99999, // Non-existent reviewer
      status: 'approved',
      notes: 'Test review',
      reviewed_at: new Date()
    };

    expect(createCurationReview(input)).rejects.toThrow(/reviewer not found/i);
  });

  it('should throw error when reviewer lacks curator permissions', async () => {
    const testData = await createTestData();

    const input: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: testData.viewer.id, // Viewer role, no curator permissions
      status: 'approved',
      notes: 'Test review',
      reviewed_at: new Date()
    };

    expect(createCurationReview(input)).rejects.toThrow(/does not have curator permissions/i);
  });

  it('should throw error when dataset does not exist', async () => {
    const testData = await createTestData();

    const input: CreateCurationReviewInput = {
      dataset_id: 99999, // Non-existent dataset
      reviewer_id: testData.curator.id,
      status: 'approved',
      notes: 'Test review',
      reviewed_at: new Date()
    };

    expect(createCurationReview(input)).rejects.toThrow(/dataset not found/i);
  });

  it('should throw error when review already exists for dataset and reviewer', async () => {
    const testData = await createTestData();

    // Create first review
    const input: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: testData.curator.id,
      status: 'pending',
      notes: 'First review',
      reviewed_at: new Date()
    };

    await createCurationReview(input);

    // Try to create duplicate review
    const duplicateInput: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: testData.curator.id,
      status: 'approved',
      notes: 'Second review',
      reviewed_at: new Date()
    };

    expect(createCurationReview(duplicateInput)).rejects.toThrow(/review already exists/i);
  });

  it('should allow different reviewers to review the same dataset', async () => {
    const testData = await createTestData();

    // Create review by curator
    const curatorInput: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: testData.curator.id,
      status: 'approved',
      notes: 'Curator review',
      reviewed_at: new Date()
    };

    const curatorReview = await createCurationReview(curatorInput);

    // Create review by admin for same dataset
    const adminInput: CreateCurationReviewInput = {
      dataset_id: testData.dataset.id,
      reviewer_id: testData.admin.id,
      status: 'approved',
      notes: 'Admin review',
      reviewed_at: new Date()
    };

    const adminReview = await createCurationReview(adminInput);

    expect(curatorReview.id).toBeDefined();
    expect(adminReview.id).toBeDefined();
    expect(curatorReview.id).not.toEqual(adminReview.id);
  });
});