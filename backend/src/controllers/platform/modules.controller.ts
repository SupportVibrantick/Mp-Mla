import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { clearModuleAccessCache } from "../../middleware/requireModule.js";

function getParamId(req: Request, name = "id"): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

// ════════════════════════════════════════════════════════
// MODULE CRUD
// ════════════════════════════════════════════════════════

export const listModules = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const isActive = req.query.isActive as string;

    const where: Prisma.ModuleWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (typeof isActive === "string") {
      where.isActive = isActive === "true";
    }

    const [modules, total] = await Promise.all([
      prisma.module.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { tenantAccess: true },
          },
        },
      }),
      prisma.module.count({ where }),
    ]);

    res.status(200).json(
      ApiResponse.success({
        modules,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getModuleById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);

    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tenantAccess: true },
        },
        tenantAccess: {
          take: 10,
          orderBy: { grantedAt: "desc" },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                constituencyName: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!module) {
      throw ApiError.notFound("Module not found");
    }

    res.status(200).json(ApiResponse.success(module));
  } catch (error) {
    next(error);
  }
};

export const createModule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = req.body;

    const existing = await prisma.module.findFirst({
      where: {
        OR: [{ code: payload.code }, { name: payload.name }],
      },
    });

    if (existing) {
      throw ApiError.conflict(
        "A module with this code or name already exists",
      );
    }

    const module = await prisma.module.create({
      data: payload,
    });

    res
      .status(201)
      .json(ApiResponse.created(module, "Module created successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateModule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);
    const payload = req.body;

    const existing = await prisma.module.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound("Module not found");
    }

    // Check for duplicate code/name if being changed
    if (payload.code || payload.name) {
      const duplicate = await prisma.module.findFirst({
        where: {
          id: { not: id },
          OR: [
            payload.code ? { code: payload.code } : undefined,
            payload.name ? { name: payload.name } : undefined,
          ].filter(Boolean) as Prisma.ModuleWhereInput[],
        },
      });

      if (duplicate) {
        throw ApiError.conflict(
          "Another module already uses this code or name",
        );
      }
    }

    const module = await prisma.module.update({
      where: { id },
      data: payload,
    });

    res
      .status(200)
      .json(ApiResponse.success(module, "Module updated successfully"));
  } catch (error) {
    next(error);
  }
};

export const deleteModule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);

    const existing = await prisma.module.findUnique({
      where: { id },
      include: {
        _count: { select: { tenantAccess: true } },
      },
    });

    if (!existing) {
      throw ApiError.notFound("Module not found");
    }

    if (existing._count.tenantAccess > 0) {
      // Soft delete: deactivate instead of hard delete when tenants use it
      const module = await prisma.module.update({
        where: { id },
        data: { isActive: false },
      });

      res
        .status(200)
        .json(
          ApiResponse.success(
            module,
            "Module deactivated (has tenant associations). Remove tenant access first for hard delete.",
          ),
        );
      return;
    }

    await prisma.module.delete({ where: { id } });

    res
      .status(200)
      .json(ApiResponse.success(null, "Module deleted successfully"));
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════
// TENANT MODULE ACCESS
// ════════════════════════════════════════════════════════

export const listTenantModules = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getParamId(req, "tenantId");
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const isEnabled = req.query.isEnabled as string;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!tenant) {
      throw ApiError.notFound("Tenant not found");
    }

    const where: Prisma.TenantModuleAccessWhereInput = { tenantId };

    if (typeof isEnabled === "string") {
      where.isEnabled = isEnabled === "true";
    }

    const [access, total] = await Promise.all([
      prisma.tenantModuleAccess.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { grantedAt: "desc" },
        include: {
          module: true,
        },
      }),
      prisma.tenantModuleAccess.count({ where }),
    ]);

    res.status(200).json(
      ApiResponse.success({
        tenant,
        modules: access,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const grantModuleAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getParamId(req, "tenantId");
    const { moduleId, isEnabled } = req.body;

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!tenant) {
      throw ApiError.notFound("Tenant not found");
    }

    // Verify module exists and is active
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw ApiError.notFound("Module not found");
    }

    if (!module.isActive) {
      throw ApiError.badRequest("Cannot grant access to an inactive module");
    }

    const access = await prisma.tenantModuleAccess.upsert({
      where: {
        tenantId_moduleId: { tenantId, moduleId },
      },
      create: {
        tenantId,
        moduleId,
        isEnabled: isEnabled ?? true,
      },
      update: {
        isEnabled: isEnabled ?? true,
      },
      include: {
        module: true,
      },
    });

    clearModuleAccessCache(tenantId);

    res
      .status(200)
      .json(
        ApiResponse.success(access, "Module access granted successfully"),
      );
  } catch (error) {
    next(error);
  }
};

export const updateModuleAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getParamId(req, "tenantId");
    const moduleId = getParamId(req, "moduleId");
    const { isEnabled } = req.body;

    const existing = await prisma.tenantModuleAccess.findUnique({
      where: {
        tenantId_moduleId: { tenantId, moduleId },
      },
    });

    if (!existing) {
      throw ApiError.notFound("Tenant module access record not found");
    }

    const updateData: Prisma.TenantModuleAccessUpdateInput = {};

    if (typeof isEnabled === "boolean") {
      updateData.isEnabled = isEnabled;
    }

    const access = await prisma.tenantModuleAccess.update({
      where: {
        tenantId_moduleId: { tenantId, moduleId },
      },
      data: updateData,
      include: {
        module: true,
      },
    });

    res
      .status(200)
      .json(
        ApiResponse.success(access, "Module access updated successfully"),
      );
  } catch (error) {
    next(error);
  }
};

export const revokeModuleAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getParamId(req, "tenantId");
    const moduleId = getParamId(req, "moduleId");

    const existing = await prisma.tenantModuleAccess.findUnique({
      where: {
        tenantId_moduleId: { tenantId, moduleId },
      },
    });

    if (!existing) {
      throw ApiError.notFound("Tenant module access record not found");
    }

    await prisma.tenantModuleAccess.delete({
      where: {
        tenantId_moduleId: { tenantId, moduleId },
      },
    });

    clearModuleAccessCache(tenantId);

    res
      .status(200)
      .json(ApiResponse.success(null, "Module access revoked successfully"));
  } catch (error) {
    next(error);
  }
};

export const bulkGrantModules = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getParamId(req, "tenantId");
    const { moduleIds, isEnabled } = req.body;

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!tenant) {
      throw ApiError.notFound("Tenant not found");
    }

    // Verify all modules exist and are active
    const modules = await prisma.module.findMany({
      where: {
        id: { in: moduleIds },
        isActive: true,
      },
      select: { id: true },
    });

    const foundIds = new Set(modules.map((m) => m.id));
    const invalidIds = moduleIds.filter((id: string) => !foundIds.has(id));

    if (invalidIds.length > 0) {
      throw ApiError.badRequest(
        `The following module IDs are invalid or inactive: ${invalidIds.join(", ")}`,
      );
    }

    // Upsert each module access within a transaction
    const result = await prisma.$transaction(
      modules.map((module) =>
        prisma.tenantModuleAccess.upsert({
          where: {
            tenantId_moduleId: { tenantId, moduleId: module.id },
          },
          create: {
            tenantId,
            moduleId: module.id,
            isEnabled: isEnabled ?? true,
          },
          update: {
            isEnabled: isEnabled ?? true,
          },
          include: {
            module: true,
          },
        }),
      ),
    );

    clearModuleAccessCache(tenantId);

    res
      .status(200)
      .json(
        ApiResponse.success(
          { granted: result.length, modules: result },
          `${result.length} module(s) granted to tenant successfully`,
        ),
      );
  } catch (error) {
    next(error);
  }
};
