import prisma from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { Prisma } from "@prisma/client";
import { archiveToRecycleBin } from "../lib/recycleBin.js";

// Helper to check parent tenant matches child tenant
async function validateParentTenant(
  model: string,
  id: string,
  tenantId: string,
) {
  const record = await (prisma as any)[model].findFirst({
    where: { id, tenantId, isDeleted: false },
  });
  if (!record) {
    throw ApiError.badRequest(
      `Parent ${model} with ID ${id} does not belong to this organization.`,
    );
  }
  return record;
}

// Strictly validate TownVillage hierarchy
async function validateTownVillageParents(
  tenantId: string,
  districtId: string,
  blockId: string | null | undefined,
  constituencyId: string | null | undefined,
) {
  const district = await validateParentTenant("district", districtId, tenantId);

  if (blockId) {
    const block = await validateParentTenant("block", blockId, tenantId);
    if (block.districtId !== district.id) {
      throw ApiError.badRequest(
        "Selected block does not belong to the selected district.",
      );
    }
  }

  if (constituencyId) {
    await validateParentTenant("constituency", constituencyId, tenantId);
  }
}

// Strictly validate Ward hierarchy
async function validateWardParents(
  tenantId: string,
  townVillageId: string | null | undefined,
  constituencyId: string | null | undefined,
) {
  if (constituencyId) {
    await validateParentTenant("constituency", constituencyId, tenantId);
  }

  if (townVillageId) {
    await validateParentTenant("townVillage", townVillageId, tenantId);
  }
}

// Strictly validate Booth hierarchy
async function validateBoothParents(
  tenantId: string,
  constituencyId: string,
  wardId: string | null | undefined,
  townVillageId: string | null | undefined,
  pollingLocationId: string | null | undefined,
) {
  await validateParentTenant("constituency", constituencyId, tenantId);

  if (wardId) {
    const ward = await validateParentTenant("ward", wardId, tenantId);
    if (ward.constituencyId && ward.constituencyId !== constituencyId) {
      throw ApiError.badRequest(
        `Ward with ID ${wardId} does not belong to the selected constituency.`,
      );
    }
  }

  if (townVillageId) {
    const townVillage = await validateParentTenant(
      "townVillage",
      townVillageId,
      tenantId,
    );
    if (
      townVillage.constituencyId &&
      townVillage.constituencyId !== constituencyId
    ) {
      throw ApiError.badRequest(
        `Town/village with ID ${townVillageId} does not belong to the selected constituency.`,
      );
    }
    if (
      townVillage.districtId !==
      (await validateParentTenant("constituency", constituencyId, tenantId))
        .districtId
    ) {
      throw ApiError.badRequest(
        "Town/village does not belong to the selected constituency district.",
      );
    }
  }

  if (pollingLocationId) {
    await validateParentTenant("pollingLocation", pollingLocationId, tenantId);
  }
}

// ─── DISTRICTS ───

export async function createDistrict(tenantId: string, data: any) {
  const existingName = await prisma.district.findFirst({
    where: { tenantId, name: data.name, isDeleted: false },
  });
  if (existingName)
    throw ApiError.conflict("District with this name already exists.");

  if (data.code) {
    const existingCode = await prisma.district.findFirst({
      where: { tenantId, code: data.code, isDeleted: false },
    });
    if (existingCode)
      throw ApiError.conflict("District with this code already exists.");
  }

  return prisma.district.create({
    data: { ...data, tenantId, boundary: data.boundary ?? Prisma.JsonNull },
  });
}

export async function getDistrict(tenantId: string, id: string) {
  const district = await prisma.district.findFirst({
    where: { id, tenantId, isDeleted: false },
  });
  if (!district) throw ApiError.notFound("District not found.");
  return district;
}

export async function listDistricts(tenantId: string, params: any) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 20);
  const skip = (page - 1) * limit;

  const where: Prisma.DistrictWhereInput = { tenantId, isDeleted: false };
  if (params.status === "ACTIVE") where.isActive = true;
  else if (params.status === "INACTIVE") where.isActive = false;

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { code: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.district.count({ where }),
    prisma.district.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), items };
}

export async function updateDistrict(tenantId: string, id: string, data: any) {
  const district = await getDistrict(tenantId, id);

  if (data.name && data.name !== district.name) {
    const existing = await prisma.district.findFirst({
      where: { tenantId, name: data.name, id: { not: id }, isDeleted: false },
    });
    if (existing) throw ApiError.conflict("District name already exists.");
  }

  if (data.code && data.code !== district.code) {
    const existing = await prisma.district.findFirst({
      where: { tenantId, code: data.code, id: { not: id }, isDeleted: false },
    });
    if (existing) throw ApiError.conflict("District code already exists.");
  }

  return prisma.district.update({
    where: { id },
    data: {
      ...data,
      boundary:
        data.boundary !== undefined
          ? (data.boundary ?? Prisma.JsonNull)
          : undefined,
    },
  });
}

export async function deleteDistrict(tenantId: string, id: string) {
  const district = await getDistrict(tenantId, id);

  const [blockCount, townVillageCount, constituencyCount] = await Promise.all([
    prisma.block.count({
      where: { tenantId, districtId: id, isDeleted: false },
    }),
    prisma.townVillage.count({
      where: { districtId: id, isDeleted: false },
    }),
    prisma.constituency.count({
      where: { tenantId, districtId: id, isDeleted: false },
    }),
  ]);

  if (blockCount > 0 || townVillageCount > 0 || constituencyCount > 0) {
    const parts = [];
    if (townVillageCount > 0)
      parts.push(`• ${townVillageCount} Towns/Villages`);
    if (blockCount > 0) parts.push(`• ${blockCount} Blocks`);
    if (constituencyCount > 0)
      parts.push(`• ${constituencyCount} Constituencies`);

    throw ApiError.badRequest(
      `Cannot delete ${district.name} District. This district contains:\n` +
        parts.join("\n") +
        `\nDeactivate it instead or resolve dependencies first.`,
    );
  }

  await archiveToRecycleBin({
    tenantId,
    module: "constituency",
    entityType: "district",
    recordId: district.id,
    recordLabel: district.name,
    payload: district,
    deletedById: undefined,
  });

  return prisma.district.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isActive: false },
  });
}

export async function restoreDistrict(tenantId: string, id: string) {
  const district = await prisma.district.findFirst({
    where: { id, tenantId, isDeleted: true },
  });
  if (!district)
    throw ApiError.notFound("District not found or is not deleted.");

  return prisma.district.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null, isActive: true },
  });
}

// ─── BLOCKS ───

export async function createBlock(tenantId: string, data: any) {
  await validateParentTenant("district", data.districtId, tenantId);

  const existingName = await prisma.block.findFirst({
    where: {
      tenantId,
      districtId: data.districtId,
      name: data.name,
      isDeleted: false,
    },
  });
  if (existingName)
    throw ApiError.conflict("Block name already exists in this district.");

  if (data.code) {
    const existingCode = await prisma.block.findFirst({
      where: {
        tenantId,
        districtId: data.districtId,
        code: data.code,
        isDeleted: false,
      },
    });
    if (existingCode)
      throw ApiError.conflict("Block code already exists in this district.");
  }

  return prisma.block.create({
    data: { ...data, tenantId, boundary: data.boundary ?? Prisma.JsonNull },
  });
}

export async function getBlock(tenantId: string, id: string) {
  const block = await prisma.block.findFirst({
    where: { id, tenantId, isDeleted: false },
    include: { district: { select: { id: true, name: true } } },
  });
  if (!block) throw ApiError.notFound("Block not found.");
  return block;
}

export async function listBlocks(tenantId: string, params: any) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 20);
  const skip = (page - 1) * limit;

  const where: Prisma.BlockWhereInput = { tenantId, isDeleted: false };
  if (params.districtId) where.districtId = params.districtId;
  if (params.status === "ACTIVE") where.isActive = true;
  else if (params.status === "INACTIVE") where.isActive = false;

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { code: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.block.count({ where }),
    prisma.block.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: { district: { select: { id: true, name: true } } },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), items };
}

export async function updateBlock(tenantId: string, id: string, data: any) {
  const block = await getBlock(tenantId, id);

  if (data.districtId && data.districtId !== block.districtId) {
    await validateParentTenant("district", data.districtId, tenantId);
  }

  const targetDistrictId = data.districtId || block.districtId;

  if (data.name && data.name !== block.name) {
    const existing = await prisma.block.findFirst({
      where: {
        tenantId,
        districtId: targetDistrictId,
        name: data.name,
        id: { not: id },
        isDeleted: false,
      },
    });
    if (existing)
      throw ApiError.conflict("Block name already exists in this district.");
  }

  if (data.code && data.code !== block.code) {
    const existing = await prisma.block.findFirst({
      where: {
        tenantId,
        districtId: targetDistrictId,
        code: data.code,
        id: { not: id },
        isDeleted: false,
      },
    });
    if (existing)
      throw ApiError.conflict("Block code already exists in this district.");
  }

  return prisma.block.update({
    where: { id },
    data: {
      ...data,
      boundary:
        data.boundary !== undefined
          ? (data.boundary ?? Prisma.JsonNull)
          : undefined,
    },
  });
}

export async function deleteBlock(tenantId: string, id: string) {
  const block = await getBlock(tenantId, id);

  if (block.isDeleted) {
    throw ApiError.badRequest("Block is already in recycle bin.");
  }

  const townVillageCount = await prisma.townVillage.count({
    where: { tenantId, blockId: id, isDeleted: false },
  });

  if (townVillageCount > 0) {
    const parts = [];
    parts.push(`• ${townVillageCount} Towns/Villages`);

    throw ApiError.badRequest(
      `Cannot delete ${block.name} Block. This block contains:\n` +
        parts.join("\n") +
        `\nDeactivate it instead or resolve dependencies first.`,
    );
  }

  await archiveToRecycleBin({
    tenantId,
    module: "block",
    entityType: "block",
    recordId: block.id,
    recordLabel: block.name,
    payload: {
      id: block.id,
      tenantId: block.tenantId,
      districtId: block.districtId,
      name: block.name,
      code: block.code,
      latitude: block.latitude,
      longitude: block.longitude,
      boundary: block.boundary,
      isActive: block.isActive,
      isDeleted: block.isDeleted,
      deletedAt: block.deletedAt,
    },
  });

  return prisma.block.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isActive: false },
  });
}

export async function restoreBlock(tenantId: string, id: string) {
  const block = await prisma.block.findFirst({
    where: { id, tenantId, isDeleted: true },
  });
  if (!block) throw ApiError.notFound("Block not found or is not deleted.");

  return prisma.block.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null, isActive: true },
  });
}

/* Removed legacy MunicipalArea CRUD; TownVillage replaces this model.

export async function createMunicipalArea(tenantId: string, data: any) {
  await validateParentTenant("district", data.districtId, tenantId);

  const existingName = await prisma.municipalArea.findFirst({
    where: {
      tenantId,
      districtId: data.districtId,
      name: data.name,
      isDeleted: false,
    },
  });
  if (existingName)
    throw ApiError.conflict(
      "Municipal Area name already exists in this district.",
    );

  if (data.code) {
    const existingCode = await prisma.municipalArea.findFirst({
      where: {
        tenantId,
        districtId: data.districtId,
        code: data.code,
        isDeleted: false,
      },
    });
    if (existingCode)
      throw ApiError.conflict(
        "Municipal Area code already exists in this district.",
      );
  }

  return prisma.municipalArea.create({
    data: { ...data, tenantId, boundary: data.boundary ?? Prisma.JsonNull },
  });
}

export async function getMunicipalArea(tenantId: string, id: string) {
  const ma = await prisma.municipalArea.findFirst({
    where: { id, tenantId, isDeleted: false },
    include: { district: { select: { id: true, name: true } } },
  });
  if (!ma) throw ApiError.notFound("Municipal Area not found.");
  return ma;
}

export async function listMunicipalAreas(tenantId: string, params: any) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 20);
  const skip = (page - 1) * limit;

  const where: Prisma.MunicipalAreaWhereInput = { tenantId, isDeleted: false };
  if (params.districtId) where.districtId = params.districtId;
  if (params.status === "ACTIVE") where.isActive = true;
  else if (params.status === "INACTIVE") where.isActive = false;

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { code: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.municipalArea.count({ where }),
    prisma.municipalArea.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: { district: { select: { id: true, name: true } } },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), items };
}

export async function updateMunicipalArea(
  tenantId: string,
  id: string,
  data: any,
) {
  const ma = await getMunicipalArea(tenantId, id);

  if (data.districtId && data.districtId !== ma.districtId) {
    await validateParentTenant("district", data.districtId, tenantId);
  }

  const targetDistrictId = data.districtId || ma.districtId;

  if (data.name && data.name !== ma.name) {
    const existing = await prisma.municipalArea.findFirst({
      where: {
        tenantId,
        districtId: targetDistrictId,
        name: data.name,
        id: { not: id },
        isDeleted: false,
      },
    });
    if (existing)
      throw ApiError.conflict(
        "Municipal Area name already exists in this district.",
      );
  }

  if (data.code && data.code !== ma.code) {
    const existing = await prisma.municipalArea.findFirst({
      where: {
        tenantId,
        districtId: targetDistrictId,
        code: data.code,
        id: { not: id },
        isDeleted: false,
      },
    });
    if (existing)
      throw ApiError.conflict(
        "Municipal Area code already exists in this district.",
      );
  }

  return prisma.municipalArea.update({
    where: { id },
    data: {
      ...data,
      boundary:
        data.boundary !== undefined
          ? (data.boundary ?? Prisma.JsonNull)
          : undefined,
    },
  });
}

export async function deleteMunicipalArea(tenantId: string, id: string) {
  const ma = await getMunicipalArea(tenantId, id);

  const wardCount = await prisma.ward.count({
    where: { municipalAreaId: id, isDeleted: false },
  });

  if (wardCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete ${ma.name} Municipal Area. It contains ${wardCount} Wards. ` +
        `Deactivate it instead or resolve dependencies first.`,
    );
  }

  return prisma.municipalArea.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isActive: false },
  });
}

export async function restoreMunicipalArea(tenantId: string, id: string) {
  const ma = await prisma.municipalArea.findFirst({
    where: { id, tenantId, isDeleted: true },
  });
  if (!ma)
    throw ApiError.notFound("Municipal Area not found or is not deleted.");

  return prisma.municipalArea.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null, isActive: true },
  });
}

*/
// ─── WARDS (Phase 3 Integration) ───

// ─── TOWNS / VILLAGES ───

export async function createTownVillage(tenantId: string, data: any) {
  await validateTownVillageParents(
    tenantId,
    data.districtId,
    data.blockId,
    data.constituencyId,
  );

  const existing = await prisma.townVillage.findFirst({
    where: {
      tenantId,
      districtId: data.districtId,
      name: data.name,
      isDeleted: false,
    },
  });
  if (existing)
    throw ApiError.conflict("Town/village already exists in this district.");

  return prisma.townVillage.create({
    data: { ...data, tenantId, boundary: data.boundary ?? Prisma.JsonNull },
  });
}

export async function getTownVillage(tenantId: string, id: string) {
  const townVillage = await prisma.townVillage.findFirst({
    where: { id, tenantId, isDeleted: false },
    include: {
      district: { select: { id: true, name: true } },
      block: { select: { id: true, name: true } },
      constituency: { select: { id: true, name: true } },
    },
  });
  if (!townVillage) throw ApiError.notFound("Town/village not found.");
  return townVillage;
}

export async function listTownVillages(tenantId: string, params: any) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Number(params.limit) || 20);
  const where: Prisma.TownVillageWhereInput = { tenantId, isDeleted: false };
  if (params.districtId) where.districtId = params.districtId;
  if (params.blockId) where.blockId = params.blockId;
  if (params.constituencyId) where.constituencyId = params.constituencyId;
  if (params.type === "TOWN" || params.type === "VILLAGE")
    where.type = params.type;
  if (params.status === "ACTIVE") where.isActive = true;
  if (params.status === "INACTIVE") where.isActive = false;
  if (params.search) {
    where.OR = [
      { name: { contains: String(params.search), mode: "insensitive" } },
      { code: { contains: String(params.search), mode: "insensitive" } },
    ];
  }
  const [total, items] = await Promise.all([
    prisma.townVillage.count({ where }),
    prisma.townVillage.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        district: { select: { id: true, name: true } },
        block: { select: { id: true, name: true } },
        constituency: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { total, page, limit, totalPages: Math.ceil(total / limit), items };
}

export async function updateTownVillage(
  tenantId: string,
  id: string,
  data: any,
) {
  const townVillage = await getTownVillage(tenantId, id);
  const districtId = data.districtId ?? townVillage.districtId;
  const blockId =
    data.blockId !== undefined ? data.blockId : townVillage.blockId;
  const constituencyId =
    data.constituencyId !== undefined
      ? data.constituencyId
      : townVillage.constituencyId;
  await validateTownVillageParents(
    tenantId,
    districtId,
    blockId,
    constituencyId,
  );
  return prisma.townVillage.update({
    where: { id },
    data: {
      ...data,
      boundary:
        data.boundary !== undefined
          ? (data.boundary ?? Prisma.JsonNull)
          : undefined,
    },
  });
}

export async function deleteTownVillage(tenantId: string, id: string) {
  const townVillage = await getTownVillage(tenantId, id);
  const boothCount = await prisma.booth.count({
    where: { tenantId, townVillageId: id, isDeleted: false },
  });
  const wardCount = await prisma.ward.count({
    where: { tenantId, townVillageId: id, isDeleted: false },
  });
  if (boothCount || wardCount) {
    throw ApiError.badRequest(
      `Cannot delete ${townVillage.name}. It has ${boothCount} active booth(s) and ${wardCount} active ward(s).`,
    );
  }
  await archiveToRecycleBin({
    tenantId,
    module: "town-village",
    entityType: "town_village",
    recordId: id,
    recordLabel: townVillage.name,
    payload: {
      id: townVillage.id,
      tenantId: townVillage.tenantId,
      districtId: townVillage.districtId,
      blockId: townVillage.blockId,
      constituencyId: townVillage.constituencyId,
      name: townVillage.name,
      code: townVillage.code,
      type: townVillage.type,
      nature: townVillage.nature,
      description: townVillage.description,
      pincode: townVillage.pincode,
      latitude: townVillage.latitude,
      longitude: townVillage.longitude,
      boundary: townVillage.boundary,
      isActive: townVillage.isActive,
      isDeleted: townVillage.isDeleted,
      deletedAt: townVillage.deletedAt,
    },
  });
  return prisma.townVillage.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isActive: false },
  });
}

export async function restoreTownVillage(tenantId: string, id: string) {
  const townVillage = await prisma.townVillage.findFirst({
    where: { id, tenantId, isDeleted: true },
  });
  if (!townVillage)
    throw ApiError.notFound("Town/village not found or is not deleted.");
  return prisma.townVillage.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null, isActive: true },
  });
}

export async function createWardGeom(tenantId: string, data: any) {
  await validateWardParents(tenantId, data.townVillageId, data.constituencyId);

  const existingNumber = await prisma.ward.findFirst({
    where: { tenantId, wardNumber: data.wardNumber, isDeleted: false },
  });
  if (existingNumber)
    throw ApiError.conflict(`Ward number ${data.wardNumber} already exists.`);

  const existingName = await prisma.ward.findFirst({
    where: { tenantId, name: data.name, isDeleted: false },
  });
  if (existingName)
    throw ApiError.conflict(`Ward name "${data.name}" already exists.`);

  return prisma.ward.create({
    data: {
      tenantId,
      wardNumber: data.wardNumber,
      name: data.name,
      code: data.code,
      zone: data.zone,
      areaType: data.areaType ?? "Urban",
      pincode: data.pincode,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      boundaryGeoJson: data.boundaryGeoJson ?? Prisma.JsonNull,
      constituencyId: data.constituencyId,
      townVillageId: data.townVillageId,
    },
  });
}

export async function getWardGeom(tenantId: string, id: string) {
  const ward = await prisma.ward.findFirst({
    where: { id, tenantId, isDeleted: false },
    include: {
      constituency: { select: { id: true, name: true } },
      townVillage: { select: { id: true, name: true, type: true } },
    },
  });
  if (!ward) throw ApiError.notFound("Ward not found.");
  return ward;
}

export async function updateWardGeom(tenantId: string, id: string, data: any) {
  const ward = await getWardGeom(tenantId, id);

  const targetTownVillageId =
    data.townVillageId !== undefined ? data.townVillageId : ward.townVillageId;
  const targetConstituencyId =
    data.constituencyId !== undefined
      ? data.constituencyId
      : ward.constituencyId;
  await validateWardParents(
    tenantId,
    targetTownVillageId,
    targetConstituencyId,
  );

  if (data.wardNumber && data.wardNumber !== ward.wardNumber) {
    const existing = await prisma.ward.findFirst({
      where: {
        tenantId,
        wardNumber: data.wardNumber,
        id: { not: id },
        isDeleted: false,
      },
    });
    if (existing)
      throw ApiError.conflict(`Ward number ${data.wardNumber} already exists.`);
  }

  if (data.name && data.name !== ward.name) {
    const existing = await prisma.ward.findFirst({
      where: { tenantId, name: data.name, id: { not: id }, isDeleted: false },
    });
    if (existing)
      throw ApiError.conflict(`Ward name "${data.name}" already exists.`);
  }

  return prisma.ward.update({
    where: { id },
    data: {
      ...data,
      boundaryGeoJson:
        data.boundaryGeoJson !== undefined
          ? (data.boundaryGeoJson ?? Prisma.JsonNull)
          : undefined,
    },
  });
}

export async function deleteWard(tenantId: string, id: string) {
  await getWardGeom(tenantId, id);

  const [boothCount, areaCount] = await Promise.all([
    prisma.booth.count({ where: { wardId: id, isDeleted: false } }),
    prisma.wardArea.count({ where: { wardId: id } }), // WardArea check
  ]);

  if (boothCount > 0 || areaCount > 0) {
    const parts = [];
    if (boothCount > 0) parts.push(`• ${boothCount} Booths`);
    if (areaCount > 0) parts.push(`• ${areaCount} Ward Areas`);

    throw ApiError.badRequest(
      `Cannot delete Ward. This ward contains:\n` +
        parts.join("\n") +
        `\nDeactivate it instead or resolve dependencies first.`,
    );
  }

  return prisma.ward.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), status: "INACTIVE" },
  });
}

export async function restoreWard(tenantId: string, id: string) {
  const ward = await prisma.ward.findFirst({
    where: { id, tenantId, isDeleted: true },
  });
  if (!ward) throw ApiError.notFound("Ward not found or is not deleted.");

  return prisma.ward.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null, status: "ACTIVE" },
  });
}

/* Removed legacy Panchayat and Village CRUD; TownVillage replaces both models.

export async function createPanchayat(tenantId: string, data: any) {
  await validatePanchayatParents(tenantId, data.districtId, data.blockId);

  const existing = await prisma.panchayat.findFirst({
    where: {
      tenantId,
      blockId: data.blockId,
      name: data.name,
      isDeleted: false,
    },
  });
  if (existing)
    throw ApiError.conflict("Panchayat already exists in this block.");

  return prisma.panchayat.create({
    data: { ...data, tenantId, boundary: data.boundary ?? Prisma.JsonNull },
  });
}

export async function getPanchayat(tenantId: string, id: string) {
  const panchayat = await prisma.panchayat.findFirst({
    where: { id, tenantId, isDeleted: false },
    include: {
      district: { select: { id: true, name: true } },
      block: { select: { id: true, name: true } },
    },
  });
  if (!panchayat) throw ApiError.notFound("Panchayat not found.");
  return panchayat;
}

export async function listPanchayats(tenantId: string, params: any) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 20);
  const skip = (page - 1) * limit;

  const where: Prisma.PanchayatWhereInput = { tenantId, isDeleted: false };
  if (params.districtId) where.districtId = params.districtId;
  if (params.blockId) where.blockId = params.blockId;
  if (params.status === "ACTIVE") where.isActive = true;
  else if (params.status === "INACTIVE") where.isActive = false;

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { code: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.panchayat.count({ where }),
    prisma.panchayat.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        district: { select: { id: true, name: true } },
        block: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), items };
}

export async function updatePanchayat(tenantId: string, id: string, data: any) {
  const panchayat = await getPanchayat(tenantId, id);

  const targetDistrictId = data.districtId || panchayat.districtId;
  const targetBlockId =
    data.blockId !== undefined ? data.blockId : panchayat.blockId;
  await validatePanchayatParents(tenantId, targetDistrictId, targetBlockId);

  return prisma.panchayat.update({
    where: { id },
    data: {
      ...data,
      boundary:
        data.boundary !== undefined
          ? (data.boundary ?? Prisma.JsonNull)
          : undefined,
    },
  });
}

export async function deletePanchayat(tenantId: string, id: string) {
  const panchayat = await getPanchayat(tenantId, id);

  const villageCount = await prisma.village.count({
    where: { panchayatId: id, isDeleted: false },
  });

  if (villageCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete Panchayat. It contains ${villageCount} Villages. ` +
        `Deactivate it instead or resolve dependencies first.`,
    );
  }

  return prisma.panchayat.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isActive: false },
  });
}

export async function restorePanchayat(tenantId: string, id: string) {
  const panchayat = await prisma.panchayat.findFirst({
    where: { id, tenantId, isDeleted: true },
  });
  if (!panchayat)
    throw ApiError.notFound("Panchayat not found or is not deleted.");

  return prisma.panchayat.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null, isActive: true },
  });
}

// ─── VILLAGES ───

export async function createVillage(tenantId: string, data: any) {
  await validateVillageParents(
    tenantId,
    data.districtId,
    data.blockId,
    data.panchayatId,
    data.constituencyId,
  );

  const existing = await prisma.village.findFirst({
    where: {
      tenantId,
      panchayatId: data.panchayatId,
      name: data.name,
      isDeleted: false,
    },
  });
  if (existing)
    throw ApiError.conflict(
      "Village with this name already exists in this panchayat.",
    );

  return prisma.village.create({
    data: { ...data, tenantId, boundary: data.boundary ?? Prisma.JsonNull },
  });
}

export async function getVillage(tenantId: string, id: string) {
  const village = await prisma.village.findFirst({
    where: { id, tenantId, isDeleted: false },
    include: {
      constituency: { select: { id: true, name: true } },
      district: { select: { id: true, name: true } },
      block: { select: { id: true, name: true } },
      panchayat: { select: { id: true, name: true } },
    },
  });
  if (!village) throw ApiError.notFound("Village not found.");
  return village;
}

export async function listVillages(tenantId: string, params: any) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 20);
  const skip = (page - 1) * limit;

  const where: Prisma.VillageWhereInput = { tenantId, isDeleted: false };
  if (params.constituencyId) where.constituencyId = params.constituencyId;
  if (params.districtId) where.districtId = params.districtId;
  if (params.blockId) where.blockId = params.blockId;
  if (params.panchayatId) where.panchayatId = params.panchayatId;
  if (params.status === "ACTIVE") where.isActive = true;
  else if (params.status === "INACTIVE") where.isActive = false;

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { code: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.village.count({ where }),
    prisma.village.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        constituency: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        block: { select: { id: true, name: true } },
        panchayat: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), items };
}

export async function updateVillage(tenantId: string, id: string, data: any) {
  const village = await getVillage(tenantId, id);

  const targetDistrictId = data.districtId || village.districtId;
  const targetBlockId =
    data.blockId !== undefined ? data.blockId : village.blockId;
  const targetPanchayatId =
    data.panchayatId !== undefined ? data.panchayatId : village.panchayatId;
  const targetConstituencyId =
    data.constituencyId !== undefined
      ? data.constituencyId
      : village.constituencyId;
  await validateVillageParents(
    tenantId,
    targetDistrictId,
    targetBlockId,
    targetPanchayatId,
    targetConstituencyId,
  );

  return prisma.village.update({
    where: { id },
    data: {
      ...data,
      boundary:
        data.boundary !== undefined
          ? (data.boundary ?? Prisma.JsonNull)
          : undefined,
    },
  });
}

export async function deleteVillage(tenantId: string, id: string) {
  const village = await getVillage(tenantId, id);

  const boothCount = await prisma.booth.count({
    where: { villageId: id, isDeleted: false },
  });

  if (boothCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete Village. It contains ${boothCount} Booths. ` +
        `Deactivate it instead or resolve dependencies first.`,
    );
  }

  return prisma.village.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isActive: false },
  });
}

export async function restoreVillage(tenantId: string, id: string) {
  const village = await prisma.village.findFirst({
    where: { id, tenantId, isDeleted: true },
  });
  if (!village) throw ApiError.notFound("Village not found or is not deleted.");

  return prisma.village.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null, isActive: true },
  });
}

*/
// ─── POLLING LOCATIONS ───

export async function createPollingLocation(tenantId: string, data: any) {
  return prisma.pollingLocation.create({
    data: { ...data, tenantId },
  });
}

export async function getPollingLocation(tenantId: string, id: string) {
  const location = await prisma.pollingLocation.findFirst({
    where: { id, tenantId, isDeleted: false },
  });
  if (!location) throw ApiError.notFound("Polling location not found.");
  return location;
}

export async function listPollingLocations(tenantId: string, params: any) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 20);
  const skip = (page - 1) * limit;

  const where: Prisma.PollingLocationWhereInput = {
    tenantId,
    isDeleted: false,
  };
  if (params.status === "ACTIVE") where.isActive = true;
  else if (params.status === "INACTIVE") where.isActive = false;

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { address: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.pollingLocation.count({ where }),
    prisma.pollingLocation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), items };
}

export async function updatePollingLocation(
  tenantId: string,
  id: string,
  data: any,
) {
  await getPollingLocation(tenantId, id);
  return prisma.pollingLocation.update({ where: { id }, data });
}

export async function deletePollingLocation(tenantId: string, id: string) {
  const location = await getPollingLocation(tenantId, id);

  const boothCount = await prisma.booth.count({
    where: { pollingLocationId: id, isDeleted: false },
  });

  if (boothCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete Polling Location. It is shared by ${boothCount} Booths. ` +
        `Deactivate it instead or resolve dependencies first.`,
    );
  }

  return prisma.pollingLocation.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isActive: false },
  });
}

export async function restorePollingLocation(tenantId: string, id: string) {
  const location = await prisma.pollingLocation.findFirst({
    where: { id, tenantId, isDeleted: true },
  });
  if (!location)
    throw ApiError.notFound("Polling location not found or is not deleted.");

  return prisma.pollingLocation.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null, isActive: true },
  });
}

// ─── BOOTHS ───

export async function createBooth(tenantId: string, data: any) {
  await validateBoothParents(
    tenantId,
    data.constituencyId,
    data.wardId,
    data.townVillageId,
    data.pollingLocationId,
  );

  const existing = await prisma.booth.findFirst({
    where: {
      tenantId,
      constituencyId: data.constituencyId,
      boothNumber: data.boothNumber,
      isDeleted: false,
    },
  });
  if (existing)
    throw ApiError.conflict(
      `Booth number ${data.boothNumber} already exists in this constituency.`,
    );

  return prisma.booth.create({
    data: { ...data, tenantId, boundary: data.boundary ?? Prisma.JsonNull },
  });
}

export async function getBooth(tenantId: string, id: string) {
  const booth = await prisma.booth.findFirst({
    where: { id, tenantId, isDeleted: false },
    include: {
      constituency: { select: { id: true, name: true } },
      ward: { select: { id: true, name: true, wardNumber: true } },
      townVillage: { select: { id: true, name: true, type: true } },
      pollingLocation: { select: { id: true, name: true, address: true } },
    },
  });
  if (!booth) throw ApiError.notFound("Booth not found.");
  return booth;
}

export async function listBooths(tenantId: string, params: any) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 20);
  const skip = (page - 1) * limit;

  const where: Prisma.BoothWhereInput = { tenantId, isDeleted: false };
  if (params.constituencyId) where.constituencyId = params.constituencyId;
  if (params.wardId) where.wardId = params.wardId;
  if (params.townVillageId) where.townVillageId = params.townVillageId;
  if (params.pollingLocationId)
    where.pollingLocationId = params.pollingLocationId;
  if (params.status === "ACTIVE") where.isActive = true;
  else if (params.status === "INACTIVE") where.isActive = false;

  if (params.search) {
    where.OR = [
      { boothName: { contains: params.search, mode: "insensitive" } },
      { code: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.booth.count({ where }),
    prisma.booth.findMany({
      where,
      skip,
      take: limit,
      orderBy: { boothNumber: "asc" },
      include: {
        constituency: { select: { id: true, name: true } },
        ward: { select: { id: true, name: true, wardNumber: true } },
        townVillage: { select: { id: true, name: true, type: true } },
        pollingLocation: { select: { id: true, name: true, address: true } },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), items };
}

export async function updateBooth(tenantId: string, id: string, data: any) {
  const booth = await getBooth(tenantId, id);

  const targetConstituencyId = data.constituencyId || booth.constituencyId;
  const targetWardId = data.wardId !== undefined ? data.wardId : booth.wardId;
  const targetTownVillageId =
    data.townVillageId !== undefined ? data.townVillageId : booth.townVillageId;
  const targetPollingLocationId =
    data.pollingLocationId !== undefined
      ? data.pollingLocationId
      : booth.pollingLocationId;
  await validateBoothParents(
    tenantId,
    targetConstituencyId,
    targetWardId,
    targetTownVillageId,
    targetPollingLocationId,
  );

  if (data.boothNumber && data.boothNumber !== booth.boothNumber) {
    const existing = await prisma.booth.findFirst({
      where: {
        tenantId,
        constituencyId: targetConstituencyId,
        boothNumber: data.boothNumber,
        id: { not: id },
        isDeleted: false,
      },
    });
    if (existing)
      throw ApiError.conflict(
        `Booth number ${data.boothNumber} already exists in this constituency.`,
      );
  }

  return prisma.booth.update({
    where: { id },
    data: {
      ...data,
      boundary:
        data.boundary !== undefined
          ? (data.boundary ?? Prisma.JsonNull)
          : undefined,
    },
  });
}

export async function deleteBooth(tenantId: string, id: string) {
  const booth = await getBooth(tenantId, id);

  const voterCount = await prisma.voter.count({
    where: { boothId: id, isDeleted: false },
  });

  if (voterCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete Booth. It has ${voterCount} assigned Voters. ` +
        `Deactivate it instead or resolve dependencies first.`,
    );
  }

  return prisma.booth.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isActive: false },
  });
}

export async function restoreBooth(tenantId: string, id: string) {
  const booth = await prisma.booth.findFirst({
    where: { id, tenantId, isDeleted: true },
  });
  if (!booth) throw ApiError.notFound("Booth not found or is not deleted.");

  return prisma.booth.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null, isActive: true },
  });
}

// ─── GEOGRAPHY TREE / STATS / OVERVIEW ───

export async function getTree(tenantId: string) {
  const [
    constituency,
    districts,
    blocks,
    townVillages,
    wards,
    booths,
    pollingLocations,
  ] = await Promise.all([
    prisma.constituency.findFirst({
      where: { tenantId, isActive: true, isDeleted: false },
      select: { id: true, name: true, type: true },
    }),
    prisma.district.findMany({
      where: { tenantId, isActive: true, isDeleted: false },
      select: { id: true, name: true, code: true },
    }),
    prisma.block.findMany({
      where: { tenantId, isActive: true, isDeleted: false },
      select: { id: true, name: true, districtId: true },
    }),
    prisma.townVillage.findMany({
      where: { tenantId, isActive: true, isDeleted: false },
      select: {
        id: true,
        name: true,
        districtId: true,
        blockId: true,
        constituencyId: true,
        type: true,
        nature: true,
      },
    }),
    prisma.ward.findMany({
      where: { tenantId, isDeleted: false, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        wardNumber: true,
        townVillageId: true,
        constituencyId: true,
      },
    }),
    prisma.booth.findMany({
      where: { tenantId, isActive: true, isDeleted: false },
      select: {
        id: true,
        boothName: true,
        boothNumber: true,
        wardId: true,
        townVillageId: true,
        constituencyId: true,
      },
    }),
    prisma.pollingLocation.findMany({
      where: { tenantId, isActive: true, isDeleted: false },
      select: { id: true, name: true, address: true },
    }),
  ]);

  return {
    constituency: constituency || null,
    districts,
    blocks,
    townVillages,
    wards,
    booths,
    pollingLocations,
  };
}

export async function getStats(tenantId: string) {
  const [districts, blocks, townVillages, wards, booths, pollingLocations] =
    await Promise.all([
      prisma.district.count({
        where: { tenantId, isDeleted: false },
      }),
      prisma.block.count({
        where: { tenantId, isDeleted: false },
      }),
      prisma.townVillage.count({
        where: { tenantId, isDeleted: false },
      }),
      prisma.ward.count({
        where: { tenantId, isDeleted: false },
      }),
      prisma.booth.count({
        where: { tenantId, isDeleted: false },
      }),
      prisma.pollingLocation.count({
        where: { tenantId, isDeleted: false },
      }),
    ]);

  return {
    districts,
    blocks,
    townVillages,
    wards,
    booths,
    pollingLocations,
  };
}

export async function getOverview(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true },
  });

  const statistics = await getStats(tenantId);
  const totalConstituencies = await prisma.constituency.count({
    where: { tenantId, isDeleted: false },
  });

  const constituencies = await prisma.constituency.findMany({
    where: { tenantId, isDeleted: false },
    include: {
      district: {
        select: { id: true, name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const enrichedConstituencies = await Promise.all(
    constituencies.map(async (c) => {
      const representative = await prisma.representativeProfile.findUnique({
        where: { constituencyId: c.id },
      });

      const [wardsCount, townVillagesCount, boothsCount, booths] = await Promise.all([
        prisma.ward.count({
          where: {
            tenantId,
            isDeleted: false,
            OR: [
              { constituencyId: c.id },
              { constituencyWards: { some: { constituencyId: c.id } } },
            ],
          },
        }),
        prisma.townVillage.count({
          where: { constituencyId: c.id, isDeleted: false },
        }),
        prisma.booth.count({
          where: { constituencyId: c.id, isDeleted: false },
        }),
        prisma.booth.findMany({
          where: { constituencyId: c.id, isDeleted: false, pollingLocationId: { not: null } },
          select: { pollingLocationId: true },
        }),
      ]);

      const pollingLocationIds = Array.from(
        new Set(booths.map((b) => b.pollingLocationId).filter(Boolean)),
      );

      return {
        id: c.id,
        name: c.name,
        code: c.code,
        type: c.type,
        district: c.district,
        representative,
        counts: {
          wards: wardsCount,
          townVillages: townVillagesCount,
          booths: boothsCount,
          pollingLocations: pollingLocationIds.length,
        },
      };
    }),
  );

  return {
    tenant: tenant || { id: tenantId, name: "Public Service Office" },
    counts: {
      constituencies: totalConstituencies,
      districts: statistics.districts,
      blocks: statistics.blocks,
      townVillages: statistics.townVillages,
      wards: statistics.wards,
      booths: statistics.booths,
      pollingLocations: statistics.pollingLocations,
    },
    constituencies: enrichedConstituencies,
  };
}
