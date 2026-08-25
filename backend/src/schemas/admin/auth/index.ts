import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
  tenantId: z.string().min(1).optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string(),
  phone: z.string().optional(),
  role: z
    .enum(["SYSTEM_ADMIN", "MP_MLA", "OFFICE_STAFF"])
    .default("OFFICE_STAFF"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string(),
});
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshSchema>;
