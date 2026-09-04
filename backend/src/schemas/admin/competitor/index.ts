import { z } from "zod";

// ─── Competitor CRUD Schemas ─────────────────────────────

const phoneValidation = z.preprocess(
  (val) => (val === "" ? null : val),
  z
    .string()
    .regex(/^\+?[0-9\s-]{10,15}$/, "Invalid phone number. Must contain 10-15 digits")
    .nullable()
    .optional()
);

export const createCompetitorSchema = z.object({
  candidateName: z.string().min(2, "Candidate name is required"),
  partyName: z.string().min(1, "Party name is required"),
  candidatePhoto: z.string().url().optional().or(z.literal("")),
  partyLogoUrl: z.string().url().optional().or(z.literal("")),
  designation: z.string().optional(),
  constituency: z.string().optional(),
  phone: phoneValidation,
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  facebookUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  instagramUrl: z.string().url().optional().or(z.literal("")),
  youtubeUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateCompetitorSchema = createCompetitorSchema.partial();

// ─── Metric Entry Schemas ────────────────────────────────

const METRIC_CATEGORIES = [
  "VOTER_OUTREACH",
  "GROUND_NETWORK",
  "ISSUE_RESOLUTION",
  "PUBLIC_SENTIMENT",
  "DIGITAL_PRESENCE",
  "EVENTS_ACTIVITIES",
  "FINANCIAL_DEVELOPMENT",
] as const;

const metricEntryItem = z.object({
  category: z.enum(METRIC_CATEGORIES, {
    errorMap: () => ({ message: "Invalid metric category" }),
  }),
  metricKey: z.string().min(1, "Metric key is required"),
  metricLabel: z.string().min(1, "Metric label is required"),
  value: z.coerce.number({ invalid_type_error: "Value must be a number" }).min(0, "Value cannot be negative"),
  unit: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

export const submitMetricsSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM format"),
  metrics: z
    .array(metricEntryItem)
    .min(1, "At least one metric is required"),
});

// ─── Own Metric Entry Schemas ────────────────────────────

const ownMetricItem = z.object({
  category: z.enum(METRIC_CATEGORIES, {
    errorMap: () => ({ message: "Invalid metric category" }),
  }),
  metricKey: z.string().min(1, "Metric key is required"),
  metricLabel: z.string().min(1, "Metric label is required"),
  value: z.coerce.number({ invalid_type_error: "Value must be a number" }).min(0, "Value cannot be negative"),
  unit: z.string().optional(),
  notes: z.string().optional(),
});

export const submitOwnMetricsSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM format"),
  metrics: z
    .array(ownMetricItem)
    .min(1, "At least one metric is required"),
});

// ─── Analysis & Chat Schemas ─────────────────────────────

export const triggerAnalysisSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM format")
    .optional(),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000, "Message too long"),
});

export type CreateCompetitorInput = z.infer<typeof createCompetitorSchema>;
export type UpdateCompetitorInput = z.infer<typeof updateCompetitorSchema>;
export type SubmitMetricsInput = z.infer<typeof submitMetricsSchema>;
export type SubmitOwnMetricsInput = z.infer<typeof submitOwnMetricsSchema>;
export type TriggerAnalysisInput = z.infer<typeof triggerAnalysisSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
