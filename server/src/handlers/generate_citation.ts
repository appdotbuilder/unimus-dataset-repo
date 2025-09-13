import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Dataset } from '../schema';

export interface Citation {
  apa: string;
  ieee: string;
}

/**
 * Generates APA and IEEE style citations for a dataset.
 * Should include contributor name, dataset title, publication year, and DOI if available.
 * Follows academic citation standards for datasets.
 */
export async function generateCitation(dataset: Dataset): Promise<Citation> {
  try {
    // Fetch contributor information
    const contributorResult = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, dataset.contributor_id))
      .execute();

    const contributor = contributorResult[0];
    
    // Use contributor name if available, otherwise fallback to email or "Unknown Author"
    const authorName = contributor?.name || contributor?.email || 'Unknown Author';
    
    // Format DOI URL if available
    const doiUrl = dataset.doi ? `https://doi.org/${dataset.doi}` : null;
    
    // Generate APA style citation
    // Format: Author, A. A. (Year). Title [Dataset]. Publisher/Repository. DOI or URL
    const apa = `${authorName}. (${dataset.publication_year}). ${dataset.title} [Dataset]. ${doiUrl || 'Unimus Repository'}.`;
    
    // Generate IEEE style citation
    // Format: A. A. Author, "Title," Dataset, Year. [Online]. Available: DOI or URL
    const ieee = `${authorName}, "${dataset.title}," Dataset, ${dataset.publication_year}.${doiUrl ? ` [Online]. Available: ${doiUrl}` : ' [Database]'}`;

    return {
      apa,
      ieee
    };
  } catch (error) {
    console.error('Citation generation failed:', error);
    throw error;
  }
}