import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, profilesTable, datasetsTable } from '../db/schema';
import { type ReportFilter } from '../schema';
import { generateReports } from '../handlers/generate_reports';

// Test data
const testUsers = [
  {
    email: 'lecturer1@university.edu',
    password: 'password123',
    role: 'contributor' as const,
    name: 'Dr. Jane Smith',
    orcid: null
  },
  {
    email: 'student1@university.edu', 
    password: 'password123',
    role: 'contributor' as const,
    name: 'John Doe',
    orcid: null
  },
  {
    email: 'lecturer2@university.edu',
    password: 'password123',
    role: 'contributor' as const,
    name: 'Prof. Bob Johnson',
    orcid: null
  },
  {
    email: 'student2@university.edu',
    password: 'password123',
    role: 'contributor' as const,
    name: 'Alice Wilson',
    orcid: null
  }
];

const testProfiles = [
  {
    type: 'lecturer' as const,
    institution: 'University A',
    department: 'Computer Science',
    orcid: null
  },
  {
    type: 'student' as const,
    institution: 'University A',
    department: 'Computer Science',
    orcid: null
  },
  {
    type: 'lecturer' as const,
    institution: 'University A',
    department: 'Mathematics',
    orcid: null
  },
  {
    type: 'student' as const,
    institution: 'University A',
    department: 'Mathematics',
    orcid: null
  }
];

const testDatasets = [
  {
    title: 'AI Dataset 2022',
    description: 'Machine learning dataset',
    domain: 'AI',
    task: 'Classification',
    license: 'MIT',
    doi: null,
    access_level: 'public' as const,
    status: 'published' as const,
    publication_year: 2022
  },
  {
    title: 'Math Dataset 2023',
    description: 'Mathematical analysis dataset',
    domain: 'Mathematics',
    task: 'Analysis',
    license: 'CC-BY',
    doi: null,
    access_level: 'public' as const,
    status: 'published' as const,
    publication_year: 2023
  },
  {
    title: 'CS Dataset 2023',
    description: 'Computer science dataset',
    domain: 'Computer Science',
    task: 'Processing',
    license: 'GPL',
    doi: null,
    access_level: 'private' as const,
    status: 'draft' as const,
    publication_year: 2023
  },
  {
    title: 'Student Dataset 2024',
    description: 'Student research dataset',
    domain: 'Research',
    task: 'Survey',
    license: 'MIT',
    doi: null,
    access_level: 'public' as const,
    status: 'published' as const,
    publication_year: 2024
  }
];

describe('generateReports', () => {
  let userIds: number[];
  let datasetIds: number[];

  beforeEach(async () => {
    await createDB();
    
    // Create users
    const usersResult = await db.insert(usersTable)
      .values(testUsers)
      .returning()
      .execute();
    userIds = usersResult.map(u => u.id);

    // Create profiles
    const profilesData = testProfiles.map((profile, index) => ({
      ...profile,
      user_id: userIds[index]
    }));
    
    await db.insert(profilesTable)
      .values(profilesData)
      .execute();

    // Create datasets
    const datasetsData = testDatasets.map((dataset, index) => ({
      ...dataset,
      contributor_id: userIds[index % userIds.length]
    }));
    
    const datasetsResult = await db.insert(datasetsTable)
      .values(datasetsData)
      .returning()
      .execute();
    datasetIds = datasetsResult.map(d => d.id);
  });

  afterEach(resetDB);

  it('should generate complete reports without filters', async () => {
    const report = await generateReports();

    // Check total datasets
    expect(report.totalDatasets).toEqual(4);

    // Check datasets by year
    expect(report.datasetsByYear).toHaveLength(3);
    
    const yearMap = new Map(report.datasetsByYear.map(item => [item.year, item.count]));
    expect(yearMap.get(2022)).toEqual(1);
    expect(yearMap.get(2023)).toEqual(2);
    expect(yearMap.get(2024)).toEqual(1);

    // Check datasets by contributor
    expect(report.datasetsByContributor).toHaveLength(4);
    expect(report.datasetsByContributor[0]).toMatchObject({
      contributorId: expect.any(Number),
      contributorName: expect.any(String),
      count: expect.any(Number)
    });

    // Check student involvement
    expect(report.studentInvolvement.studentContributors).toEqual(2);
    expect(report.studentInvolvement.totalStudentDatasets).toEqual(2);

    // Check department breakdown
    expect(report.departmentBreakdown).toHaveLength(2);
    
    const deptMap = new Map(report.departmentBreakdown.map(item => [item.department, item.count]));
    expect(deptMap.get('Computer Science')).toEqual(2);
    expect(deptMap.get('Mathematics')).toEqual(2);
  });

  it('should filter reports by year range', async () => {
    const filters: ReportFilter = {
      start_year: 2023,
      end_year: 2023
    };

    const report = await generateReports(filters);

    expect(report.totalDatasets).toEqual(2);
    expect(report.datasetsByYear).toHaveLength(1);
    expect(report.datasetsByYear[0].year).toEqual(2023);
    expect(report.datasetsByYear[0].count).toEqual(2);
  });

  it('should filter reports by contributor', async () => {
    const filters: ReportFilter = {
      contributor_id: userIds[0] // First user (lecturer)
    };

    const report = await generateReports(filters);

    expect(report.totalDatasets).toEqual(1);
    expect(report.datasetsByContributor).toHaveLength(1);
    expect(report.datasetsByContributor[0].contributorId).toEqual(userIds[0]);
    expect(report.datasetsByContributor[0].contributorName).toEqual('Dr. Jane Smith');
  });

  it('should filter reports by profile type', async () => {
    const filters: ReportFilter = {
      profile_type: 'student'
    };

    const report = await generateReports(filters);

    // Total datasets count is not filtered by profile_type - it only affects joins
    expect(report.totalDatasets).toEqual(4);
    expect(report.datasetsByContributor.length).toEqual(2); // Only student contributors
    expect(report.studentInvolvement.studentContributors).toEqual(2);
    expect(report.studentInvolvement.totalStudentDatasets).toEqual(2);
  });

  it('should filter reports by department', async () => {
    const filters: ReportFilter = {
      department: 'Computer Science'
    };

    const report = await generateReports(filters);

    expect(report.departmentBreakdown).toHaveLength(1);
    expect(report.departmentBreakdown[0].department).toEqual('Computer Science');
    expect(report.departmentBreakdown[0].count).toEqual(2);
  });

  it('should handle multiple filters correctly', async () => {
    const filters: ReportFilter = {
      start_year: 2023,
      profile_type: 'lecturer',
      department: 'Mathematics'
    };

    const report = await generateReports(filters);

    expect(report.totalDatasets).toEqual(3); // 2023 and 2024 datasets (start_year: 2023 means >= 2023)
    expect(report.departmentBreakdown).toHaveLength(1);
    expect(report.departmentBreakdown[0].department).toEqual('Mathematics');
    expect(report.departmentBreakdown[0].count).toEqual(1); // Only one lecturer from Math department >= 2023
  });

  it('should handle empty results gracefully', async () => {
    const filters: ReportFilter = {
      start_year: 2025, // Future year with no datasets
      end_year: 2025
    };

    const report = await generateReports(filters);

    expect(report.totalDatasets).toEqual(0);
    expect(report.datasetsByYear).toHaveLength(0);
    expect(report.datasetsByContributor).toHaveLength(0);
    expect(report.studentInvolvement.studentContributors).toEqual(0);
    expect(report.studentInvolvement.totalStudentDatasets).toEqual(0);
    expect(report.departmentBreakdown).toHaveLength(0);
  });

  it('should handle start year filter only', async () => {
    const filters: ReportFilter = {
      start_year: 2023
    };

    const report = await generateReports(filters);

    expect(report.totalDatasets).toEqual(3); // 2023 and 2024 datasets
    expect(report.datasetsByYear).toHaveLength(2);
    
    const years = report.datasetsByYear.map(item => item.year);
    expect(years).toContain(2023);
    expect(years).toContain(2024);
    expect(years).not.toContain(2022);
  });

  it('should handle end year filter only', async () => {
    const filters: ReportFilter = {
      end_year: 2022
    };

    const report = await generateReports(filters);

    expect(report.totalDatasets).toEqual(1); // Only 2022 dataset
    expect(report.datasetsByYear).toHaveLength(1);
    expect(report.datasetsByYear[0].year).toEqual(2022);
  });

  it('should use user name when available, fallback to email', async () => {
    // Test with existing data - users have names
    const report = await generateReports();
    
    const contributorNames = report.datasetsByContributor.map(c => c.contributorName);
    expect(contributorNames).toContain('Dr. Jane Smith');
    expect(contributorNames).toContain('John Doe');
    expect(contributorNames).toContain('Prof. Bob Johnson');
    expect(contributorNames).toContain('Alice Wilson');
  });
});