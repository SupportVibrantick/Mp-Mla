import { z } from "zod";

export const createProjectSchema = z.object({
    name: z.string().min(1, "Project name is required"),
    category: z.string().min(1, "Category is required"),
    department: z.string().min(1, "Department is required"),
    contractor: z.string().optional(),
    wardId: z.number().int().positive("Ward is required"),
    startDate: z.string().or(z.date()).transform((val) => new Date(val)),
    endDate: z.string().or(z.date()).optional().transform((val) => val ? new Date(val) : undefined),
    budgetReleased: z.number().min(0).default(0),
    budgetSanctioned: z.number().min(0).default(0),
    budgetUsed: z.number().min(0).default(0),
    status: z.enum(["COMPLETED", "RUNNING", "PENDING"]).default("PENDING"),
    description: z.string().optional(),
});

export const updateProjectSchema = z.object({
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    department: z.string().min(1).optional(),
    contractor: z.string().optional(),
    wardId: z.number().int().positive().optional(),
    startDate: z.string().or(z.date()).optional().transform((val) => val ? new Date(val) : undefined),
    endDate: z.string().or(z.date()).optional().nullable().transform((val) => val ? new Date(val) : null),
    budgetReleased: z.number().min(0).optional(),
    budgetSanctioned: z.number().min(0).optional(),
    budgetUsed: z.number().min(0).optional(),
    status: z.enum(["COMPLETED", "RUNNING", "PENDING"]).optional(),
    description: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
