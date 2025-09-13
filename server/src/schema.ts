import { z } from 'zod';

// Enums
export const userRoleEnum = z.enum(['viewer', 'contributor', 'curator', 'admin']);
export const profileTypeEnum = z.enum(['lecturer', 'student']);
export const datasetAccessLevelEnum = z.enum(['public', 'private', 'restricted']);
export const datasetStatusEnum = z.enum(['draft', 'review', 'approved', 'published']);
export const curationReviewStatusEnum = z.enum(['pending', 'approved', 'rejected']);

// User schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password: z.string(),
  role: userRoleEnum,
  name: z.string().nullable(),
  orcid: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleEnum,
  name: z.string().nullable(),
  orcid: z.string().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating users
export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: userRoleEnum.optional(),
  name: z.string().nullable().optional(),
  orcid: z.string().nullable().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Profile schemas
export const profileSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  type: profileTypeEnum,
  institution: z.string(),
  department: z.string(),
  orcid: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Profile = z.infer<typeof profileSchema>;

// Input schema for creating profiles
export const createProfileInputSchema = z.object({
  user_id: z.number(),
  type: profileTypeEnum,
  institution: z.string(),
  department: z.string(),
  orcid: z.string().nullable()
});

export type CreateProfileInput = z.infer<typeof createProfileInputSchema>;

// Input schema for updating profiles
export const updateProfileInputSchema = z.object({
  id: z.number(),
  user_id: z.number().optional(),
  type: profileTypeEnum.optional(),
  institution: z.string().optional(),
  department: z.string().optional(),
  orcid: z.string().nullable().optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

// Dataset schemas
export const datasetSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  domain: z.string(),
  task: z.string(),
  license: z.string(),
  doi: z.string().nullable(),
  access_level: datasetAccessLevelEnum,
  status: datasetStatusEnum,
  contributor_id: z.number(),
  publication_year: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Dataset = z.infer<typeof datasetSchema>;

// Input schema for creating datasets
export const createDatasetInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  domain: z.string().min(1),
  task: z.string().min(1),
  license: z.string().min(1),
  doi: z.string().nullable(),
  access_level: datasetAccessLevelEnum,
  status: datasetStatusEnum.default('draft'),
  contributor_id: z.number(),
  publication_year: z.number().int().min(1900).max(new Date().getFullYear() + 10)
});

export type CreateDatasetInput = z.infer<typeof createDatasetInputSchema>;

// Input schema for updating datasets
export const updateDatasetInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  domain: z.string().min(1).optional(),
  task: z.string().min(1).optional(),
  license: z.string().min(1).optional(),
  doi: z.string().nullable().optional(),
  access_level: datasetAccessLevelEnum.optional(),
  status: datasetStatusEnum.optional(),
  contributor_id: z.number().optional(),
  publication_year: z.number().int().min(1900).max(new Date().getFullYear() + 10).optional()
});

export type UpdateDatasetInput = z.infer<typeof updateDatasetInputSchema>;

// Dataset file schemas
export const datasetFileSchema = z.object({
  id: z.number(),
  dataset_id: z.number(),
  filename: z.string(),
  path: z.string(),
  size: z.number().int().nonnegative(),
  type: z.string(),
  created_at: z.coerce.date()
});

export type DatasetFile = z.infer<typeof datasetFileSchema>;

// Input schema for creating dataset files
export const createDatasetFileInputSchema = z.object({
  dataset_id: z.number(),
  filename: z.string().min(1),
  path: z.string().min(1),
  size: z.number().int().nonnegative(),
  type: z.string().min(1)
});

export type CreateDatasetFileInput = z.infer<typeof createDatasetFileInputSchema>;

// Input schema for updating dataset files
export const updateDatasetFileInputSchema = z.object({
  id: z.number(),
  dataset_id: z.number().optional(),
  filename: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
  size: z.number().int().nonnegative().optional(),
  type: z.string().min(1).optional()
});

export type UpdateDatasetFileInput = z.infer<typeof updateDatasetFileInputSchema>;

// Curation review schemas
export const curationReviewSchema = z.object({
  id: z.number(),
  dataset_id: z.number(),
  reviewer_id: z.number(),
  status: curationReviewStatusEnum,
  notes: z.string().nullable(),
  reviewed_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type CurationReview = z.infer<typeof curationReviewSchema>;

// Input schema for creating curation reviews
export const createCurationReviewInputSchema = z.object({
  dataset_id: z.number(),
  reviewer_id: z.number(),
  status: curationReviewStatusEnum,
  notes: z.string().nullable(),
  reviewed_at: z.coerce.date().optional()
});

export type CreateCurationReviewInput = z.infer<typeof createCurationReviewInputSchema>;

// Input schema for updating curation reviews
export const updateCurationReviewInputSchema = z.object({
  id: z.number(),
  dataset_id: z.number().optional(),
  reviewer_id: z.number().optional(),
  status: curationReviewStatusEnum.optional(),
  notes: z.string().nullable().optional(),
  reviewed_at: z.coerce.date().optional()
});

export type UpdateCurationReviewInput = z.infer<typeof updateCurationReviewInputSchema>;

// Authentication schemas
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Search and filter schemas
export const datasetSearchInputSchema = z.object({
  query: z.string().optional(),
  domain: z.string().optional(),
  task: z.string().optional(),
  publication_year: z.number().int().optional(),
  access_level: datasetAccessLevelEnum.optional(),
  status: datasetStatusEnum.optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0)
});

export type DatasetSearchInput = z.infer<typeof datasetSearchInputSchema>;

// Report schemas
export const reportFilterSchema = z.object({
  start_year: z.number().int().optional(),
  end_year: z.number().int().optional(),
  contributor_id: z.number().optional(),
  profile_type: profileTypeEnum.optional(),
  department: z.string().optional()
});

export type ReportFilter = z.infer<typeof reportFilterSchema>;