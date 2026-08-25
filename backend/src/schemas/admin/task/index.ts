import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  assignedToId: z.string().min(1, "Assigned user is required"),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  dueDate: z
    .string()
    .transform((val) => (val ? new Date(val) : null))
    .or(z.date())
    .refine((date) => {
      if (!date) return true;
      // Allow today/future (clear time for basic day comparison)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date.getTime() >= today.getTime();
    }, { message: "Due date cannot be in the past" })
    .optional()
    .nullable(),
  grievanceId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema
  .omit({ status: true }) // enforce status change via status route
  .partial();

export const statusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  comment: z.string().optional().nullable(),
});

export const assignSchema = z.object({
  assignedToId: z.string().min(1, "Assigned user is required"),
  comment: z.string().optional().nullable(),
});

export const bulkAssignSchema = z.object({
  taskIds: z.array(z.string()).min(1, "At least one task ID required"),
  assignedToId: z.string().min(1, "Assigned user is required"),
  comment: z.string().optional().nullable(),
});

export const bulkStatusSchema = z.object({
  taskIds: z.array(z.string()).min(1, "At least one task ID required"),
  status: z.nativeEnum(TaskStatus),
  comment: z.string().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type StatusInput = z.infer<typeof statusSchema>;
export type AssignInput = z.infer<typeof assignSchema>;
export type BulkAssignInput = z.infer<typeof bulkAssignSchema>;
export type BulkStatusInput = z.infer<typeof bulkStatusSchema>;
