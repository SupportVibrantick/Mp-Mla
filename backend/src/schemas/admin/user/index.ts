import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string(),
  phone: z.string().min(10).max(15).optional(),
  designation: z.string().max(100).optional(),
  departmentId: z.string().optional().nullable(),
  role: z.enum(["SYSTEM_ADMIN", "MLA_MP", "OFFICE_STAFF"], {
    errorMap: () => ({
      message: "Role must be SYSTEM_ADMIN, MLA_MP, or OFFICE_STAFF",
    }),
  }),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(15).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
  departmentId: z.string().optional().nullable(),
  role: z.enum(["SYSTEM_ADMIN", "MLA_MP", "OFFICE_STAFF"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
