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
import { requireTenantId } from "../../../utils/tenant.js";
import { assertCanCreateUser } from "../../../lib/quota.js";

/**  
 * POST /api/admin/users
 * Admin creates a new user (MLA, Staff, or another Admin)a
 * This replaces the old /register route.
 */

export const createUser = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const { name, email, password, phone, role, designation, departmentId } = req.body;

  // Check duplicate email
  const existing = await prisma.user.findFirst({
    where: { tenantId, email },
  });
  if (existing) {
    throw ApiError.conflict("User with this email already exists in this organization.");
  }

  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }

  // Check duplicate phone if provided
  if (phone) {
    const phoneExists = await prisma.user.findFirst({
      where: { tenantId, phone },
    });
    if (phoneExists) {
      throw ApiError.conflict(
        "User with this phone number already exists in this organization.",
      );
    }
  }

  if (departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: departmentId, tenantId, isDeleted: false, isActive: true },
      select: { id: true },
    });
    if (!department) throw ApiError.notFound("Active department not found");
  }

  await assertCanCreateUser(tenantId);

  // Validate complexity
  await validatePasswordComplexity(password, tenantId);

  const hashedPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  //  Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      designation: designation || null,
      departmentId: departmentId || null,
      tenantId,
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
      designation: true,
      departmentId: true,
      forcePasswordChange: true,
      createdAt: true,
    },
  });

  //  Audit log (non-blocking)
  await createAuditLog({
    userId: req.user!.id,
    tenantId,
    action: "CREATE",
    module: "users",
    recordId: user.id,
    description: `Admin ${req.user!.name} created user ${email} with role ${role}`,
    newData: { name, email, role, phone, designation, departmentId },
    ...getRequestMeta(req),
  });

  //  Standard response
  res
    .status(201)
    .json(ApiResponse.created(user, `User ${email} created successfully`));
});
