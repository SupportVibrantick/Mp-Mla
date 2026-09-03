import prisma from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { Prisma } from "@prisma/client";
import { archiveToRecycleBin } from "../lib/recycleBin.js";
import { deleteFile, getUploadPath } from "../lib/upload.js";

export async function createConstituency(
  tenantId: string,
  data: {
    name: string;
    code?: string | null;
    type?: "ASSEMBLY" | "PARLIAMENTARY";
    districtId?: string | null;
    description?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    boundary?: any;
  },
) {
  // Check uniqueness of tenantId + name
  const existingName = await prisma.constituency.findFirst({
    where: { tenantId, name: data.name, isDeleted: false },
  });
  if (existingName) {
    throw ApiError.conflict(
      "A constituency with this name already exists in this tenant.",
    );
  }

  if (data.code) {
    const existingCode = await prisma.constituency.findFirst({
      where: { tenantId, code: data.code, isDeleted: false },
    });
    if (existingCode) {
      throw ApiError.conflict(
        "A constituency with this code already exists in this tenant.",
      );
    }
  }

  // If districtId is provided, verify cross-tenant boundary
  if (data.districtId) {
    const district = await prisma.district.findFirst({
      where: { id: data.districtId, tenantId, isDeleted: false },
    });
    if (!district) {
      throw ApiError.badRequest(
        "Selected district does not belong to this organization.",
      );
    }
  }

  return prisma.constituency.create({
    data: {
      ...data,
      tenantId,
      boundary: data.boundary ?? Prisma.JsonNull,
    },
  });
}

export async function getConstituency(tenantId: string, id: string) {
  const constituency = await prisma.constituency.findFirst({
    where: { id, tenantId, isDeleted: false },
    include: { district: { select: { id: true, name: true } } },
  });
  if (!constituency) {
    throw ApiError.notFound("Constituency not found.");
  }
  return constituency;
}

export async function listConstituency(
  tenantId: string,
  params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
    districtId?: string;
  },
) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 20);
  const skip = (page - 1) * limit;

  const where: Prisma.ConstituencyWhereInput = { tenantId, isDeleted: false };

  if (params.districtId) {
    where.districtId = params.districtId;
  }

  if (params.status === "ACTIVE") {
    where.isActive = true;
  } else if (params.status === "INACTIVE") {
    where.isActive = false;
  }

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { code: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.constituency.count({ where }),
    prisma.constituency.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: { district: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    items,
  };
}

export async function updateConstituency(
  tenantId: string,
  id: string,
  data: {
    name?: string;
    code?: string | null;
    type?: "ASSEMBLY" | "PARLIAMENTARY";
    districtId?: string | null;
    description?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    boundary?: any;
    isActive?: boolean;
  },
) {
  const constituency = await getConstituency(tenantId, id);

  if (data.name && data.name !== constituency.name) {
    const existingName = await prisma.constituency.findFirst({
      where: { tenantId, name: data.name, id: { not: id }, isDeleted: false },
    });
    if (existingName) {
      throw ApiError.conflict(
        "A constituency with this name already exists in this tenant.",
      );
    }
  }

  if (data.code && data.code !== constituency.code) {
    const existingCode = await prisma.constituency.findFirst({
      where: { tenantId, code: data.code, id: { not: id }, isDeleted: false },
    });
    if (existingCode) {
      throw ApiError.conflict(
        "A constituency with this code already exists in this tenant.",
      );
    }
  }

  if (data.districtId && data.districtId !== constituency.districtId) {
    const district = await prisma.district.findFirst({
      where: { id: data.districtId, tenantId, isDeleted: false },
    });
    if (!district) {
      throw ApiError.badRequest(
        "Selected district does not belong to this organization.",
      );
    }
  }

  return prisma.constituency.update({
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

// export async function deleteConstituency(tenantId: string, id: string) {
//   const constituency = await getConstituency(tenantId, id);

//   const boothCount = await prisma.booth.count({
//     where: { constituencyId: id, isDeleted: false },
//   });
//   if (boothCount > 0) {
//     throw ApiError.badRequest(
//       `Cannot delete constituency ${constituency.name}. It has ${boothCount} Booths assigned. ` +
//         `Deactivate it instead or resolve dependencies first.`,
//     );
//   }

//   return prisma.constituency.update({
//     where: { id },
//     data: { isDeleted: true, deletedAt: new Date(), isActive: false },
//   });
// }

export async function deleteConstituency(
  tenantId: string,
  constituencyId: string,
) {
  const constituency = await prisma.constituency.findFirst({
    where: {
      id: constituencyId,
      tenantId,
      isDeleted: false,
    },
  });

  if (!constituency) {
    throw ApiError.notFound("Constituency not found");
  }

  /**
   * Do not allow deleting an already inactive/deleted record.
   */
  if (constituency.isDeleted) {
    throw ApiError.badRequest("Constituency is already in recycle bin");
  }

  /**
   * Check active dependent records.
   *
   * Ward has isDeleted.
   * Town/village and Booth use isActive.
   */
  const [
    activeWardCount,
    activeTownVillageCount,
    activeBoothCount,
  ] = await Promise.all([
    prisma.ward.count({
      where: {
        tenantId,
        constituencyId,
        isDeleted: false,
      },
    }),

    prisma.townVillage.count({
      where: {
        tenantId,
        constituencyId,
        isActive: true,
      },
    }),

    prisma.booth.count({
      where: {
        tenantId,
        constituencyId,
        isActive: true,
      },
    }),
  ]);

  if (
    activeWardCount > 0 ||
    activeTownVillageCount > 0 ||
    activeBoothCount > 0
  ) {
    throw ApiError.badRequest(
      `Cannot delete constituency. ` +
        `${activeWardCount} active wards, ` +
        `${activeTownVillageCount} active towns/villages, ` +
        `${activeBoothCount} active booths reference this constituency. ` +
        `Deactivate or unlink these records first.`,
    );
  }

  // Auto-clean representative profile if present so it doesn't block deletion
  const representativeProfile = await prisma.representativeProfile.findFirst({
    where: { tenantId, constituencyId },
  });

  if (representativeProfile) {
    await archiveToRecycleBin({
      tenantId,
      module: "constituency",
      entityType: "representative_profile" as any,
      recordId: representativeProfile.id,
      recordLabel: `Representative: ${representativeProfile.name}`,
      payload: representativeProfile,
      deletedById: undefined,
    }).catch(() => null);

    if (representativeProfile.photoUrl) {
      deleteFile(representativeProfile.photoUrl);
    }

    await prisma.representativeProfile.delete({
      where: { id: representativeProfile.id },
    });
  }

  /**
   * Archive original data.
   */
  await archiveToRecycleBin({
    tenantId,
    module: "constituency",
    entityType: "constituency",
    recordId: constituency.id,
    recordLabel: constituency.name,
    payload: constituency,
    deletedById: undefined,
  });

  /**
   * Soft delete.
   */
  return prisma.constituency.update({
    where: {
      id: constituency.id,
    },
    data: {
      isDeleted: true,
      isActive: false,
    },
  });
}

export async function deleteRepresentativeProfile(
  tenantId: string,
  constituencyId: string,
) {
  await getConstituency(tenantId, constituencyId);

  const profile = await prisma.representativeProfile.findFirst({
    where: {
      tenantId,
      constituencyId,
    },
  });

  if (!profile) {
    throw ApiError.notFound(
      "Representative profile not found for this constituency.",
    );
  }

  if (profile.photoUrl) {
    deleteFile(profile.photoUrl);
  }

  await archiveToRecycleBin({
    tenantId,
    module: "constituency",
    entityType: "representative_profile" as any,
    recordId: profile.id,
    recordLabel: `Representative: ${profile.name}`,
    payload: profile,
    deletedById: undefined,
  }).catch(() => null);

  return prisma.representativeProfile.delete({
    where: {
      id: profile.id,
    },
  });
}

export async function restoreConstituency(tenantId: string, id: string) {
  const constituency = await prisma.constituency.findFirst({
    where: { id, tenantId, isDeleted: true },
  });
  if (!constituency)
    throw ApiError.notFound("Constituency not found or is not deleted.");

  return prisma.constituency.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null, isActive: true },
  });
}

// ─── REPRESENTATIVE PROFILE ───

export async function getRepresentativeProfile(
  tenantId: string,
  constituencyId: string,
) {
  await getConstituency(tenantId, constituencyId);

  const profile = await prisma.representativeProfile.findFirst({
    where: {
      tenantId,
      constituencyId,
    },
  });

  if (!profile) {
    throw ApiError.notFound(
      "Representative profile not found for this constituency.",
    );
  }

  return profile;
}

export async function upsertRepresentativeProfile(
  tenantId: string,
  constituencyId: string,
  data: {
    name: string;
    title: string;
    partyName?: string | null;
    partyLogoUrl?: string | null;
    termStartDate?: Date | string | null;
    termEndDate?: Date | string | null;
    officePhone?: string | null;
    officeEmail?: string | null;
    officeAddress?: string | null;
  },
) {
  await getConstituency(tenantId, constituencyId);

  const parsedStartDate = data.termStartDate
    ? new Date(data.termStartDate)
    : null;

  const parsedEndDate = data.termEndDate ? new Date(data.termEndDate) : null;

  const existing = await prisma.representativeProfile.findFirst({
    where: {
      tenantId,
      constituencyId,
    },
  });

  if (existing) {
    return prisma.representativeProfile.update({
      where: {
        id: existing.id,
      },
      data: {
        name: data.name,
        title: data.title,
        partyName: data.partyName ?? null,
        partyLogoUrl: data.partyLogoUrl ?? null,
        termStartDate: parsedStartDate,
        termEndDate: parsedEndDate,
        officePhone: data.officePhone ?? null,
        officeEmail: data.officeEmail ?? null,
        officeAddress: data.officeAddress ?? null,
      },
    });
  }

  return prisma.representativeProfile.create({
    data: {
      tenantId,
      constituencyId,
      name: data.name,
      title: data.title,
      partyName: data.partyName ?? null,
      partyLogoUrl: data.partyLogoUrl ?? null,
      termStartDate: parsedStartDate,
      termEndDate: parsedEndDate,
      officePhone: data.officePhone ?? null,
      officeEmail: data.officeEmail ?? null,
      officeAddress: data.officeAddress ?? null,
    },
  });
}
export async function uploadRepresentativePhoto(
  tenantId: string,
  constituencyId: string,
  file: Express.Multer.File,
  userId: string,
) {
  await getConstituency(tenantId, constituencyId);

  const profile = await prisma.representativeProfile.findFirst({
    where: {
      tenantId,
      constituencyId,
    },
  });

  if (!profile) {
    throw ApiError.notFound(
      "Create the representative profile before uploading a photo.",
    );
  }

  const photoUrl = getUploadPath(file.filename, "attachments");

  const oldPhotoUrl = profile.photoUrl;

  const updated = await prisma.representativeProfile.update({
    where: {
      id: profile.id,
    },
    data: {
      photoUrl,
    },
  });

  // Delete old physical file after DB update succeeds.
  if (oldPhotoUrl && oldPhotoUrl !== photoUrl) {
    deleteFile(oldPhotoUrl);
  }

  return updated;
}
export async function deleteRepresentativePhoto(
  tenantId: string,
  constituencyId: string,
) {
  await getConstituency(tenantId, constituencyId);

  const profile = await prisma.representativeProfile.findFirst({
    where: {
      tenantId,
      constituencyId,
    },
  });

  if (!profile) {
    throw ApiError.notFound("Representative profile not found.");
  }

  const oldPhotoUrl = profile.photoUrl;

  const updated = await prisma.representativeProfile.update({
    where: {
      id: profile.id,
    },
    data: {
      photoUrl: null,
    },
  });

  if (oldPhotoUrl) {
    deleteFile(oldPhotoUrl);
  }

  return updated;
}
// ─── CONSTITUENCY WARD MAPPINGS ───

export async function getConstituencyWards(
  tenantId: string,
  constituencyId: string,
) {
  await getConstituency(tenantId, constituencyId);

  const [mappings, directWards] = await Promise.all([
    prisma.constituencyWard.findMany({
      where: { tenantId, constituencyId },
      include: {
        ward: {
          select: {
            id: true,
            name: true,
            wardNumber: true,
            townVillage: { select: { id: true, name: true, type: true } },
            status: true,
            constituencyId: true,
          },
        },
      },
      orderBy: { ward: { wardNumber: "asc" } },
    }),
    prisma.ward.findMany({
      where: { tenantId, constituencyId, isDeleted: false },
      select: {
        id: true,
        name: true,
        wardNumber: true,
        townVillage: { select: { id: true, name: true, type: true } },
        status: true,
        constituencyId: true,
      },
      orderBy: { wardNumber: "asc" },
    }),
  ]);

  const mapWards = mappings.map((m) => m.ward).filter(Boolean);
  const wardMap = new Map<string, any>();
  for (const w of [...mapWards, ...directWards]) {
    if (w && !wardMap.has(w.id)) {
      wardMap.set(w.id, w);
    }
  }

  return Array.from(wardMap.values()).sort((a, b) => a.wardNumber - b.wardNumber);
}

export async function linkWardToConstituency(
  tenantId: string,
  constituencyId: string,
  wardId: string,
) {
  await getConstituency(tenantId, constituencyId);

  const ward = await prisma.ward.findFirst({
    where: { id: wardId, tenantId, isDeleted: false },
  });
  if (!ward) throw ApiError.notFound("Ward not found.");

  await prisma.ward.update({
    where: { id: wardId },
    data: { constituencyId },
  });

  return prisma.constituencyWard.upsert({
    where: { constituencyId_wardId: { constituencyId, wardId } },
    update: {},
    create: { tenantId, constituencyId, wardId },
  });
}

export async function unlinkWardFromConstituency(
  tenantId: string,
  constituencyId: string,
  wardId: string,
) {
  await getConstituency(tenantId, constituencyId);

  await prisma.ward.updateMany({
    where: { id: wardId, constituencyId },
    data: { constituencyId: null },
  });

  return prisma.constituencyWard.deleteMany({
    where: { constituencyId, wardId },
  });
}

// ─── CONSTITUENCY TOWN/VILLAGE LINKS ───

export async function getConstituencyTownVillages(
  tenantId: string,
  constituencyId: string,
) {
  await getConstituency(tenantId, constituencyId);

  return prisma.townVillage.findMany({
    where: { tenantId, constituencyId, isDeleted: false },
    include: {
      district: { select: { id: true, name: true } },
      block: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function linkTownVillageToConstituency(
  tenantId: string,
  constituencyId: string,
  townVillageId: string,
) {
  await getConstituency(tenantId, constituencyId);

  const townVillage = await prisma.townVillage.findFirst({
    where: { id: townVillageId, tenantId, isDeleted: false },
  });
  if (!townVillage) throw ApiError.notFound("Town/village not found.");

  return prisma.townVillage.update({
    where: { id: townVillageId },
    data: { constituencyId },
  });
}

export async function unlinkTownVillageFromConstituency(
  tenantId: string,
  constituencyId: string,
  townVillageId: string,
) {
  await getConstituency(tenantId, constituencyId);

  const townVillage = await prisma.townVillage.findFirst({
    where: { id: townVillageId, tenantId, constituencyId, isDeleted: false },
  });
  if (!townVillage) throw ApiError.notFound("Town/village link not found.");
  return prisma.townVillage.update({
    where: { id: townVillageId },
    data: { constituencyId: null },
  });
}
