import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";
import catchAsync from "../../../utils/catchAsync.js";
import ApiResponse from "../../../utils/ApiResponse.js";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  phone: z.string().min(10).max(15).optional(),
  role: z.enum(["SYSTEM_ADMIN", "MLA_MP", "OFFICE_STAFF"], {
    errorMap: () => ({
      message: "Role must be SYSTEM_ADMIN, MLA_MP, or OFFICE_STAFF",
    }),
  }),
});

/**
 * POST /api/admin/users
 * Admin creates a new user (MLA, Staff, or another Admin)a
 * This replaces the old /register route.
 */

export const createUser = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password, phone, role } = req.body;

  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict("User with this email already exists.");
  }

  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }

  // Check duplicate phone if provided
  if (phone) {
    const phoneExists = await prisma.user.findUnique({ where: { phone } });
    if (phoneExists) {
      throw ApiError.conflict("User with this phone number already exists.");
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  //  Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      role,
      status: "ACTIVE",
      forcePasswordChange: true, // Must change on first login
      createdById: req.user!.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      forcePasswordChange: true,
      createdAt: true,
    },
  });

  //  Audit log (non-blocking)
  await createAuditLog({
    userId: req.user!.id,
    action: "CREATE",
    module: "users",
    recordId: user.id,
    description: `Admin ${req.user!.name} created user ${email} with role ${role}`,
    newData: { name, email, role, phone },
    ...getRequestMeta(req),
  });

  //  Standard response
  res
    .status(201)
    .json(ApiResponse.created(user, `User ${email} created successfully`));
});
