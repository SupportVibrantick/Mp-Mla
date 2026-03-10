import { demographicsZodSchema } from "@/routes/admin/ward/helpers";
import { z } from "zod";



export const updateWardSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    zone: z.string().max(10).optional().nullable(),
    status: z
        .enum(["ACTIVE", "INACTIVE", "PROPOSED", "MERGED", "DELIMITATION_PENDING"])
        .optional(),
    areaType: z.string().optional(),
    pincode: z.string().max(10).optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    description: z.string().optional().nullable(),
    establishedDate: z.string().datetime().optional().nullable(),
});

export const createAreaSchema = z.object({
    name: z.string().min(1),
    areaType: z
        .enum([
            "RESIDENTIAL",
            "COMMERCIAL",
            "INDUSTRIAL",
            "MIXED_USE",
            "AGRICULTURAL",
            "INSTITUTIONAL",
            "SLUM",
            "CANTONMENT",
            "OTHER",
        ])
        .default("RESIDENTIAL"),
    population: z.number().int().min(0).default(0),
    households: z.number().int().min(0).default(0),
    maleCount: z.number().int().min(0).default(0),
    femaleCount: z.number().int().min(0).default(0),
    pincode: z.string().optional(),
    landmark: z.string().optional(),
    description: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    // Optional detailed demographics for this area
    demographics: demographicsZodSchema,
});

export const updateAreaSchema = createAreaSchema.partial();


export const createCouncillorSchema = z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    partyName: z.string().optional(),
    photoUrl: z.string().optional(),
    address: z.string().optional(),
    designation: z.string().default("Ward Councillor"),
    sinceDate: z.string().datetime().optional(),
});

export const updateCouncillorSchema = createCouncillorSchema.partial().extend({
    isCurrent: z.boolean().optional(),
    untilDate: z.string().datetime().optional().nullable(),
});



export const createWardSchema = z.object({
    wardNumber: z.number().int().positive("Ward number must be positive"),
    name: z.string().min(1, "Name is required").max(200),
    zone: z.string().max(10).optional(),
    status: z
        .enum(["ACTIVE", "INACTIVE", "PROPOSED", "MERGED", "DELIMITATION_PENDING"])
        .optional(),
    areaType: z.string().default("Urban"),
    pincode: z.string().max(10).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    description: z.string().optional(),
    establishedDate: z.string().datetime().optional(),

    areas: z
        .array(
            z.object({
                name: z.string().min(1),
                areaType: z
                    .enum([
                        "RESIDENTIAL",
                        "COMMERCIAL",
                        "INDUSTRIAL",
                        "MIXED_USE",
                        "AGRICULTURAL",
                        "INSTITUTIONAL",
                        "SLUM",
                        "CANTONMENT",
                        "OTHER",
                    ])
                    .default("RESIDENTIAL"),
                population: z.number().int().min(0).default(0),
                households: z.number().int().min(0).default(0),
                maleCount: z.number().int().min(0).default(0),
                femaleCount: z.number().int().min(0).default(0),
                pincode: z.string().optional(),
                landmark: z.string().optional(),
                description: z.string().optional(),
                demographics: demographicsZodSchema,
            }),
        )
        .optional(),

    councillor: z
        .object({
            name: z.string().min(1),
            phone: z.string().optional(),
            email: z.string().email().optional(),
            partyName: z.string().optional(),
            designation: z.string().optional(),
            sinceDate: z.string().datetime().optional(),
        })
        .optional(),

    demographics: demographicsZodSchema,
});


export const wardDemographicsSchema = z.object({
    wardAreaId: z.string().optional().nullable(),
    totalPopulation: z.number().int().min(0).optional(),
    maleCount: z.number().int().min(0).optional(),
    femaleCount: z.number().int().min(0).optional(),
    transgenderCount: z.number().int().min(0).optional(),
    age0to6: z.number().int().min(0).optional(),
    age7to18: z.number().int().min(0).optional(),
    age19to35: z.number().int().min(0).optional(),
    age36to60: z.number().int().min(0).optional(),
    age60plus: z.number().int().min(0).optional(),
    totalHouseholds: z.number().int().min(0).optional(),
    bplHouseholds: z.number().int().min(0).optional(),
    aplHouseholds: z.number().int().min(0).optional(),
    generalCount: z.number().int().min(0).optional(),
    obcCount: z.number().int().min(0).optional(),
    scCount: z.number().int().min(0).optional(),
    stCount: z.number().int().min(0).optional(),
    minorityCount: z.number().int().min(0).optional(),
    otherCount: z.number().int().min(0).optional(),
    hinduCount: z.number().int().min(0).optional(),
    muslimCount: z.number().int().min(0).optional(),
    sikhCount: z.number().int().min(0).optional(),
    christianCount: z.number().int().min(0).optional(),
    buddhistCount: z.number().int().min(0).optional(),
    jainCount: z.number().int().min(0).optional(),
    otherReligionCount: z.number().int().min(0).optional(),
    literacyRate: z.number().min(0).max(100).optional(),
    maleLiteracyRate: z.number().min(0).max(100).optional(),
    femaleLiteracyRate: z.number().min(0).max(100).optional(),
    totalVoters: z.number().int().min(0).optional(),
    maleVoters: z.number().int().min(0).optional(),
    femaleVoters: z.number().int().min(0).optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
    surveyDate: z.string().datetime().optional(),
});


export type CreateWardInput = z.infer<typeof createWardSchema>;
export const bulkCreateWardsSchema = z.array(createWardSchema);

export type UpdateWardInput = z.infer<typeof updateWardSchema>;
export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
export type CreateCouncillorInput = z.infer<typeof createCouncillorSchema>;
export type UpdateCouncillorInput = z.infer<typeof updateCouncillorSchema>;
export type WardDemographicsInput = z.infer<typeof wardDemographicsSchema>;
