import { z } from "zod";
import { EventType, EventStatus, EventMode, EventMediaType } from "@prisma/client";

export const eventBaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  type: z.nativeEnum(EventType),
  status: z.nativeEnum(EventStatus).default(EventStatus.DRAFT),
  mode: z.nativeEnum(EventMode).default(EventMode.OFFLINE),
  startDate: z.string().or(z.date()).transform((val) => new Date(val)),
  endDate: z.string().or(z.date()).transform((val) => new Date(val)).optional().nullable(),
  location: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  meetingLink: z.string().optional().nullable().or(z.literal("")),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  wardId: z.string().optional().nullable(),
  organizerId: z.string().optional().nullable(),
});

export const createEventSchema = eventBaseSchema.superRefine((data, ctx) => {
  if (data.endDate && data.endDate.getTime() < data.startDate.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be greater than or equal to start date",
      path: ["endDate"],
    });
  }

  if (data.mode === EventMode.OFFLINE || data.mode === EventMode.HYBRID) {
    if (!data.location && !data.address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Location or Address is required for Offline/Hybrid events",
        path: ["location"],
      });
    }
  }

  if (data.mode === EventMode.ONLINE || data.mode === EventMode.HYBRID) {
    if (!data.meetingLink) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Meeting Link is required for Online/Hybrid events",
        path: ["meetingLink"],
      });
    }
  }
});

export const updateEventSchema = eventBaseSchema
  .omit({ status: true }) // status updates must use the workflow status API
  .partial();

export const eventStatusSchema = z.object({
  status: z.nativeEnum(EventStatus),
  comment: z.string().optional().nullable(),
});

export const eventTeamSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.string().optional().nullable(),
});

export const eventAgendaSchema = z.object({
  title: z.string().min(1, "Agenda title is required"),
  description: z.string().optional().nullable(),
  orderIndex: z.number().default(0),
  startTime: z.string().or(z.date()).transform((val) => new Date(val)).optional().nullable(),
  endTime: z.string().or(z.date()).transform((val) => new Date(val)).optional().nullable(),
});

export const eventGuestSchema = z.object({
  name: z.string().min(1, "Guest name is required"),
  designation: z.string().optional().nullable(),
  organization: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  invitationStatus: z.string().optional().nullable(),
  attendanceStatus: z.string().optional().nullable(),
  isVip: z.boolean().optional().default(false),
});

export const eventAttendanceSchema = z.object({
  name: z.string().min(1, "Attendee name is required"),
  phone: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
});

export const eventMediaSchema = z.object({
  type: z.nativeEnum(EventMediaType),
  fileUrl: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileType: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  caption: z.string().optional().nullable(),
});

export const eventReportSchema = z.object({
  summary: z.string().optional().nullable(),
  highlights: z.string().optional().nullable(),
  issues: z.string().optional().nullable(),
  decisions: z.string().optional().nullable(),
  outcomes: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  attendanceCount: z.number().default(0),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventStatusInput = z.infer<typeof eventStatusSchema>;
export type EventTeamInput = z.infer<typeof eventTeamSchema>;
export type EventAgendaInput = z.infer<typeof eventAgendaSchema>;
export type EventGuestInput = z.infer<typeof eventGuestSchema>;
export type EventAttendanceInput = z.infer<typeof eventAttendanceSchema>;
export type EventMediaInput = z.infer<typeof eventMediaSchema>;
export type EventReportInput = z.infer<typeof eventReportSchema>;
