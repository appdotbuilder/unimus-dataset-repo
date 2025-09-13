import { db } from '../db';
import { datasetsTable } from '../db/schema';
import { type Dataset, type DatasetSearchInput } from '../schema';
import { eq, and, or, ilike, desc, type SQL } from 'drizzle-orm';

/**
 * Performs advanced search on datasets with full-text search capabilities.
 * Should search across title, description, domain, and task fields.
 * Applies filters for domain, task, publication year, and access level.
 */
export async function searchDatasets(input: DatasetSearchInput): Promise<Dataset[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Full-text search across title, description, domain, and task (case-insensitive)
    if (input.query && input.query.trim()) {
      const searchPattern = `%${input.query.trim()}%`;
      conditions.push(
        or(
          ilike(datasetsTable.title, searchPattern),
          ilike(datasetsTable.description, searchPattern),
          ilike(datasetsTable.domain, searchPattern),
          ilike(datasetsTable.task, searchPattern)
        )!
      );
    }

    // Domain filter
    if (input.domain) {
      conditions.push(eq(datasetsTable.domain, input.domain));
    }

    // Task filter
    if (input.task) {
      conditions.push(eq(datasetsTable.task, input.task));
    }

    // Publication year filter
    if (input.publication_year !== undefined) {
      conditions.push(eq(datasetsTable.publication_year, input.publication_year));
    }

    // Access level filter
    if (input.access_level) {
      conditions.push(eq(datasetsTable.access_level, input.access_level));
    }

    // Status filter
    if (input.status) {
      conditions.push(eq(datasetsTable.status, input.status));
    }

    // Build and execute the query in one go
    const queryBuilder = db
      .select()
      .from(datasetsTable)
      .orderBy(desc(datasetsTable.created_at))
      .limit(input.limit)
      .offset(input.offset);

    // Apply where clause if we have conditions
    const results = conditions.length > 0
      ? await queryBuilder.where(conditions.length === 1 ? conditions[0] : and(...conditions)).execute()
      : await queryBuilder.execute();

    return results;
  } catch (error) {
    console.error('Dataset search failed:', error);
    throw error;
  }
}