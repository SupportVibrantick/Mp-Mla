import { z } from "zod";

export const createInstitutionSchema = z.object({
    name: z.string().min(1, "Institution name is required"),
    category: z.enum([
        "TEMPLE", "HOSPITAL", "SCHOOL", "COLLEGE", "POLICE_STATION",
        "GOVT_OFFICE", "NGO", "GYM", "CLUB", "MARKET", "SLUM", "RWA",
        "SPORTS_TEAM", "OTHER",
    ]),
    address: z.string().min(1, "Address is required"),
    wardId: z.number().int().positive("Ward is required"),
    contactNo: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE", "CLOSED", "PROPOSED"]).default("ACTIVE"),
});

export const updateInstitutionSchema = z.object({
    name: z.string().min(1).optional(),
    category: z.enum([
        "TEMPLE", "HOSPITAL", "SCHOOL", "COLLEGE", "POLICE_STATION",
        "GOVT_OFFICE", "NGO", "GYM", "CLUB", "MARKET", "SLUM", "RWA",
        "SPORTS_TEAM", "OTHER",
    ]).optional(),
    address: z.string().min(1).optional(),
    wardId: z.number().int().positive().optional(),
    contactNo: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE", "CLOSED", "PROPOSED"]).optional(),
});

export type CreateInstitutionInput = z.infer<typeof createInstitutionSchema>;
export type UpdateInstitutionInput = z.infer<typeof updateInstitutionSchema>;
