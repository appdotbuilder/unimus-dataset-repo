import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['viewer', 'contributor', 'curator', 'admin']);
export const profileTypeEnum = pgEnum('profile_type', ['lecturer', 'student']);
export const datasetAccessLevelEnum = pgEnum('dataset_access_level', ['public', 'private', 'restricted']);
export const datasetStatusEnum = pgEnum('dataset_status', ['draft', 'review', 'approved', 'published']);
export const curationReviewStatusEnum = pgEnum('curation_review_status', ['pending', 'approved', 'rejected']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: userRoleEnum('role').notNull(),
  name: text('name'), // Nullable by default
  orcid: text('orcid'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Profiles table
export const profilesTable = pgTable('profiles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  type: profileTypeEnum('type').notNull(),
  institution: text('institution').notNull(),
  department: text('department').notNull(),
  orcid: text('orcid'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Datasets table
export const datasetsTable = pgTable('datasets', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  domain: text('domain').notNull(),
  task: text('task').notNull(),
  license: text('license').notNull(),
  doi: text('doi'), // Nullable by default
  access_level: datasetAccessLevelEnum('access_level').notNull(),
  status: datasetStatusEnum('status').notNull().default('draft'),
  contributor_id: integer('contributor_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  publication_year: integer('publication_year').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Dataset files table
export const datasetFilesTable = pgTable('dataset_files', {
  id: serial('id').primaryKey(),
  dataset_id: integer('dataset_id').notNull().references(() => datasetsTable.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  path: text('path').notNull(),
  size: integer('size').notNull(),
  type: text('type').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Curation reviews table
export const curationReviewsTable = pgTable('curation_reviews', {
  id: serial('id').primaryKey(),
  dataset_id: integer('dataset_id').notNull().references(() => datasetsTable.id, { onDelete: 'cascade' }),
  reviewer_id: integer('reviewer_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  status: curationReviewStatusEnum('status').notNull(),
  notes: text('notes'), // Nullable by default
  reviewed_at: timestamp('reviewed_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  profile: one(profilesTable, {
    fields: [usersTable.id],
    references: [profilesTable.user_id],
  }),
  contributedDatasets: many(datasetsTable),
  curationReviews: many(curationReviewsTable),
}));

export const profilesRelations = relations(profilesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [profilesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const datasetsRelations = relations(datasetsTable, ({ one, many }) => ({
  contributor: one(usersTable, {
    fields: [datasetsTable.contributor_id],
    references: [usersTable.id],
  }),
  files: many(datasetFilesTable),
  curationReviews: many(curationReviewsTable),
}));

export const datasetFilesRelations = relations(datasetFilesTable, ({ one }) => ({
  dataset: one(datasetsTable, {
    fields: [datasetFilesTable.dataset_id],
    references: [datasetsTable.id],
  }),
}));

export const curationReviewsRelations = relations(curationReviewsTable, ({ one }) => ({
  dataset: one(datasetsTable, {
    fields: [curationReviewsTable.dataset_id],
    references: [datasetsTable.id],
  }),
  reviewer: one(usersTable, {
    fields: [curationReviewsTable.reviewer_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Profile = typeof profilesTable.$inferSelect;
export type NewProfile = typeof profilesTable.$inferInsert;

export type Dataset = typeof datasetsTable.$inferSelect;
export type NewDataset = typeof datasetsTable.$inferInsert;

export type DatasetFile = typeof datasetFilesTable.$inferSelect;
export type NewDatasetFile = typeof datasetFilesTable.$inferInsert;

export type CurationReview = typeof curationReviewsTable.$inferSelect;
export type NewCurationReview = typeof curationReviewsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  profiles: profilesTable,
  datasets: datasetsTable,
  datasetFiles: datasetFilesTable,
  curationReviews: curationReviewsTable,
};

export const tableRelations = {
  usersRelations,
  profilesRelations,
  datasetsRelations,
  datasetFilesRelations,
  curationReviewsRelations,
};