import { z } from "zod";

export const createWardSchema = z.object({
    name: z.string().min(1, "Ward name is required"),
    population: z.number().int().min(0).default(0),
    areaType: z.string().min(1, "Area type is required"), // Urban, Rural, Semi-Urban
    areaName: z.string().min(1, "Area name is required"),
});

export const updateWardSchema = z.object({
    name: z.string().min(1).optional(),
    population: z.number().int().min(0).optional(),
    areaType: z.string().min(1).optional(),
    areaName: z.string().min(1).optional(),
});

export type CreateWardInput = z.infer<typeof createWardSchema>;
export type UpdateWardInput = z.infer<typeof updateWardSchema>;
