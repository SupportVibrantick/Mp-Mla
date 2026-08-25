import { z } from "zod";
import { SchemeStatus, SchemeLevel, SchemeApplicationStatus } from "@prisma/client";

export const schemeBaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional().nullable(),
  department: z.string().min(1, "Department is required"),
  level: z.nativeEnum(SchemeLevel).default(SchemeLevel.STATE),
  description: z.string().optional().nullable(),
  eligibility: z.string().optional().nullable(),
  benefits: z.string().optional().nullable(),
  requiredDocuments: z.any().optional().nullable(),
  applicationUrl: z.string().url("Invalid application URL").optional().nullable().or(z.literal("")),
  status: z.nativeEnum(SchemeStatus).default(SchemeStatus.ACTIVE),
  startDate: z.string().or(z.date()).transform((val) => new Date(val)).optional().nullable(),
  endDate: z.string().or(z.date()).transform((val) => new Date(val)).optional().nullable(),
});

export const createSchemeSchema = schemeBaseSchema.superRefine((data, ctx) => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end.getTime() < start.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be greater than or equal to start date",
        path: ["endDate"],
      });
    }
  }
});

export const updateSchemeSchema = schemeBaseSchema.partial();

export const applicationBaseSchema = z.object({
  schemeId: z.string().min(1, "Scheme ID is required"),
  beneficiaryName: z.string().min(1, "Beneficiary name is required"),
  beneficiaryPhone: z.string().optional().nullable(),
  beneficiaryEmail: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  wardId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createApplicationSchema = applicationBaseSchema;
export const updateApplicationSchema = applicationBaseSchema.partial();

export const schemeApplicationStatusSchema = z.object({
  status: z.nativeEnum(SchemeApplicationStatus),
  notes: z.string().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
});

export const schemeApplicationAssignSchema = z.object({
  assignedToId: z.string().min(1, "Assignee User ID is required"),
});

export type CreateSchemeInput = z.infer<typeof createSchemeSchema>;
export type UpdateSchemeInput = z.infer<typeof updateSchemeSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type SchemeApplicationStatusInput = z.infer<typeof schemeApplicationStatusSchema>;
export type SchemeApplicationAssignInput = z.infer<typeof schemeApplicationAssignSchema>;
