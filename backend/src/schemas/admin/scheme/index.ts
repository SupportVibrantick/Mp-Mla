import { z } from "zod";

export const createSchemeSchema = z.object({
  name: z.string().min(1, "Name required"),
  department: z.string().min(1, "Department required"),
  level: z.enum(["Central", "State", "Local"]).default("Central"),
  description: z.string().optional(),
  eligibility: z.string().optional(),
  benefits: z.string().optional(),
  applicationUrl: z.string().url().optional().or(z.literal("")),
  budget: z.number().min(0).default(0),
  status: z
    .enum(["ACTIVE", "EXPIRED", "UPCOMING", "SUSPENDED"])
    .default("ACTIVE"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updateSchemeSchema = createSchemeSchema.partial();

export const beneficiarySchema = z.object({
  wardId: z.string().min(1, "Ward required"),
  beneficiaryCount: z.number().int().min(0).default(0),
  targetCount: z.number().int().min(0).default(0),
  amountDisbursed: z.number().min(0).default(0),
  reportDate: z.string().datetime().optional(),
});

export const bulkBeneficiarySchema = z.object({
  entries: z.array(beneficiarySchema),
});

export type CreateSchemeInput = z.infer<typeof createSchemeSchema>;
export type UpdateSchemeInput = z.infer<typeof updateSchemeSchema>;
export type bulkBeneficiaryInput = z.infer<typeof bulkBeneficiarySchema>;
export type beneficiaryInput = z.infer<typeof beneficiarySchema>;
