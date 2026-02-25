import { z } from "zod";

const COMMUNITY_TYPES = [
  "MARKET",
  "SLUM",
  "SPORTS_TEAM",
  "CLUB",
  "RWA",
  "SENIOR_CITIZEN",
  "BUDDHIJEEVI",
  "WOMEN_GROUP",
  "YOUTH_GROUP",
  "CULTURAL_ORG",
  "NGO",
  "FESTIVAL_COMMITTEE",
  "TRADE_UNION",
  "OTHER",
] as const;

export const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(COMMUNITY_TYPES),
  wardId: z.string().min(1, "Ward is required"),
  wardAreaId: z.string().optional().nullable(),
  address: z.string().optional(),
  description: z.string().optional(),
  memberCount: z.number().int().min(0).default(0),
  maleMembers: z.number().int().min(0).default(0),
  femaleMembers: z.number().int().min(0).default(0),
  headName: z.string().optional(),
  headPhone: z.string().optional(),
  headEmail: z.string().email().optional().or(z.literal("")),
  headDesignation: z.string().optional(),
  headPhotoUrl: z.string().optional(),
  foundedDate: z.string().datetime().optional(),
  registrationNo: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateSchema = createSchema.partial();

export type createInput = z.infer<typeof createSchema>;
export type updateInput = z.infer<typeof updateSchema>;
