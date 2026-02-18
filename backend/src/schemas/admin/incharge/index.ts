import { z } from "zod";

export const createInchargeSchema = z.object({
    institutionId: z.number().int().positive("Institution is required"),
    name: z.string().min(1, "Name is required"),
    designation: z.string().min(1, "Designation is required"),
    contactNo: z.string().optional(),
    dob: z.string().or(z.date()).optional().transform((val) => val ? new Date(val) : undefined),
});

export const updateInchargeSchema = z.object({
    institutionId: z.number().int().positive().optional(),
    name: z.string().min(1).optional(),
    designation: z.string().min(1).optional(),
    contactNo: z.string().optional(),
    dob: z.string().or(z.date()).optional().nullable().transform((val) => val ? new Date(val) : null),
});

export type CreateInchargeInput = z.infer<typeof createInchargeSchema>;
export type UpdateInchargeInput = z.infer<typeof updateInchargeSchema>;
