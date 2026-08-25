import { z } from "zod";
import { AppointmentType, AppointmentStatus } from "@prisma/client";

function isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
  const start = parseInt(startTime.replace(":", ""), 10);
  const end = parseInt(endTime.replace(":", ""), 10);
  return end > start;
}

export const appointmentBaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.nativeEnum(AppointmentType),
  requesterName: z.string().min(1, "Requester name is required"),
  requesterPhone: z.string().optional().nullable(),
  requesterEmail: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:MM format"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:MM format"),
  location: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createAppointmentSchema = appointmentBaseSchema.superRefine((data, ctx) => {
  if (!isEndTimeAfterStartTime(data.startTime, data.endTime)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End time must be after start time",
      path: ["endTime"],
    });
  }
});

export const updateAppointmentSchema = appointmentBaseSchema
  .partial();

export const approveAppointmentSchema = z.object({
  comment: z.string().optional().nullable(),
});

export const rejectAppointmentSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

export const rescheduleAppointmentSchema = z.object({
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:MM format"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:MM format"),
}).superRefine((data, ctx) => {
  if (!isEndTimeAfterStartTime(data.startTime, data.endTime)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End time must be after start time",
      path: ["endTime"],
    });
  }
});

export const completeAppointmentSchema = z.object({
  notes: z.string().optional().nullable(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required"),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type ApproveAppointmentInput = z.infer<typeof approveAppointmentSchema>;
export type RejectAppointmentInput = z.infer<typeof rejectAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type CompleteAppointmentInput = z.infer<typeof completeAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
