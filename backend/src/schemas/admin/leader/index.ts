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

const phoneValidation = z.preprocess(
  (val) => (val === "" ? null : val),
  z
    .string()
    .regex(/^\+?[0-9\s-]{10,15}$/, "Invalid phone number. Must contain 10-15 digits")
    .nullable()
    .optional()
);

export const createSchema = z.object({
  name: z.string().min(1, "Name required"),
  category: z.enum(LEADER_CATEGORIES),
  designation: z.string().optional().or(z.literal("")).transform((val) => val === "" ? undefined : val),
  organization: z.string().optional().or(z.literal("")).transform((val) => val === "" ? undefined : val),
  partyName: z.string().optional().or(z.literal("")).transform((val) => val === "" ? undefined : val),
  dateOfBirth: z.string().min(1, "Date of birth required"),
  gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")).transform((val) => val === "" ? undefined : val),
  photoUrl: z.string().optional().or(z.literal("")).transform((val) => val === "" ? undefined : val),
  address: z.string().optional().or(z.literal("")).transform((val) => val === "" ? undefined : val),
  wardId: z.string().optional().or(z.literal("")).transform((val) => val === "" ? undefined : val),
  phone: phoneValidation,
  altPhone: phoneValidation,
  email: z.string().email().optional().or(z.literal("")).transform((val) => val === "" ? undefined : val),
  whatsapp: phoneValidation,
  facebookUrl: z.string().optional().or(z.literal("")).transform((val) => val === "" ? undefined : val),
  twitterUrl: z.string().optional().or(z.literal("")).transform((val) => val === "" ? undefined : val),
  instagramUrl: z.string().optional().or(z.literal("")).transform((val) => val === "" ? undefined : val),
  adharNumber: z.string().optional().or(z.literal("")).transform((val) => val === "" ? undefined : val),
  relation: z
    .enum(["Supporter", "Neutral", "Alliance", "Opposition", "Other"])
    .optional()
    .or(z.literal(""))
    .transform((val) => val === "" ? undefined : val),
  // influence: z.enum(["High", "Medium", "Low"]).optional(),

  notes: z.string().optional().or(z.literal("")).transform((val) => val === "" ? undefined : val),
  tags: z.array(z.string()).optional(),
});

export const updateSchema = createSchema.partial();
export type createInput = z.infer<typeof createSchema>;
export type updateInput = z.infer<typeof updateSchema>;
