import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name required"),
  category: z.string().min(1, "Category required"),
  department: z.string().min(1, "Department required"),
  wardId: z.string().min(1, "Ward required"),
  contractor: z.string().optional(),
  contractorPhone: z.string().optional(),
  startDate: z.string().datetime().optional(),
  expectedEndDate: z.string().datetime().optional(),
  budgetSanctioned: z.number().min(0).default(0),
  budgetReleased: z.number().min(0).default(0),
  budgetUsed: z.number().min(0).default(0),
  fundType: z
    .enum(["MPLAD", "MLALAD", "STATE_FUND", "CENTRAL_FUND", "CSR", "OTHER"])
    .default("OTHER"),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        targetDate: z.string().datetime().optional(),
      }),
    )
    .optional(),
});

export const updateEntrySchema = z.object({
  updateText: z.string().min(1, "Update text required"),
  photoUrl: z.string().optional(),
});
export const milestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional(),
});

export const statusSchema = z.object({
  status: z.enum(["PENDING", "RUNNING", "COMPLETED", "ON_HOLD", "CANCELLED"]),
  completionPercent: z.number().int().min(0).max(100).optional(),
  actualEndDate: z.string().datetime().optional(),
});
export const updateProjectSchema = createProjectSchema
  .omit({ milestones: true })
  .partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type milestoneInput = z.infer<typeof milestoneSchema>;
export type updateEntryInput = z.infer<typeof updateEntrySchema>;
export type statusInput = z.infer<typeof statusSchema>;
