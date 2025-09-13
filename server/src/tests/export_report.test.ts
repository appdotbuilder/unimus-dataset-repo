import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { exportReport, type ExportOptions } from '../handlers/export_report';
import { type DatasetReport } from '../handlers/generate_reports';

// Test data representing a comprehensive dataset report
const testReport: DatasetReport = {
  totalDatasets: 42,
  datasetsByYear: [
    { year: 2021, count: 8 },
    { year: 2022, count: 15 },
    { year: 2023, count: 19 }
  ],
  datasetsByContributor: [
    { contributorId: 1, contributorName: 'Dr. Alice Smith', count: 12 },
    { contributorId: 2, contributorName: 'Prof. Bob Johnson', count: 8 },
    { contributorId: 3, contributorName: 'Dr. Carol, PhD', count: 5 }
  ],
  studentInvolvement: {
    studentContributors: 15,
    totalStudentDatasets: 17
  },
  departmentBreakdown: [
    { department: 'Computer Science', count: 18 },
    { department: 'Mathematics', count: 12 },
    { department: 'Physics, Applied', count: 8 },
    { department: 'Biology', count: 4 }
  ]
};

const emptyReport: DatasetReport = {
  totalDatasets: 0,
  datasetsByYear: [],
  datasetsByContributor: [],
  studentInvolvement: {
    studentContributors: 0,
    totalStudentDatasets: 0
  },
  departmentBreakdown: []
};

describe('exportReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('CSV export', () => {
    it('should export complete report to CSV format', async () => {
      const options: ExportOptions = { format: 'csv' };
      const result = await exportReport(testReport, options);

      expect(result).toBeInstanceOf(Buffer);
      
      const csvContent = result.toString('utf8');
      
      // Check for all expected sections
      expect(csvContent).toContain('Dataset Summary');
      expect(csvContent).toContain('Total Datasets,42');
      expect(csvContent).toContain('Student Contributors,15');
      expect(csvContent).toContain('Total Student Datasets,17');
      
      expect(csvContent).toContain('Datasets by Year');
      expect(csvContent).toContain('2021,8');
      expect(csvContent).toContain('2022,15');
      expect(csvContent).toContain('2023,19');
      
      expect(csvContent).toContain('Datasets by Contributor');
      expect(csvContent).toContain('1,Dr. Alice Smith,12');
      expect(csvContent).toContain('2,Prof. Bob Johnson,8');
      
      expect(csvContent).toContain('Department Breakdown');
      expect(csvContent).toContain('Computer Science,18');
      expect(csvContent).toContain('Mathematics,12');
    });

    it('should handle CSV escaping for names with commas', async () => {
      const options: ExportOptions = { format: 'csv' };
      const result = await exportReport(testReport, options);
      
      const csvContent = result.toString('utf8');
      
      // Check that comma-containing names are properly escaped
      expect(csvContent).toContain('"Dr. Carol, PhD",5');
      expect(csvContent).toContain('"Physics, Applied",8');
    });

    it('should sort data appropriately in CSV', async () => {
      const options: ExportOptions = { format: 'csv' };
      const result = await exportReport(testReport, options);
      
      const csvContent = result.toString('utf8');
      const lines = csvContent.split('\n');
      
      // Find year section and verify sorting (ascending by year)
      const yearSectionStart = lines.findIndex(line => line === 'Year,Count') + 1;
      const yearLines = lines.slice(yearSectionStart, yearSectionStart + 3);
      expect(yearLines[0]).toContain('2021,8');
      expect(yearLines[1]).toContain('2022,15');
      expect(yearLines[2]).toContain('2023,19');
      
      // Find contributor section and verify sorting (descending by count)
      const contribSectionStart = lines.findIndex(line => line === 'Contributor ID,Contributor Name,Count') + 1;
      const contribLines = lines.slice(contribSectionStart, contribSectionStart + 3);
      expect(contribLines[0]).toContain(',12'); // Dr. Alice Smith (highest count)
      expect(contribLines[1]).toContain(',8');  // Prof. Bob Johnson
      expect(contribLines[2]).toContain(',5');  // Dr. Carol (lowest count)
    });

    it('should handle empty report data in CSV', async () => {
      const options: ExportOptions = { format: 'csv' };
      const result = await exportReport(emptyReport, options);
      
      const csvContent = result.toString('utf8');
      
      expect(csvContent).toContain('Total Datasets,0');
      expect(csvContent).toContain('Student Contributors,0');
      expect(csvContent).toContain('Datasets by Year');
      expect(csvContent).toContain('Year,Count'); // Headers should still be present
      expect(csvContent).toContain('Datasets by Contributor');
      expect(csvContent).toContain('Department Breakdown');
    });
  });

  describe('Excel export', () => {
    it('should export complete report to Excel format', async () => {
      const options: ExportOptions = { format: 'excel' };
      const result = await exportReport(testReport, options);

      expect(result).toBeInstanceOf(Buffer);
      
      const excelContent = result.toString('utf8');
      
      // Check for Excel-specific formatting
      expect(excelContent).toContain('Dataset Report Export');
      expect(excelContent).toContain('Generated:');
      expect(excelContent).toContain('Charts Included: No');
      
      // Check for section headers
      expect(excelContent).toContain('=== SUMMARY ===');
      expect(excelContent).toContain('=== DATASETS BY YEAR ===');
      expect(excelContent).toContain('=== TOP CONTRIBUTORS ===');
      expect(excelContent).toContain('=== DEPARTMENT BREAKDOWN ===');
      
      // Check for tab-separated data
      expect(excelContent).toContain('Total Datasets\t42');
      expect(excelContent).toContain('2021\t8');
      expect(excelContent).toContain('Dr. Alice Smith\t12');
      expect(excelContent).toContain('Computer Science\t18');
    });

    it('should include chart information when requested', async () => {
      const options: ExportOptions = { format: 'excel', includeCharts: true };
      const result = await exportReport(testReport, options);
      
      const excelContent = result.toString('utf8');
      
      expect(excelContent).toContain('Charts Included: Yes');
      expect(excelContent).toContain('=== CHART DATA NOTES ===');
      expect(excelContent).toContain('Chart 1: Datasets by Year - Line chart recommended');
      expect(excelContent).toContain('Chart 2: Top Contributors - Bar chart recommended');
      expect(excelContent).toContain('Chart 3: Department Distribution - Pie chart recommended');
    });

    it('should handle empty report data in Excel format', async () => {
      const options: ExportOptions = { format: 'excel' };
      const result = await exportReport(emptyReport, options);
      
      const excelContent = result.toString('utf8');
      
      expect(excelContent).toContain('Total Datasets\t0');
      expect(excelContent).toContain('Student Contributors\t0');
      expect(excelContent).toContain('=== DATASETS BY YEAR ===');
      expect(excelContent).toContain('Year\tCount'); // Headers should still be present
    });

    it('should sort contributors by count in Excel format', async () => {
      const options: ExportOptions = { format: 'excel' };
      const result = await exportReport(testReport, options);
      
      const excelContent = result.toString('utf8');
      const lines = excelContent.split('\n');
      
      // Find contributor section
      const contribSectionStart = lines.findIndex(line => line === 'Contributor ID\tContributor Name\tDataset Count') + 1;
      const contribLines = lines.slice(contribSectionStart, contribSectionStart + 3);
      
      // Should be sorted by count descending
      expect(contribLines[0]).toContain('\t12'); // Dr. Alice Smith (highest)
      expect(contribLines[1]).toContain('\t8');  // Prof. Bob Johnson 
      expect(contribLines[2]).toContain('\t5');  // Dr. Carol (lowest)
    });
  });

  describe('error handling', () => {
    it('should throw error for unsupported format', async () => {
      const options = { format: 'pdf' as any };
      
      await expect(exportReport(testReport, options)).rejects.toThrow(/unsupported export format/i);
    });

    it('should handle reports with special characters', async () => {
      const specialReport: DatasetReport = {
        ...testReport,
        datasetsByContributor: [
          { contributorId: 1, contributorName: 'Dr. José María-García', count: 5 },
          { contributorId: 2, contributorName: 'Prof. O\'Connor', count: 3 }
        ],
        departmentBreakdown: [
          { department: 'Artificial Intelligence & ML', count: 10 },
          { department: 'Biochemistry, Genetics', count: 5 }
        ]
      };

      const csvOptions: ExportOptions = { format: 'csv' };
      const csvResult = await exportReport(specialReport, csvOptions);
      const csvContent = csvResult.toString('utf8');
      
      expect(csvContent).toContain('Dr. José María-García');
      expect(csvContent).toContain('Prof. O\'Connor');
      expect(csvContent).toContain('Artificial Intelligence & ML'); // & doesn't require escaping in CSV
      expect(csvContent).toContain('"Biochemistry, Genetics"'); // Should be escaped due to comma
      
      const excelOptions: ExportOptions = { format: 'excel' };
      const excelResult = await exportReport(specialReport, excelOptions);
      const excelContent = excelResult.toString('utf8');
      
      expect(excelContent).toContain('Dr. José María-García');
      expect(excelContent).toContain('Artificial Intelligence & ML');
      expect(excelContent).toContain('Biochemistry, Genetics'); // Tab-separated format doesn't need comma escaping
    });
  });

  describe('data integrity', () => {
    it('should preserve all numeric values accurately', async () => {
      const options: ExportOptions = { format: 'csv' };
      const result = await exportReport(testReport, options);
      
      const csvContent = result.toString('utf8');
      
      // Verify all counts are preserved exactly
      expect(csvContent).toContain('Total Datasets,42');
      expect(csvContent).toContain('Student Contributors,15');
      expect(csvContent).toContain('Total Student Datasets,17');
      
      // Verify year data totals match
      const yearTotal = testReport.datasetsByYear.reduce((sum, item) => sum + item.count, 0);
      expect(yearTotal).toBe(42); // Should match totalDatasets
      
      testReport.datasetsByYear.forEach(yearData => {
        expect(csvContent).toContain(`${yearData.year},${yearData.count}`);
      });
    });

    it('should handle large numbers correctly', async () => {
      const largeReport: DatasetReport = {
        totalDatasets: 999999,
        datasetsByYear: [
          { year: 2023, count: 500000 },
          { year: 2024, count: 499999 }
        ],
        datasetsByContributor: [
          { contributorId: 1, contributorName: 'Super Contributor', count: 100000 }
        ],
        studentInvolvement: {
          studentContributors: 50000,
          totalStudentDatasets: 75000
        },
        departmentBreakdown: [
          { department: 'Large Department', count: 300000 }
        ]
      };

      const options: ExportOptions = { format: 'csv' };
      const result = await exportReport(largeReport, options);
      
      const csvContent = result.toString('utf8');
      
      expect(csvContent).toContain('Total Datasets,999999');
      expect(csvContent).toContain('2023,500000');
      expect(csvContent).toContain('Student Contributors,50000');
      expect(csvContent).toContain('Large Department,300000');
    });
  });
});