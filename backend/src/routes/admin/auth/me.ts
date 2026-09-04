import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { getUserEffectivePermissions } from "../../../lib/permissions.js";
import { listEnabledModules } from "../../../middleware/requireModule.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { ApiError } from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { updateProfileSchema } from "../../../schemas/admin/auth/updateProfileSchema.js";

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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
        designation: true,
        department: true,
        bio: true,
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

export async function getMyPermissions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const allPermissions = await getUserEffectivePermissions(req.user!.id, tenantId);

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

export async function getMyModules(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const modules = await listEnabledModules(tenantId);
    res.json({ success: true, data: { modules } });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validated = updateProfileSchema.parse(req.body);

    const oldUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        name: true,
        phone: true,
        avatarUrl: true,
        designation: true,
        department: true,
        bio: true,
      },
    });

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: validated,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        designation: true,
        department: true,
        bio: true,
        updatedAt: true,
      },
    });

    const tenantId = req.user?.tenantId ?? undefined;
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "settings",
      description: "Updated profile settings",
      oldData: {
        name: oldUser?.name ?? null,
        phone: oldUser?.phone ?? null,
        avatarUrl: oldUser?.avatarUrl ?? null,
        designation: oldUser?.designation ?? null,
        department: oldUser?.department ?? null,
        bio: oldUser?.bio ?? null,
      },
      newData: {
        name: user.name ?? null,
        phone: user.phone ?? null,
        avatarUrl: user.avatarUrl ?? null,
        designation: user.designation ?? null,
        department: user.department ?? null,
        bio: user.bio ?? null,
      },
      ...getRequestMeta(req),
    });

    res.json(ApiResponse.success(user, "Profile updated successfully"));
  } catch (error) {
    next(error);
  }
}
