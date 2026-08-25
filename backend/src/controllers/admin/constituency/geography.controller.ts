import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import * as geographyService from "../../../services/geography.service.js";
import catchAsync from "../../../utils/catchAsync.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { requireTenantId } from "../../../utils/tenant.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";

// Helper to make controllers DRY
function makeCrudControllers(
  entityName: string,
  serviceFunctions: {
    create: Function;
    get: Function;
    list: Function;
    update: Function;
    del: Function;
    restore: Function;
  },
) {
  return {
    create: catchAsync(async (req: Request, res: Response) => {
      const tenantId = requireTenantId(req);
      const result = await serviceFunctions.create(tenantId, req.body);

      await createAuditLog({
        userId: req.user!.id,
        tenantId,
        action: "CREATE",
        module: entityName,
        recordId: result.id,
        description: `Created new ${entityName}: "${result.name || result.boothName || result.id}"`,
        newData: result,
        ...getRequestMeta(req),
      });

      res
        .status(201)
        .json(
          ApiResponse.created(result, `${entityName} created successfully.`),
        );
    }),

    get: catchAsync(async (req: Request, res: Response) => {
      const tenantId = requireTenantId(req);
      const id = req.params.id as string;
      const result = await serviceFunctions.get(tenantId, id);
      res.json(
        ApiResponse.success(result, `${entityName} fetched successfully.`),
      );
    }),

    list: catchAsync(async (req: Request, res: Response) => {
      const tenantId = requireTenantId(req);
      const result = await serviceFunctions.list(tenantId, req.query);
      res.json(
        ApiResponse.success(result, `${entityName}s listed successfully.`),
      );
    }),

    update: catchAsync(async (req: Request, res: Response) => {
      const tenantId = requireTenantId(req);
      const id = req.params.id as string;
      const original = await serviceFunctions.get(tenantId, id);
      const result = await serviceFunctions.update(tenantId, id, req.body);

      await createAuditLog({
        userId: req.user!.id,
        tenantId,
        action: "UPDATE",
        module: entityName,
        recordId: id,
        description: `Updated ${entityName}: "${result.name || result.boothName || id}"`,
        oldData: original,
        newData: result,
        ...getRequestMeta(req),
      });

      res.json(
        ApiResponse.success(result, `${entityName} updated successfully.`),
      );
    }),

    delete: catchAsync(async (req: Request, res: Response) => {
      const tenantId = requireTenantId(req);
      const id = req.params.id as string;
      const original = await serviceFunctions.get(tenantId, id);
      const result = await serviceFunctions.del(tenantId, id);

      await createAuditLog({
        userId: req.user!.id,
        tenantId,
        action: "DELETE",
        module: entityName,
        recordId: id,
        description: `Soft deleted ${entityName}: "${original.name || original.boothName || id}"`,
        oldData: original,
        newData: result,
        ...getRequestMeta(req),
      });

      res.json(
        ApiResponse.success(result, `${entityName} deleted successfully.`),
      );
    }),

    restore: catchAsync(async (req: Request, res: Response) => {
      const tenantId = requireTenantId(req);
      const id = req.params.id as string;
      const result = await serviceFunctions.restore(tenantId, id);

      await createAuditLog({
        userId: req.user!.id,
        tenantId,
        action: "RESTORE",
        module: entityName,
        recordId: id,
        description: `Restored ${entityName}: "${result.name || result.boothName || id}"`,
        newData: result,
        ...getRequestMeta(req),
      });

      res.json(
        ApiResponse.success(result, `${entityName} restored successfully.`),
      );
    }),

    toggle: catchAsync(async (req: Request, res: Response) => {
      const tenantId = requireTenantId(req);
      const id = req.params.id as string;
      const original = await serviceFunctions.get(tenantId, id);
      const result = await serviceFunctions.update(tenantId, id, {
        isActive: !original.isActive,
      });

      await createAuditLog({
        userId: req.user!.id,
        tenantId,
        action: "STATUS_CHANGE",
        module: entityName,
        recordId: id,
        description: `Toggled active status of ${entityName}: "${result.name || result.boothName || id}" to ${result.isActive}`,
        oldData: original,
        newData: result,
        ...getRequestMeta(req),
      });

      res.json(
        ApiResponse.success(
          result,
          `${entityName} status toggled successfully.`,
        ),
      );
    }),
  };
}

export const districts = makeCrudControllers("district", {
  create: geographyService.createDistrict,
  get: geographyService.getDistrict,
  list: geographyService.listDistricts,
  update: geographyService.updateDistrict,
  del: geographyService.deleteDistrict,
  restore: geographyService.restoreDistrict,
});

export const blocks = makeCrudControllers("block", {
  create: geographyService.createBlock,
  get: geographyService.getBlock,
  list: geographyService.listBlocks,
  update: geographyService.updateBlock,
  del: geographyService.deleteBlock,
  restore: geographyService.restoreBlock,
});

export const townVillages = makeCrudControllers("town-village", {
  create: geographyService.createTownVillage,
  get: geographyService.getTownVillage,
  list: geographyService.listTownVillages,
  update: geographyService.updateTownVillage,
  del: geographyService.deleteTownVillage,
  restore: geographyService.restoreTownVillage,
});

export const wards = {
  create: catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const result = await geographyService.createWardGeom(tenantId, req.body);
    res
      .status(201)
      .json(ApiResponse.created(result, "Ward created successfully."));
  }),
  get: catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const result = await geographyService.getWardGeom(tenantId, id);
    res.json(ApiResponse.success(result, "Ward fetched successfully."));
  }),
  list: catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const where: any = { tenantId, isDeleted: false };
    if (req.query.constituencyId)
      where.constituencyId = req.query.constituencyId;

    if (req.query.unassigned === "true" || req.query.townVillageId === "null") {
      where.townVillageId = null;
    } else if (req.query.townVillageId) {
      where.townVillageId = req.query.townVillageId;
    }

    if (req.query.status === "ACTIVE") where.status = "ACTIVE";
    else if (req.query.status === "INACTIVE") where.status = "INACTIVE";

    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search as string, mode: "insensitive" } },
        { code: { contains: req.query.search as string, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.ward.count({ where }),
      prisma.ward.findMany({
        where,
        skip,
        take: limit,
        orderBy: { wardNumber: "asc" },
        include: {
          constituency: { select: { id: true, name: true } },
          townVillage: { select: { id: true, name: true, type: true } },
        },
      }),
    ]);

    res.json(
      ApiResponse.success(
        { total, page, limit, totalPages: Math.ceil(total / limit), items },
        "Wards listed successfully.",
      ),
    );
  }),
  update: catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const result = await geographyService.updateWardGeom(
      tenantId,
      id,
      req.body,
    );
    res.json(ApiResponse.success(result, "Ward updated successfully."));
  }),
  delete: catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const result = await geographyService.deleteWard(tenantId, id);
    res.json(ApiResponse.success(result, "Ward deleted successfully."));
  }),
  restore: catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const result = await geographyService.restoreWard(tenantId, id);
    res.json(ApiResponse.success(result, "Ward restored successfully."));
  }),
  toggle: catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const original = await geographyService.getWardGeom(tenantId, id);
    const result = await geographyService.updateWardGeom(tenantId, id, {
      status: original.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
    });
    res.json(ApiResponse.success(result, "Ward status toggled successfully."));
  }),
};

export const pollingLocations = makeCrudControllers("polling-location", {
  create: geographyService.createPollingLocation,
  get: geographyService.getPollingLocation,
  list: geographyService.listPollingLocations,
  update: geographyService.updatePollingLocation,
  del: geographyService.deletePollingLocation,
  restore: geographyService.restorePollingLocation,
});

export const booths = makeCrudControllers("booth", {
  create: geographyService.createBooth,
  get: geographyService.getBooth,
  list: geographyService.listBooths,
  update: geographyService.updateBooth,
  del: geographyService.deleteBooth,
  restore: geographyService.restoreBooth,
});

// ─── TREE / STATS / OVERVIEW ───

export const getTree = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const result = await geographyService.getTree(tenantId);
  res.json(
    ApiResponse.success(
      result,
      "Geography hierarchy tree fetched successfully.",
    ),
  );
});

export const getStats = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const result = await geographyService.getStats(tenantId);
  res.json(
    ApiResponse.success(result, "Geography statistics fetched successfully."),
  );
});

export const getOverview = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const result = await geographyService.getOverview(tenantId);
  res.json(
    ApiResponse.success(result, "Constituency overview fetched successfully."),
  );
});

// ─── DROPDOWN HELPERS ───

export const getDistrictsByConstituency = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string; // constituencyId

    // Verify constituency
    const constituency = await prisma.constituency.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!constituency) throw ApiError.notFound("Constituency not found.");

    const districts = await prisma.district.findMany({
      where: { tenantId, isActive: true, isDeleted: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    res.json(ApiResponse.success(districts, "Districts fetched successfully."));
  },
);

export const getBlocksByDistrict = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string; // districtId

    const blocks = await prisma.block.findMany({
      where: { tenantId, districtId: id, isActive: true, isDeleted: false },
      select: { id: true, name: true, code: true, isActive: true },
      orderBy: { name: "asc" },
    });

    res.json(ApiResponse.success(blocks, "Blocks fetched successfully."));
  },
);

export const getTownVillagesByDistrict = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string; // districtId

    const townVillages = await prisma.townVillage.findMany({
      where: { tenantId, districtId: id, isActive: true, isDeleted: false },
      select: { id: true, name: true, code: true, type: true },
      orderBy: { name: "asc" },
    });

    res.json(
      ApiResponse.success(townVillages, "Towns/villages fetched successfully."),
    );
  },
);

export const getTownVillagesByBlock = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string; // blockId

    const townVillages = await prisma.townVillage.findMany({
      where: { tenantId, blockId: id, isActive: true, isDeleted: false },
      select: { id: true, name: true, code: true, type: true, nature: true },
      orderBy: { name: "asc" },
    });

    res.json(
      ApiResponse.success(townVillages, "Towns/villages fetched successfully."),
    );
  },
);

export const getWardsByTownVillage = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string; // townVillageId

    const wards = await prisma.ward.findMany({
      where: {
        tenantId,
        townVillageId: id,
        isDeleted: false,
        status: "ACTIVE",
      },
      select: { id: true, name: true, wardNumber: true, code: true },
      orderBy: { wardNumber: "asc" },
    });

    res.json(ApiResponse.success(wards, "Wards fetched successfully."));
  },
);

export const getBoothsByConstituency = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string; // constituencyId

    const booths = await prisma.booth.findMany({
      where: { tenantId, constituencyId: id, isActive: true, isDeleted: false },
      select: { id: true, boothName: true, boothNumber: true, code: true },
      orderBy: { boothNumber: "asc" },
    });

    res.json(ApiResponse.success(booths, "Booths fetched successfully."));
  },
);
