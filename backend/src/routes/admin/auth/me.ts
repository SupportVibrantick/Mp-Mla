import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { getUserEffectivePermissions } from "../../../lib/permissions.js";
import { ApiError } from "../../../utils/ApiError.js";

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        forcePasswordChange: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
      },
    });

    if (!user) throw ApiError.notFound("User not found");

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function getMyPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const allPermissions = await getUserEffectivePermissions(req.user!.id);

    // Only return granted ones to frontend
    const granted = allPermissions.filter((p) => p.granted);

    // Also group by module for sidebar rendering
    const grouped: Record<string, string[]> = {};
    for (const p of granted) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p.action);
    }

    res.json({
      success: true,
      data: {
        role: req.user!.role,
        permissions: granted,
        permissionsByModule: grouped,
      },
    });
  } catch (error) {
    next(error);
  }
}