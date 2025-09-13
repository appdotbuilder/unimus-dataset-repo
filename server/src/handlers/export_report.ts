import { type DatasetReport } from './generate_reports';

export interface ExportOptions {
  format: 'csv' | 'excel';
  includeCharts?: boolean;
}

/**
 * Exports generated reports to CSV or Excel format.
 * Should format report data into downloadable files for institutional use.
 * Supports both simple CSV export and rich Excel format with charts.
 */
export async function exportReport(report: DatasetReport, options: ExportOptions): Promise<Buffer> {
  try {
    if (options.format === 'csv') {
      return await exportToCsv(report);
    } else if (options.format === 'excel') {
      return await exportToExcel(report, options.includeCharts || false);
    } else {
      throw new Error(`Unsupported export format: ${options.format}`);
    }
  } catch (error) {
    console.error('Report export failed:', error);
    throw error;
  }
}

/**
 * Exports report data to CSV format with multiple sections
 */
async function exportToCsv(report: DatasetReport): Promise<Buffer> {
  const sections: string[] = [];

  // Summary section
  sections.push('Dataset Summary');
  sections.push('Metric,Value');
  sections.push(`Total Datasets,${report.totalDatasets}`);
  sections.push(`Student Contributors,${report.studentInvolvement.studentContributors}`);
  sections.push(`Total Student Datasets,${report.studentInvolvement.totalStudentDatasets}`);
  sections.push(''); // Empty line separator

  // Datasets by year section
  sections.push('Datasets by Year');
  sections.push('Year,Count');
  report.datasetsByYear
    .sort((a, b) => a.year - b.year)
    .forEach(item => {
      sections.push(`${item.year},${item.count}`);
    });
  sections.push(''); // Empty line separator

  // Datasets by contributor section
  sections.push('Datasets by Contributor');
  sections.push('Contributor ID,Contributor Name,Count');
  report.datasetsByContributor
    .sort((a, b) => b.count - a.count)
    .forEach(item => {
      // Escape CSV values that contain commas
      const escapedName = item.contributorName.includes(',') 
        ? `"${item.contributorName.replace(/"/g, '""')}"` 
        : item.contributorName;
      sections.push(`${item.contributorId},${escapedName},${item.count}`);
    });
  sections.push(''); // Empty line separator

  // Department breakdown section
  sections.push('Department Breakdown');
  sections.push('Department,Count');
  report.departmentBreakdown
    .sort((a, b) => b.count - a.count)
    .forEach(item => {
      // Escape CSV values that contain commas
      const escapedDept = item.department.includes(',') 
        ? `"${item.department.replace(/"/g, '""')}"` 
        : item.department;
      sections.push(`${escapedDept},${item.count}`);
    });

  const csvContent = sections.join('\n');
  return Buffer.from(csvContent, 'utf8');
}

/**
 * Exports report data to Excel format (simplified XLSX-compatible CSV for now)
 * In a real implementation, this would use a library like 'exceljs' to create proper Excel files
 */
async function exportToExcel(report: DatasetReport, includeCharts: boolean): Promise<Buffer> {
  // For this implementation, we'll create a more structured format that Excel can import
  // In production, you'd use a library like 'exceljs' to create proper .xlsx files
  
  const sections: string[] = [];
  
  // Add metadata header for Excel
  sections.push('Dataset Report Export');
  sections.push(`Generated: ${new Date().toISOString()}`);
  sections.push(`Charts Included: ${includeCharts ? 'Yes' : 'No'}`);
  sections.push(''); // Empty line

  // Summary sheet data
  sections.push('=== SUMMARY ===');
  sections.push('Metric\tValue');
  sections.push(`Total Datasets\t${report.totalDatasets}`);
  sections.push(`Student Contributors\t${report.studentInvolvement.studentContributors}`);
  sections.push(`Total Student Datasets\t${report.studentInvolvement.totalStudentDatasets}`);
  sections.push(''); // Empty line

  // Year analysis sheet data
  sections.push('=== DATASETS BY YEAR ===');
  sections.push('Year\tCount');
  report.datasetsByYear
    .sort((a, b) => a.year - b.year)
    .forEach(item => {
      sections.push(`${item.year}\t${item.count}`);
    });
  sections.push(''); // Empty line

  // Contributor analysis sheet data
  sections.push('=== TOP CONTRIBUTORS ===');
  sections.push('Contributor ID\tContributor Name\tDataset Count');
  report.datasetsByContributor
    .sort((a, b) => b.count - a.count)
    .forEach(item => {
      sections.push(`${item.contributorId}\t${item.contributorName}\t${item.count}`);
    });
  sections.push(''); // Empty line

  // Department analysis sheet data
  sections.push('=== DEPARTMENT BREAKDOWN ===');
  sections.push('Department\tDataset Count');
  report.departmentBreakdown
    .sort((a, b) => b.count - a.count)
    .forEach(item => {
      sections.push(`${item.department}\t${item.count}`);
    });

  if (includeCharts) {
    sections.push(''); // Empty line
    sections.push('=== CHART DATA NOTES ===');
    sections.push('Chart 1: Datasets by Year - Line chart recommended');
    sections.push('Chart 2: Top Contributors - Bar chart recommended');
    sections.push('Chart 3: Department Distribution - Pie chart recommended');
  }

  // Use tab-separated format for better Excel compatibility
  const excelContent = sections.join('\n');
  return Buffer.from(excelContent, 'utf8');
}