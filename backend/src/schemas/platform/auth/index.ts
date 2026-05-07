import { z } from "zod";

export const platformLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const platformRefreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token required"),
});

export const platformChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
});

export const platformUpdateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});
