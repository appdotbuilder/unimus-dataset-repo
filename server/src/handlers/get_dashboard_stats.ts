import { db } from '../db';
import { usersTable, datasetsTable, curationReviewsTable } from '../db/schema';
import { count, eq, gte, and } from 'drizzle-orm';

export interface DashboardStats {
  totalDatasets: number;
  publishedDatasets: number;
  datasetsInReview: number;
  totalContributors: number;
  totalCurators: number;
  recentSubmissions: number; // Last 30 days
  pendingReviews: number;
}

/**
 * Retrieves key statistics for admin and curator dashboards.
 * Should provide overview metrics for system monitoring and management.
 * Includes counts of datasets by status, user roles, and recent activity.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Calculate date 30 days ago for recent submissions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get total datasets count
    const totalDatasetsResult = await db
      .select({ count: count() })
      .from(datasetsTable)
      .execute();

    // Get published datasets count
    const publishedDatasetsResult = await db
      .select({ count: count() })
      .from(datasetsTable)
      .where(eq(datasetsTable.status, 'published'))
      .execute();

    // Get datasets in review count
    const datasetsInReviewResult = await db
      .select({ count: count() })
      .from(datasetsTable)
      .where(eq(datasetsTable.status, 'review'))
      .execute();

    // Get total contributors count
    const totalContributorsResult = await db
      .select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.role, 'contributor'))
      .execute();

    // Get total curators count
    const totalCuratorsResult = await db
      .select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.role, 'curator'))
      .execute();

    // Get recent submissions (last 30 days)
    const recentSubmissionsResult = await db
      .select({ count: count() })
      .from(datasetsTable)
      .where(gte(datasetsTable.created_at, thirtyDaysAgo))
      .execute();

    // Get pending reviews count
    const pendingReviewsResult = await db
      .select({ count: count() })
      .from(curationReviewsTable)
      .where(eq(curationReviewsTable.status, 'pending'))
      .execute();

    return {
      totalDatasets: totalDatasetsResult[0].count,
      publishedDatasets: publishedDatasetsResult[0].count,
      datasetsInReview: datasetsInReviewResult[0].count,
      totalContributors: totalContributorsResult[0].count,
      totalCurators: totalCuratorsResult[0].count,
      recentSubmissions: recentSubmissionsResult[0].count,
      pendingReviews: pendingReviewsResult[0].count
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
}