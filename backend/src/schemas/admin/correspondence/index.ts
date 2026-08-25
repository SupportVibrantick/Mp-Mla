import { z } from "zod";
import { CorrespondenceType, TaskPriority } from "@prisma/client";

export const createCorrespondenceSchema = z.object({
  type: z.nativeEnum(CorrespondenceType),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional().nullable(),
  senderName: z.string().optional().nullable(),
  senderPhone: z.string().optional().nullable(),
  senderEmail: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  senderAddress: z.string().optional().nullable(),
  dueDate: z.string().or(z.date()).transform((val) => new Date(val)).optional().nullable(),
  departmentId: z.string().optional().nullable(),
});

export const updateCorrespondenceSchema = z.object({
  subject: z.string().optional(),
  description: z.string().optional().nullable(),
  senderName: z.string().optional().nullable(),
  senderPhone: z.string().optional().nullable(),
  senderEmail: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  senderAddress: z.string().optional().nullable(),
  dueDate: z.string().or(z.date()).transform((val) => new Date(val)).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const assignCorrespondenceSchema = z.object({
  assignedToId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
});

export const replyCorrespondenceSchema = z.object({
  replyText: z.string().min(1, "Reply text is required"),
});

export const linkDocumentCorrespondenceSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export const createTaskCorrespondenceSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional().nullable(),
  dueDate: z.string().or(z.date()).transform((val) => new Date(val)).optional().nullable(),
  assignedToId: z.string().min(1, "Assigned officer is required"),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
});

export type CreateCorrespondenceInput = z.infer<typeof createCorrespondenceSchema>;
export type UpdateCorrespondenceInput = z.infer<typeof updateCorrespondenceSchema>;
export type AssignCorrespondenceInput = z.infer<typeof assignCorrespondenceSchema>;
export type ReplyCorrespondenceInput = z.infer<typeof replyCorrespondenceSchema>;
export type LinkDocumentCorrespondenceInput = z.infer<typeof linkDocumentCorrespondenceSchema>;
export type CreateTaskCorrespondenceInput = z.infer<typeof createTaskCorrespondenceSchema>;
