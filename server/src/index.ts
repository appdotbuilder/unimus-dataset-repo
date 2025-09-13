import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  loginInputSchema,
  createProfileInputSchema,
  updateProfileInputSchema,
  createDatasetInputSchema,
  updateDatasetInputSchema,
  createDatasetFileInputSchema,
  updateDatasetFileInputSchema,
  createCurationReviewInputSchema,
  updateCurationReviewInputSchema,
  datasetSearchInputSchema,
  reportFilterSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { authenticateUser } from './handlers/authenticate_user';

import { createProfile } from './handlers/create_profile';
import { getProfiles } from './handlers/get_profiles';
import { getProfileByUser } from './handlers/get_profile_by_user';

import { createDataset } from './handlers/create_dataset';
import { getDatasets } from './handlers/get_datasets';
import { getDatasetById } from './handlers/get_dataset_by_id';
import { updateDataset } from './handlers/update_dataset';
import { searchDatasets } from './handlers/search_datasets';
import { getDatasetsByContributor } from './handlers/get_datasets_by_contributor';

import { createDatasetFile } from './handlers/create_dataset_file';
import { getDatasetFiles } from './handlers/get_dataset_files';
import { previewDatasetFile } from './handlers/preview_dataset_file';

import { createCurationReview } from './handlers/create_curation_review';
import { getCurationReviews } from './handlers/get_curation_reviews';

import { generateCitation } from './handlers/generate_citation';
import { generateReports } from './handlers/generate_reports';
import { exportReport } from './handlers/export_report';
import { getDashboardStats } from './handlers/get_dashboard_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  authenticateUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => authenticateUser(input)),

  // Profile management routes
  createProfile: publicProcedure
    .input(createProfileInputSchema)
    .mutation(({ input }) => createProfile(input)),

  getProfiles: publicProcedure
    .query(() => getProfiles()),

  getProfileByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getProfileByUser(input.userId)),

  // Dataset management routes
  createDataset: publicProcedure
    .input(createDatasetInputSchema)
    .mutation(({ input }) => createDataset(input)),

  getDatasets: publicProcedure
    .input(datasetSearchInputSchema.optional())
    .query(({ input }) => getDatasets(input)),

  getDatasetById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getDatasetById(input.id)),

  updateDataset: publicProcedure
    .input(updateDatasetInputSchema)
    .mutation(({ input }) => updateDataset(input)),

  searchDatasets: publicProcedure
    .input(datasetSearchInputSchema)
    .query(({ input }) => searchDatasets(input)),

  getDatasetsByContributor: publicProcedure
    .input(z.object({ contributorId: z.number() }))
    .query(({ input }) => getDatasetsByContributor(input.contributorId)),

  // Dataset file management routes
  createDatasetFile: publicProcedure
    .input(createDatasetFileInputSchema)
    .mutation(({ input }) => createDatasetFile(input)),

  getDatasetFiles: publicProcedure
    .input(z.object({ datasetId: z.number() }))
    .query(({ input }) => getDatasetFiles(input.datasetId)),

  previewDatasetFile: publicProcedure
    .input(z.object({ fileId: z.number() }))
    .query(async ({ input }) => {
      // In real implementation, fetch file details first
      const mockFile = {
        id: input.fileId,
        dataset_id: 1,
        filename: 'sample.csv',
        path: '/uploads/sample.csv',
        size: 1024,
        type: 'CSV',
        created_at: new Date()
      };
      return previewDatasetFile(mockFile);
    }),

  // Curation review routes
  createCurationReview: publicProcedure
    .input(createCurationReviewInputSchema)
    .mutation(({ input }) => createCurationReview(input)),

  getCurationReviews: publicProcedure
    .input(z.object({ datasetId: z.number().optional() }))
    .query(({ input }) => getCurationReviews(input.datasetId)),

  // Citation and utility routes
  generateCitation: publicProcedure
    .input(z.object({ datasetId: z.number() }))
    .query(async ({ input }) => {
      // In real implementation, fetch dataset details first
      const mockDataset = {
        id: input.datasetId,
        title: 'Sample Dataset',
        description: 'A sample dataset',
        domain: 'Machine Learning',
        task: 'Classification',
        license: 'MIT',
        doi: null,
        access_level: 'public' as const,
        status: 'published' as const,
        contributor_id: 1,
        publication_year: 2024,
        created_at: new Date(),
        updated_at: new Date()
      };
      return generateCitation(mockDataset);
    }),

  // Reporting routes
  generateReports: publicProcedure
    .input(reportFilterSchema.optional())
    .query(({ input }) => generateReports(input)),

  exportReport: publicProcedure
    .input(z.object({
      format: z.enum(['csv', 'excel']),
      includeCharts: z.boolean().optional(),
      filters: reportFilterSchema.optional()
    }))
    .mutation(async ({ input }) => {
      // In real implementation, generate report first
      const report = await generateReports(input.filters);
      const exportOptions = {
        format: input.format,
        includeCharts: input.includeCharts
      };
      return exportReport(report, exportOptions);
    }),

  // Dashboard routes
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats())
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`UISR TRPC server listening at port: ${port}`);
}

start();