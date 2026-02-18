import { z } from "zod";

export const createUserSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().optional(),
    role: z.enum(["SYSTEM_ADMIN", "MP_MLA", "STAFF"]),
    isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    role: z.enum(["SYSTEM_ADMIN", "MP_MLA", "STAFF"]).optional(),
    isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
