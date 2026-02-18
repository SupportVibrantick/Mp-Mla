import { z } from "zod";

export const createSchemeSchema = z.object({
    name: z.string().min(1, "Scheme name is required"),
    department: z.string().min(1, "Department is required"),
    description: z.string().optional(),
    budget: z.number().min(0).default(0),
    status: z.enum(["ACTIVE", "INACTIVE", "UPCOMING", "EXPIRED"]).default("ACTIVE"),
    beneficiaryCount: z.number().int().min(0).default(0),
    startDate: z.string().or(z.date()).optional().transform((val) => val ? new Date(val) : undefined),
    endDate: z.string().or(z.date()).optional().transform((val) => val ? new Date(val) : undefined),
    wardIds: z.array(z.number().int().positive()).optional(), // Link to wards
});

export const updateSchemeSchema = z.object({
    name: z.string().min(1).optional(),
    department: z.string().min(1).optional(),
    description: z.string().optional(),
    budget: z.number().min(0).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "UPCOMING", "EXPIRED"]).optional(),
    beneficiaryCount: z.number().int().min(0).optional(),
    startDate: z.string().or(z.date()).optional().nullable().transform((val) => val ? new Date(val) : null),
    endDate: z.string().or(z.date()).optional().nullable().transform((val) => val ? new Date(val) : null),
    wardIds: z.array(z.number().int().positive()).optional(),
});

export type CreateSchemeInput = z.infer<typeof createSchemeSchema>;
export type UpdateSchemeInput = z.infer<typeof updateSchemeSchema>;
