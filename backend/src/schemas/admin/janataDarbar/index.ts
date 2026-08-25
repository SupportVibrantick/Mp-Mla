import { z } from "zod";
import { JanataSessionType, JanataSessionStatus, JanataTokenStatus } from "@prisma/client";

function isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
  const start = parseInt(startTime.replace(":", ""), 10);
  const end = parseInt(endTime.replace(":", ""), 10);
  return end > start;
}

export const sessionBaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.nativeEnum(JanataSessionType),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:MM format"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:MM format"),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional().nullable(),
});

export const createSessionSchema = sessionBaseSchema.superRefine((data, ctx) => {
  if (!isEndTimeAfterStartTime(data.startTime, data.endTime)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End time must be after start time",
      path: ["endTime"],
    });
  }
});

export const updateSessionSchema = sessionBaseSchema.partial();

export const createTokenSchema = z.object({
  visitorName: z.string().min(1, "Visitor name is required"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  wardId: z.string().optional().nullable(),
});

export const referTokenSchema = z.object({
  assignedOfficerId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type CreateTokenInput = z.infer<typeof createTokenSchema>;
export type ReferTokenInput = z.infer<typeof referTokenSchema>;
