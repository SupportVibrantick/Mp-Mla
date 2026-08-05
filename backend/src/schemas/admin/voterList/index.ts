import { z } from "zod";

// ── Valid enum values ──
const VOTER_GENDERS = ["MALE", "FEMALE", "TRANSGENDER"] as const;
const RELATION_TYPES = ["F", "H", "M"] as const; // Father, Husband, Mother

// ══════════════════════════════════════════════════════════
// CREATE VOTER SCHEMA (Single)
// ══════════════════════════════════════════════════════════

export const createVoterSchema = z.object({
  wardId: z.string().min(1, "Ward ID is required"),
  wardAreaId: z.string().optional().nullable(),
  voterIdNumber: z.string().min(1, "Voter ID (EPIC) is required").max(50),
  slNo: z.number().int().positive().optional().nullable(),
  sectionNo: z.number().int().positive().optional().nullable(),
  boothNo: z.number().int().positive().optional().nullable(),

  name: z.string().min(1, "Name is required").max(200),
  relativeName: z.string().max(200).optional().nullable(),
  relationType: z.enum(RELATION_TYPES).optional().nullable(),
  gender: z.enum(VOTER_GENDERS),
  age: z.number().int().min(0).max(150).optional().nullable(),

  houseNo: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  locality: z.string().max(200).optional().nullable(),

  phone: z.string().max(20).optional().nullable(),

  isDisabled: z.boolean().default(false),
});

export type CreateVoterInput = z.infer<typeof createVoterSchema>;

// ══════════════════════════════════════════════════════════
// UPDATE VOTER SCHEMA
// ══════════════════════════════════════════════════════════

export const updateVoterSchema = createVoterSchema.partial();

export type UpdateVoterInput = z.infer<typeof updateVoterSchema>;

// ══════════════════════════════════════════════════════════
// BULK VOTER ROW SCHEMA (lighter for bulk import)
// ══════════════════════════════════════════════════════════

export const bulkVoterRowSchema = z.object({
  voterIdNumber: z.string().min(1, "Voter ID is required"),
  wardNumber: z.union([z.string(), z.number()]),
  name: z.string().min(1, "Name is required"),
  gender: z.string().min(1, "Gender is required"),

  // Optional for bulk
  slNo: z.union([z.string(), z.number()]).optional().nullable(),
  sectionNo: z.union([z.string(), z.number()]).optional().nullable(),
  boothNo: z.union([z.string(), z.number()]).optional().nullable(),
  relativeName: z.string().optional().nullable(),
  relationType: z.string().optional().nullable(),
  age: z.union([z.string(), z.number()]).optional().nullable(),
  houseNo: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  locality: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  isDisabled: z.union([z.string(), z.boolean()]).optional().nullable(),
  wardAreaName: z.string().optional().nullable(),
});

export type BulkVoterRow = z.infer<typeof bulkVoterRowSchema>;

// ══════════════════════════════════════════════════════════
// QUERY SCHEMA (for list endpoint)
// ══════════════════════════════════════════════════════════

export const voterListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().optional(),
  wardId: z.string().optional(),
  wardAreaId: z.string().optional(),
  boothNo: z.coerce.number().int().optional(),
  sectionNo: z.coerce.number().int().optional(),
  gender: z.enum(VOTER_GENDERS).optional(),
  ageMin: z.coerce.number().int().optional(),
  ageMax: z.coerce.number().int().optional(),
  sortBy: z
    .enum(["name", "age", "voterIdNumber", "slNo", "createdAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type VoterListQuery = z.infer<typeof voterListQuerySchema>;
