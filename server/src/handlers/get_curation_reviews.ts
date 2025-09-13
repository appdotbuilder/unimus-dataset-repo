import { db } from '../db';
import { curationReviewsTable, usersTable, datasetsTable } from '../db/schema';
import { type CurationReview } from '../schema';
import { eq, and, desc, gte, lte, SQL } from 'drizzle-orm';

export interface GetCurationReviewsFilters {
  datasetId?: number;
  reviewerId?: number;
  status?: 'pending' | 'approved' | 'rejected';
  startDate?: Date;
  endDate?: Date;
}

export interface CurationReviewWithDetails extends CurationReview {
  reviewer_name?: string | null;
  reviewer_email?: string;
  dataset_title?: string;
}

/**
 * Retrieves curation reviews with optional filtering by dataset or reviewer.
 * Includes reviewer and dataset information for admin dashboards.
 * Supports filtering by review status and date ranges.
 */
export async function getCurationReviews(
  filtersOrDatasetId?: GetCurationReviewsFilters | number
): Promise<CurationReviewWithDetails[]> {
  // Handle backward compatibility - if number passed, convert to filters object
  const filters: GetCurationReviewsFilters | undefined = 
    typeof filtersOrDatasetId === 'number' 
      ? { datasetId: filtersOrDatasetId }
      : filtersOrDatasetId;

  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (filters?.datasetId) {
      conditions.push(eq(curationReviewsTable.dataset_id, filters.datasetId));
    }

    if (filters?.reviewerId) {
      conditions.push(eq(curationReviewsTable.reviewer_id, filters.reviewerId));
    }

    if (filters?.status) {
      conditions.push(eq(curationReviewsTable.status, filters.status));
    }

    if (filters?.startDate) {
      conditions.push(gte(curationReviewsTable.reviewed_at, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(curationReviewsTable.reviewed_at, filters.endDate));
    }

    // Create base query
    const baseQuery = db.select({
      id: curationReviewsTable.id,
      dataset_id: curationReviewsTable.dataset_id,
      reviewer_id: curationReviewsTable.reviewer_id,
      status: curationReviewsTable.status,
      notes: curationReviewsTable.notes,
      reviewed_at: curationReviewsTable.reviewed_at,
      created_at: curationReviewsTable.created_at,
      reviewer_name: usersTable.name,
      reviewer_email: usersTable.email,
      dataset_title: datasetsTable.title
    })
    .from(curationReviewsTable)
    .innerJoin(usersTable, eq(curationReviewsTable.reviewer_id, usersTable.id))
    .innerJoin(datasetsTable, eq(curationReviewsTable.dataset_id, datasetsTable.id))
    .orderBy(desc(curationReviewsTable.reviewed_at));

    // Execute query with or without where clause
    const results = conditions.length > 0 
      ? await baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions)).execute()
      : await baseQuery.execute();

    return results.map(result => ({
      id: result.id,
      dataset_id: result.dataset_id,
      reviewer_id: result.reviewer_id,
      status: result.status,
      notes: result.notes,
      reviewed_at: result.reviewed_at,
      created_at: result.created_at,
      reviewer_name: result.reviewer_name,
      reviewer_email: result.reviewer_email,
      dataset_title: result.dataset_title
    }));
  } catch (error) {
    console.error('Curation reviews retrieval failed:', error);
    throw error;
  }
}