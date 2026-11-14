import { z } from "zod";

const phoneValidation = z.preprocess(
  (val) => (val === "" ? null : val),
  z
    .string()
    .regex(/^\+?[0-9\s-]{10,15}$/, "Invalid phone number. Must contain 10-15 digits")
    .nullable()
    .optional()
);

export const createVolunteerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: phoneValidation,
  password: z.string().min(6, "Password must be at least 6 characters"),
  designation: z.string().max(100).optional().nullable(),
  wardIds: z.array(z.string()).optional().default([]),
  notes: z.string().max(500).optional().nullable(),
});

export const updateVolunteerSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: phoneValidation,
  designation: z.string().max(100).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  password: z.string().min(6).optional(),
});

export const assignWardsSchema = z.object({
  wardIds: z.array(z.string()).min(1, "At least one wardId must be provided"),
  notes: z.string().max(500).optional().nullable(),
});

export const familyMemberInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  relationType: z
    .enum([
      "FATHER",
      "MOTHER",
      "SPOUSE",
      "SON",
      "DAUGHTER",
      "BROTHER",
      "SISTER",
      "GRANDFATHER",
      "GRANDMOTHER",
      "GRANDSON",
      "GRANDDAUGHTER",
      "UNCLE",
      "AUNT",
      "NEPHEW",
      "NIECE",
      "DEPENDENT",
      "OTHER",
    ])
    .default("OTHER"),
  relationCustom: z.string().max(50).optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "TRANSGENDER"]).default("MALE"),
  age: z.number().int().min(1).max(130).optional().nullable(),
  phone: phoneValidation,
  voterIdNumber: z.string().max(50).optional().nullable(),
  bloodGroup: z.string().max(10).optional().nullable(),
  occupationTitle: z.string().max(100).optional().nullable(),
  isDependent: z.boolean().optional().default(false),
  isEmergencyContact: z.boolean().optional().default(false),
  sameAddress: z.boolean().optional().default(true),
  address: z.string().max(255).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

export const volunteerVoterEntrySchema = z.object({
  wardId: z.string().min(1, "Ward is required"),
  wardAreaId: z.string().optional().nullable(),
  voterIdNumber: z.string().min(1, "EPIC/Voter ID is required").max(50),
  slNo: z.number().int().positive().optional().nullable(),
  sectionNo: z.number().int().positive().optional().nullable(),
  boothNo: z.number().int().positive().optional().nullable(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  relativeName: z.string().max(100).optional().nullable(),
  relationType: z.string().max(20).optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "TRANSGENDER", "OTHER"]),
  age: z.number().int().min(18).max(130).optional().nullable(),
  houseNo: z.string().max(50).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  locality: z.string().max(100).optional().nullable(),
  phone: phoneValidation,
  bloodGroup: z.string().max(10).optional().nullable(),
  isDisabled: z.boolean().optional().default(false),
  isOurVoter: z.boolean().optional().default(false),
  voterLeaning: z
    .enum(["OUR_VOTER", "SUPPORTER", "NEUTRAL", "OPPOSITION", "INFLUENCER", "UNKNOWN"])
    .optional()
    .default("UNKNOWN"),
  voterCadreNotes: z.string().max(1000).optional().nullable(),
  submissionNotes: z.string().max(500).optional().nullable(),
  familyMembers: z.array(familyMemberInputSchema).optional().default([]),
});

export type CreateVolunteerInput = z.infer<typeof createVolunteerSchema>;
export type UpdateVolunteerInput = z.infer<typeof updateVolunteerSchema>;
export type AssignWardsInput = z.infer<typeof assignWardsSchema>;
export type VolunteerVoterEntryInput = z.infer<typeof volunteerVoterEntrySchema>;
