import { db } from '../db';
import { datasetsTable, usersTable, profilesTable } from '../db/schema';
import { type ReportFilter } from '../schema';
import { eq, and, gte, lte, isNull, count, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export interface DatasetReport {
  totalDatasets: number;
  datasetsByYear: { year: number; count: number }[];
  datasetsByContributor: { contributorId: number; contributorName: string; count: number }[];
  studentInvolvement: { studentContributors: number; totalStudentDatasets: number };
  departmentBreakdown: { department: string; count: number }[];
}

/**
 * Generates comprehensive reports for accreditation and administrative purposes.
 * Should aggregate dataset statistics by year, contributor, department, and student involvement.
 * Supports filtering by date ranges and contributor types.
 */
export async function generateReports(filters?: ReportFilter): Promise<DatasetReport> {
  try {
    // Build base conditions for datasets
    const conditions: SQL<unknown>[] = [];
    
    if (filters?.start_year !== undefined) {
      conditions.push(gte(datasetsTable.publication_year, filters.start_year));
    }
    
    if (filters?.end_year !== undefined) {
      conditions.push(lte(datasetsTable.publication_year, filters.end_year));
    }
    
    if (filters?.contributor_id !== undefined) {
      conditions.push(eq(datasetsTable.contributor_id, filters.contributor_id));
    }

    // Get total datasets count
    const totalResult = conditions.length > 0
      ? await db.select({ count: count() }).from(datasetsTable).where(and(...conditions)).execute()
      : await db.select({ count: count() }).from(datasetsTable).execute();
    const totalDatasets = totalResult[0].count;

    // Get datasets by year
    const datasetsByYear = conditions.length > 0
      ? await db
          .select({
            year: datasetsTable.publication_year,
            count: count()
          })
          .from(datasetsTable)
          .where(and(...conditions))
          .groupBy(datasetsTable.publication_year)
          .orderBy(datasetsTable.publication_year)
          .execute()
      : await db
          .select({
            year: datasetsTable.publication_year,
            count: count()
          })
          .from(datasetsTable)
          .groupBy(datasetsTable.publication_year)
          .orderBy(datasetsTable.publication_year)
          .execute();

    // Get datasets by contributor - need to join with users and profiles for filtering
    const contributorConditions: SQL<unknown>[] = [...conditions];
    
    if (filters?.profile_type !== undefined) {
      contributorConditions.push(eq(profilesTable.type, filters.profile_type));
    }
    
    if (filters?.department !== undefined) {
      contributorConditions.push(eq(profilesTable.department, filters.department));
    }

    const datasetsByContributor = contributorConditions.length > 0
      ? await db
          .select({
            contributorId: datasetsTable.contributor_id,
            contributorName: sql<string>`COALESCE(${usersTable.name}, ${usersTable.email})`.as('contributor_name'),
            count: count()
          })
          .from(datasetsTable)
          .innerJoin(usersTable, eq(datasetsTable.contributor_id, usersTable.id))
          .leftJoin(profilesTable, eq(usersTable.id, profilesTable.user_id))
          .where(and(...contributorConditions))
          .groupBy(datasetsTable.contributor_id, usersTable.name, usersTable.email)
          .orderBy(sql`count(*) DESC`)
          .execute()
      : await db
          .select({
            contributorId: datasetsTable.contributor_id,
            contributorName: sql<string>`COALESCE(${usersTable.name}, ${usersTable.email})`.as('contributor_name'),
            count: count()
          })
          .from(datasetsTable)
          .innerJoin(usersTable, eq(datasetsTable.contributor_id, usersTable.id))
          .leftJoin(profilesTable, eq(usersTable.id, profilesTable.user_id))
          .groupBy(datasetsTable.contributor_id, usersTable.name, usersTable.email)
          .orderBy(sql`count(*) DESC`)
          .execute();

    // Get student involvement statistics
    const studentConditions: SQL<unknown>[] = [eq(profilesTable.type, 'student'), ...conditions];

    const studentInvolvementResult = await db
      .select({
        studentContributors: sql<number>`COUNT(DISTINCT ${usersTable.id})`.as('student_contributors'),
        totalStudentDatasets: count()
      })
      .from(datasetsTable)
      .innerJoin(usersTable, eq(datasetsTable.contributor_id, usersTable.id))
      .innerJoin(profilesTable, eq(usersTable.id, profilesTable.user_id))
      .where(and(...studentConditions))
      .execute();
    const studentInvolvement = {
      studentContributors: parseInt(studentInvolvementResult[0]?.studentContributors?.toString() || '0'),
      totalStudentDatasets: parseInt(studentInvolvementResult[0]?.totalStudentDatasets?.toString() || '0')
    };

    // Get department breakdown
    const departmentConditions: SQL<unknown>[] = [...conditions];
    
    if (filters?.profile_type !== undefined) {
      departmentConditions.push(eq(profilesTable.type, filters.profile_type));
    }
    
    if (filters?.department !== undefined) {
      departmentConditions.push(eq(profilesTable.department, filters.department));
    }

    const departmentBreakdown = departmentConditions.length > 0
      ? await db
          .select({
            department: profilesTable.department,
            count: count()
          })
          .from(datasetsTable)
          .innerJoin(usersTable, eq(datasetsTable.contributor_id, usersTable.id))
          .innerJoin(profilesTable, eq(usersTable.id, profilesTable.user_id))
          .where(and(...departmentConditions))
          .groupBy(profilesTable.department)
          .orderBy(sql`count(*) DESC`)
          .execute()
      : await db
          .select({
            department: profilesTable.department,
            count: count()
          })
          .from(datasetsTable)
          .innerJoin(usersTable, eq(datasetsTable.contributor_id, usersTable.id))
          .innerJoin(profilesTable, eq(usersTable.id, profilesTable.user_id))
          .groupBy(profilesTable.department)
          .orderBy(sql`count(*) DESC`)
          .execute();

    return {
      totalDatasets: parseInt(totalDatasets.toString()),
      datasetsByYear: datasetsByYear.map(item => ({
        year: item.year,
        count: parseInt(item.count.toString())
      })),
      datasetsByContributor: datasetsByContributor.map(item => ({
        contributorId: item.contributorId,
        contributorName: item.contributorName,
        count: parseInt(item.count.toString())
      })),
      studentInvolvement,
      departmentBreakdown: departmentBreakdown.map(item => ({
        department: item.department,
        count: parseInt(item.count.toString())
      }))
    };
  } catch (error) {
    console.error('Report generation failed:', error);
    throw error;
  }
}