import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { env } from "../../lib/env.js";

function getParamId(req: Request, name = "id"): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

export async function listPlatformUsers(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const users = await prisma.platformUser.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    res.json(ApiResponse.success(users));
  } catch (error) {
    next(error);
  }
}

export async function createPlatformUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { name, email, password, role } = req.body;
    const existing = await prisma.platformUser.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict("Email already in use");

    const user = await prisma.platformUser.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS),
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json(ApiResponse.created(user, "Platform user created"));
  } catch (error) {
    next(error);
  }
}

export async function updatePlatformUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = getParamId(req);
    const { name, email, role, isActive, password } = req.body;

    const target = await prisma.platformUser.findUnique({ where: { id } });
    if (!target) throw ApiError.notFound("User not found");

    if (id === req.platformUser?.id) {
      if (isActive === false) {
        throw ApiError.badRequest("You cannot deactivate your own account");
      }
      if (role !== undefined && role !== target.role) {
        throw ApiError.badRequest("You cannot change your own role");
      }
    }

    if (target.role === "SUPER_ADMIN" && (isActive === false || (role !== undefined && role !== "SUPER_ADMIN"))) {
      const activeSuperAdminCount = await prisma.platformUser.count({
        where: { role: "SUPER_ADMIN", isActive: true },
      });
      if (activeSuperAdminCount <= 1) {
        throw ApiError.badRequest("Cannot deactivate or demote the last active super admin");
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) {
      data.password = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
    }

    const user = await prisma.platformUser.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    res.json(ApiResponse.success(user, "Platform user updated"));
  } catch (error) {
    next(error);
  }
}

export async function deletePlatformUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = getParamId(req);
    if (id === req.platformUser?.id) {
      throw ApiError.badRequest("You cannot delete your own account");
    }

    const target = await prisma.platformUser.findUnique({ where: { id } });
    if (!target) throw ApiError.notFound("User not found");
    if (target.role === "SUPER_ADMIN") {
      const superAdminCount = await prisma.platformUser.count({
        where: { role: "SUPER_ADMIN", isActive: true },
      });
      if (superAdminCount <= 1) {
        throw ApiError.badRequest("Cannot delete the last super admin");
      }
    }

    await prisma.platformUser.update({
      where: { id },
      data: { isActive: false },
    });

    res.json(ApiResponse.success(null, "Platform user deactivated"));
  } catch (error) {
    next(error);
  }
}
