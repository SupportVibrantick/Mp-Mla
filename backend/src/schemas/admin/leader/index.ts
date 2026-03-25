import { z } from "zod";

const LEADER_CATEGORIES = [
  "PARTY_LEADER",
  "OPPOSITION_LEADER",
  "BUREAUCRAT",
  "COMMUNITY_LEADER",
  "RELIGIOUS_LEADER",
  "BUSINESS_LEADER",
  "MEDIA_PERSON",
  "YOUTH_LEADER",
  "WOMEN_LEADER",
  "SENIOR_CITIZEN",
  "ACADEMIC",
  "LEGAL",
  "MEDICAL",
  "NGO_HEAD",
  "TRADE_UNION",
  "OTHER",
] as const;

export const createSchema = z.object({
  name: z.string().min(1, "Name required"),
  category: z.enum(LEADER_CATEGORIES),
  designation: z.string().optional(),
  organization: z.string().optional(),
  partyName: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth required"),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  photoUrl: z.string().optional(),
  address: z.string().optional(),
  wardId: z.string().optional(),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  whatsapp: z.string().optional(),
  facebookUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  relation: z
    .enum(["Supporter", "Neutral", "Alliance", "Opposition", "Other"])
    .optional(),
  // influence: z.enum(["High", "Medium", "Low"]).optional(),

  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateSchema = createSchema.partial();
export type createInput = z.infer<typeof createSchema>;
export type updateInput = z.infer<typeof updateSchema>;
