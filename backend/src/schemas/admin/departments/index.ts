import { z } from "zod";
export const createSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  code: z.string().min(1, "Code required").max(20),
  description: z.string().optional(),
  headName: z.string().optional(),
  headPhone: z.string().optional(),
  headEmail: z.string().email().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const updateSchema = createSchema.partial();

export const departmentSlaEntrySchema = z.object({
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  slaHours: z.number().int().positive(),
  isActive: z.boolean().optional(),
});

export const upsertDepartmentSlasSchema = z.object({
  slas: z.array(departmentSlaEntrySchema).min(1),
});

export type createInput = z.infer<typeof createSchema>;
export type updateInput = z.infer<typeof updateSchema>;
export type DepartmentSlaEntryInput = z.infer<typeof departmentSlaEntrySchema>;
