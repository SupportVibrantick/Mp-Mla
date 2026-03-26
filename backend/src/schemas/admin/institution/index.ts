import { z } from "zod";

const CATEGORIES = [
  "TEMPLE",
  "MOSQUE",
  "GURUDWARA",
  "CHURCH",
  "HOSPITAL",
  "CLINIC",
  "SCHOOL",
  "COLLEGE",
  "UNIVERSITY",
  "COACHING_CENTER",
  "POLICE_STATION",
  "FIRE_STATION",
  "LAW_OFFICE",
  "GOVT_OFFICE",
  "NGO",
  "GYM",
  "SPORTS_FACILITY",
  "COMMUNITY_HALL",
  "LIBRARY",
  "PUBLIC_LIBRARY",
  "BUS_STAND",
  "PARK",
  "MARKET",
  "RWA",
  "OLD_AGE_HOME",
  "STADIUM",
  "SKILL_DEVELOPMENT_CENTER",
  "CSC_CENTER",
  "OTHER",
] as const;

const STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "UNDER_MAINTENANCE",
  "CLOSED",
  "PROPOSED",
] as const;

const inchargeInlineSchema = z.object({
  name: z.string().min(1, "Incharge name required"),
  designation: z.string().min(1, "Designation required"),
  contactNo: z.string().min(1, "Contact number required"),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().datetime().optional(),
  appointedDate: z.string().datetime().optional(),
  photoUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const createInstitutionSchema = z.object({
  name: z.string().min(1, "Name is required").max(300),
  category: z.enum(CATEGORIES),
  subcategory: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  wardId: z.string().min(1, "Ward is required"),
  contactNo: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  status: z.enum(STATUSES).default("ACTIVE"),
  description: z.string().optional(),
  photoUrl: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
  establishedDate: z.string().datetime().optional(),
  // Inline incharges
  incharges: z.array(inchargeInlineSchema).optional(),
});
export const updateInstitutionSchema = createInstitutionSchema
  .omit({ incharges: true })
  .partial();

export const createInchargeSchema = z.object({
  name: z.string().min(1, "Name required"),
  designation: z.string().min(1, "Designation required"),
  contactNo: z.string().min(1, "Contact number required"),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().datetime().optional(),
  photoUrl: z.string().optional(),
  appointedDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

export const updateInchargeSchema = createInchargeSchema.partial();

export type CreateInstitutionInput = z.infer<typeof createInstitutionSchema>;
export type UpdateInstitutionInput = z.infer<typeof updateInstitutionSchema>;
export type inchargeInlineInput = z.infer<typeof inchargeInlineSchema>;
export type createInchargeInput = z.infer<typeof createInchargeSchema>;
export type updateInchargeInput = z.infer<typeof updateInchargeSchema>;
