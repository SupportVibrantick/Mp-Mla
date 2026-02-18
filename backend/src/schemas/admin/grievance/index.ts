import { z } from "zod";

export const createGrievanceSchema = z.object({
    category: z.string().min(1, "Category is required"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    wardId: z.number().int().positive("Ward is required"),
    assignedDept: z.string().optional(),
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).default("OPEN"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export const updateGrievanceSchema = z.object({
    category: z.string().min(1).optional(),
    description: z.string().min(10).optional(),
    wardId: z.number().int().positive().optional(),
    assignedDept: z.string().optional(),
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    resolution: z.string().optional(),
});

export type CreateGrievanceInput = z.infer<typeof createGrievanceSchema>;
export type UpdateGrievanceInput = z.infer<typeof updateGrievanceSchema>;
