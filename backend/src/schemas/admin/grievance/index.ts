import { z } from "zod";

export const createGrievanceSchema = z.object({
  subject: z.string().min(1, "Subject required").max(500),
  category: z.string().min(1, "Category required"),
  subcategory: z.string().optional(),
  description: z.string().min(1, "Description required"),
  wardId: z.string().min(1, "Ward required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  source: z
    .enum(["OFFICE", "PHONE", "EMAIL", "ONLINE", "FIELD_VISIT", "SOCIAL_MEDIA"])
    .default("OFFICE"),
  complainantName: z.string().optional().or(z.literal("")),
  complainantPhone: z.string().optional().or(z.literal("")),
  complainantEmail: z.string().email().optional().or(z.literal("")),
  complainantAddress: z.string().optional(),
  locationAddress: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  assignedDept: z.string().optional(),
  assignedToId: z.string().optional(),
  expectedResolutionDate: z.string().datetime().optional(),
});

export const timelineSchema = z.object({
  action: z.enum(["COMMENT", "INTERNAL_NOTE", "FOLLOW_UP", "FIELD_VISIT"]),
  comment: z.string().min(1, "Comment required"),
});

export const updateGrievanceSchema = z
  .object({
    subject: z.string().min(1).optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    description: z.string().optional(),
    wardId: z.string().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    source: z.string().optional(),
    complainantName: z.string().optional(),
    complainantPhone: z.string().optional(),
    complainantEmail: z.string().optional(),
    complainantAddress: z.string().optional(),
    locationAddress: z.string().optional(),
    expectedResolutionDate: z.string().datetime().optional(),
    assignedDept: z.string().optional().nullable(),
    assignedToId: z.string().optional().nullable(),
  })
  .partial();

export const changeStatusSchema = z.object({
  status: z.enum([
    "OPEN",
    "IN_PROGRESS",
    "ESCALATED",
    "RESOLVED",
    "CLOSED",
    "REJECTED",
  ]),
  comment: z.string().optional(),
  resolutionNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  escalationReason: z.string().optional(),
  satisfactionRating: z.number().int().min(1).max(5).optional(),
});

export const assignSchema = z.object({
  assignedToId: z.string().optional().nullable(),
  assignedDept: z.string().optional().nullable(),
  comment: z.string().optional(),
});

export type CreateGrievanceInput = z.infer<typeof createGrievanceSchema>;
export type UpdateGrievanceInput = z.infer<typeof updateGrievanceSchema>;
export type timelineInput = z.infer<typeof timelineSchema>;
export type changeStatusInput = z.infer<typeof changeStatusSchema>;
export type assignInput = z.infer<typeof assignSchema>;
