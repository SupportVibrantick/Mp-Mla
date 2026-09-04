import { z } from "zod";

const phoneValidation = z.preprocess(
  (val) => (val === "" ? null : val),
  z
    .string()
    .regex(/^\+?[0-9\s-]{10,15}$/, "Invalid phone number. Must contain 10-15 digits")
    .nullable()
    .optional()
);

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: phoneValidation,
  designation: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  avatarUrl: z
    .preprocess(
      (val) => (val === "" ? null : val),
      z
        .string()
        .url("Invalid avatar URL")
        .or(z.string().regex(/^data:image\//))
        .nullable()
        .optional(),
    ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
