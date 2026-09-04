import { z } from "zod";
import { ContactCategory, InteractionChannel, FollowUpStatus } from "@prisma/client";

const phoneValidation = z.preprocess(
  (val) => (val === "" ? null : val),
  z
    .string()
    .regex(/^\+?[0-9\s-]{10,15}$/, "Invalid phone number. Must contain 10-15 digits")
    .nullable()
    .optional()
);

export const contactBaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: phoneValidation,
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  wardId: z.string().optional().nullable(),
  category: z.nativeEnum(ContactCategory).default(ContactCategory.CITIZEN),
  relationship: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  importantNotes: z.string().optional().nullable(),
});

export const createContactSchema = contactBaseSchema;
export const updateContactSchema = contactBaseSchema.partial();

export const createInteractionSchema = z.object({
  channel: z.nativeEnum(InteractionChannel),
  date: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  summary: z.string().min(1, "Summary is required"),
  details: z.string().optional().nullable(),
  grievanceId: z.string().optional().nullable(),
  appointmentId: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
  janataSessionId: z.string().optional().nullable(),
  janataTokenId: z.string().optional().nullable(),
  schemeApplicationId: z.string().optional().nullable(),
  taskId: z.string().optional().nullable(),
});

export const createFollowUpSchema = z.object({
  followUpDate: z.string().or(z.date()).transform((val) => new Date(val)),
  assignedToId: z.string().optional().nullable(),
  purpose: z.string().min(1, "Purpose is required"),
  notes: z.string().optional().nullable(),
});

export const updateFollowUpSchema = z.object({
  followUpDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  assignedToId: z.string().optional().nullable(),
  purpose: z.string().optional(),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(FollowUpStatus).optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
