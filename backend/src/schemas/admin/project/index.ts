import { z } from "zod";
import { ProjectStatus, FundType } from "@prisma/client";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name required"),
  category: z.string().min(1, "Category required"),
  departmentId: z.string().optional().nullable(),
  wardId: z.string().min(1, "Ward required"),
  contractor: z.string().optional().nullable(),
  contractorPhone: z.string().optional().nullable(),
  startDate: z
    .string()
    .transform((val) => (val ? new Date(val) : null))
    .or(z.date())
    .optional()
    .nullable(),
  expectedEndDate: z
    .string()
    .transform((val) => (val ? new Date(val) : null))
    .or(z.date())
    .optional()
    .nullable(),
  budgetSanctioned: z.number().min(0).default(0),
  budgetReleased: z.number().min(0).default(0),
  budgetUsed: z.number().min(0).default(0),
  fundType: z.nativeEnum(FundType).default(FundType.OTHER),
  description: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional().nullable(),
        targetDate: z
          .string()
          .transform((val) => (val ? new Date(val) : null))
          .or(z.date())
          .optional()
          .nullable(),
      })
    )
    .optional(),
});

export const updateProjectSchema = createProjectSchema
  .omit({ milestones: true })
  .extend({
    completionPercent: z.number().int().min(0).max(100).optional(),
  })
  .partial();

export const updateEntrySchema = z.object({
  updateText: z.string().min(1, "Update text required"),
  photoUrl: z.string().optional().nullable(),
});

export const milestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  targetDate: z
    .string()
    .transform((val) => (val ? new Date(val) : null))
    .or(z.date())
    .optional()
    .nullable(),
});

export const statusSchema = z.object({
  status: z.nativeEnum(ProjectStatus),
  comment: z.string().optional(),
  completionPercent: z.number().int().min(0).max(100).optional(),
  actualEndDate: z
    .string()
    .transform((val) => (val ? new Date(val) : null))
    .or(z.date())
    .optional()
    .nullable(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type milestoneInput = z.infer<typeof milestoneSchema>;
export type updateEntryInput = z.infer<typeof updateEntrySchema>;
export type statusInput = z.infer<typeof statusSchema>;
export type ProjectAttachmentClassification =
  | "SANCTION_DOCUMENT"
  | "WORK_ORDER"
  | "ESTIMATE"
  | "BEFORE_PHOTO"
  | "PROGRESS_PHOTO"
  | "AFTER_PHOTO"
  | "BILL"
  | "COMPLETION_CERTIFICATE"
  | "OTHER";
