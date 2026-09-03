import { z } from "zod";

export const createDemographicsSchema = z.object({
    wardId: z.number().int().positive("Ward is required"),
    communityGroup: z.string().min(1, "Community group is required"),
    totalPopulation: z.number().int().min(0).default(0),
    maleCount: z.number().int().min(0).default(0),
    femaleCount: z.number().int().min(0).default(0),
    age0to18: z.number().int().min(0).default(0),
    age19to35: z.number().int().min(0).default(0),
    age36to60: z.number().int().min(0).default(0),
    age60plus: z.number().int().min(0).default(0),
});

export const updateDemographicsSchema = z.object({
    wardId: z.number().int().positive().optional(),
    communityGroup: z.string().min(1).optional(),
    totalPopulation: z.number().int().min(0).optional(),
    maleCount: z.number().int().min(0).optional(),
    femaleCount: z.number().int().min(0).optional(),
    age0to18: z.number().int().min(0).optional(),
    age19to35: z.number().int().min(0).optional(),
    age36to60: z.number().int().min(0).optional(),
    age60plus: z.number().int().min(0).optional(),
});

export type CreateDemographicsInput = z.infer<typeof createDemographicsSchema>;
export type UpdateDemographicsInput = z.infer<typeof updateDemographicsSchema>;
