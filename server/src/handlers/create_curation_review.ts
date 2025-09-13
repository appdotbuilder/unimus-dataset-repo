import { db } from '../db';
import { curationReviewsTable, usersTable, datasetsTable } from '../db/schema';
import { type CreateCurationReviewInput, type CurationReview } from '../schema';
import { eq, and } from 'drizzle-orm';

/**
 * Creates a new curation review for a dataset.
 * Validates that the reviewer has curator permissions.
 * Updates dataset status based on review outcome.
 */
export async function createCurationReview(input: CreateCurationReviewInput): Promise<CurationReview> {
  try {
    // Validate that reviewer exists and has curator role
    const reviewer = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.reviewer_id))
      .execute();

    if (reviewer.length === 0) {
      throw new Error('Reviewer not found');
    }

    if (reviewer[0].role !== 'curator' && reviewer[0].role !== 'admin') {
      throw new Error('User does not have curator permissions');
    }

    // Validate that dataset exists
    const dataset = await db.select()
      .from(datasetsTable)
      .where(eq(datasetsTable.id, input.dataset_id))
      .execute();

    if (dataset.length === 0) {
      throw new Error('Dataset not found');
    }

    // Check if review already exists for this dataset and reviewer
    const existingReview = await db.select()
      .from(curationReviewsTable)
      .where(and(
        eq(curationReviewsTable.dataset_id, input.dataset_id),
        eq(curationReviewsTable.reviewer_id, input.reviewer_id)
      ))
      .execute();

    if (existingReview.length > 0) {
      throw new Error('Review already exists for this dataset and reviewer');
    }

    // Create the curation review
    const result = await db.insert(curationReviewsTable)
      .values({
        dataset_id: input.dataset_id,
        reviewer_id: input.reviewer_id,
        status: input.status,
        notes: input.notes,
        reviewed_at: input.reviewed_at || new Date()
      })
      .returning()
      .execute();

    const curationReview = result[0];

    // Update dataset status based on review outcome
    let newDatasetStatus = dataset[0].status;
    
    if (input.status === 'approved') {
      // If approved and currently in review, move to approved
      if (dataset[0].status === 'review') {
        newDatasetStatus = 'approved';
      }
    } else if (input.status === 'rejected') {
      // If rejected, move back to draft for revisions
      newDatasetStatus = 'draft';
    }

    // Update dataset status if it changed
    if (newDatasetStatus !== dataset[0].status) {
      await db.update(datasetsTable)
        .set({ 
          status: newDatasetStatus,
          updated_at: new Date()
        })
        .where(eq(datasetsTable.id, input.dataset_id))
        .execute();
    }

    return curationReview;
  } catch (error) {
    console.error('Curation review creation failed:', error);
    throw error;
  }
}