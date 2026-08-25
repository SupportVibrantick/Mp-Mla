import { z } from "zod";
import { DocumentCategory } from "@prisma/client";

export const createDocumentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  category: z.nativeEnum(DocumentCategory).default(DocumentCategory.GENERAL),
  fileName: z.string().min(1, "fileName is required"),
  fileUrl: z.string().min(1, "fileUrl is required"),
  fileType: z.string().optional().nullable(),
  fileSize: z.number().int().optional().nullable(),
});

export const updateDocumentSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  category: z.nativeEnum(DocumentCategory).optional(),
});

export const uploadVersionSchema = z.object({
  fileName: z.string().min(1, "fileName is required"),
  fileUrl: z.string().min(1, "fileUrl is required"),
  fileType: z.string().optional().nullable(),
  fileSize: z.number().int().optional().nullable(),
});

export const linkDocumentSchema = z.object({
  module: z.string().min(1, "Module is required"),
  recordId: z.string().min(1, "Record ID is required"),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type UploadVersionInput = z.infer<typeof uploadVersionSchema>;
export type LinkDocumentInput = z.infer<typeof linkDocumentSchema>;
