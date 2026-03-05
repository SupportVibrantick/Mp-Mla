import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import catchAsync from "../../../utils/catchAsync.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { env } from "@/lib/env.js";
import { validatePasswordComplexity } from "../../../lib/authUtils.js";

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

  // Validate complexity
  await validatePasswordComplexity(password);

  const hashedPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

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
