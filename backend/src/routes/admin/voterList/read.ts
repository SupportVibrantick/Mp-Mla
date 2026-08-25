import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { VoterGender, Prisma } from "@prisma/client";

// ══════════════════════════════════════════════════════════
// LIST VOTERS (paginated, filterable)
// ══════════════════════════════════════════════════════════

export async function listVoters(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const {
      page = 1,
      limit = 50,
      search,
      wardId,
      wardAreaId,
      boothId,
      boothNo,
      sectionNo,
      gender,
      ageMin,
      ageMax,
      isNewVoter,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query as any;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Prisma.VoterWhereInput = {
      tenantId,
      isDeleted: false,
    };

    if (wardId) where.wardId = String(wardId);
    if (wardAreaId) where.wardAreaId = String(wardAreaId);
    if (boothId) where.boothId = String(boothId);
    if (boothNo) where.boothNo = Number(boothNo);
    if (sectionNo) where.sectionNo = Number(sectionNo);
    if (gender) where.gender = gender as VoterGender;

    if (ageMin || ageMax) {
      where.age = {};
      if (ageMin) where.age.gte = Number(ageMin);
      if (ageMax) where.age.lte = Number(ageMax);
    }

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { name: { contains: searchStr, mode: "insensitive" } },
        { voterIdNumber: { contains: searchStr, mode: "insensitive" } },
        { relativeName: { contains: searchStr, mode: "insensitive" } },
        { phone: { contains: searchStr, mode: "insensitive" } },
      ];
    }

    // Build orderBy
    const validSortFields: Record<string, string> = {
      name: "name",
      age: "age",
      voterIdNumber: "voterIdNumber",
      slNo: "slNo",
      createdAt: "createdAt",
    };
    const orderField = validSortFields[sortBy] || "createdAt";
    const orderDir = sortOrder === "asc" ? "asc" : "desc";

    const [voters, total] = await Promise.all([
      prisma.voter.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [orderField]: orderDir },
        select: {
          id: true,
          voterIdNumber: true,
          slNo: true,
          sectionNo: true,
          boothNo: true,
          name: true,
          relativeName: true,
          relationType: true,
          gender: true,
          age: true,
          houseNo: true,
          address: true,
          locality: true,
          phone: true,
          isDisabled: true,
          status: true,
          wardId: true,
          wardAreaId: true,
          createdAt: true,
          ward: { select: { id: true, name: true, wardNumber: true } },
          wardArea: { select: { id: true, name: true } },
        },
      }),
      prisma.voter.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        voters,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// GET SINGLE VOTER
// ══════════════════════════════════════════════════════════

export async function getVoter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const voter = await prisma.voter.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        ward: { select: { id: true, name: true, wardNumber: true } },
        wardArea: { select: { id: true, name: true } },
        uploadBatch: {
          select: { id: true, fileName: true, createdAt: true },
        },
      },
    });

    if (!voter) {
      res.status(404).json({ success: false, message: "Voter not found" });
      return;
    }

    res.json({ success: true, data: voter });
  } catch (err) {
    next(err);
  }
}

// ══════════════════════════════════════════════════════════
// VOTER STATS (aggregate demographics)
// ══════════════════════════════════════════════════════════

export async function getVoterStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { wardId } = req.query as any;

    const baseWhere: Prisma.VoterWhereInput = {
      tenantId,
      isDeleted: false,
    };
    if (wardId) baseWhere.wardId = String(wardId);

    // Total count
    const totalVoters = await prisma.voter.count({ where: baseWhere });

    // Gender distribution
    const genderStats = await prisma.voter.groupBy({
      by: ["gender"],
      where: baseWhere,
      _count: { id: true },
    });

    // Age distribution (bands)
    const [age18to25, age26to35, age36to50, age51to65, age65plus] =
      await Promise.all([
        prisma.voter.count({
          where: { ...baseWhere, age: { gte: 18, lte: 25 } },
        }),
        prisma.voter.count({
          where: { ...baseWhere, age: { gte: 26, lte: 35 } },
        }),
        prisma.voter.count({
          where: { ...baseWhere, age: { gte: 36, lte: 50 } },
        }),
        prisma.voter.count({
          where: { ...baseWhere, age: { gte: 51, lte: 65 } },
        }),
        prisma.voter.count({
          where: { ...baseWhere, age: { gte: 66 } },
        }),
      ]);

    // Ward-wise distribution
    const wardStats = await prisma.voter.groupBy({
      by: ["wardId"],
      where: baseWhere,
      _count: { id: true },
    });

    // Fetch ward names for ward stats
    const wardIds = wardStats.map((w) => w.wardId);
    const wards = await prisma.ward.findMany({
      where: { id: { in: wardIds } },
      select: { id: true, name: true, wardNumber: true },
    });
    const wardMap = new Map(wards.map((w) => [w.id, w]));

    // Booth-wise distribution (top 20 booths)
    const boothStats = await prisma.voter.groupBy({
      by: ["boothNo"],
      where: { ...baseWhere, boothNo: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });

    // Disabled voters count
    const disabledCount = await prisma.voter.count({
      where: { ...baseWhere, isDisabled: true },
    });

    res.json({
      success: true,
      data: {
        totalVoters,
        disabledCount,
        gender: genderStats.reduce(
          (acc, g) => {
            acc[g.gender] = g._count.id;
            return acc;
          },
          {} as Record<string, number>,
        ),
        ageBands: {
          "18-25": age18to25,
          "26-35": age26to35,
          "36-50": age36to50,
          "51-65": age51to65,
          "65+": age65plus,
        },
        wardWise: wardStats.map((w) => ({
          wardId: w.wardId,
          wardName: wardMap.get(w.wardId)?.name || "Unknown",
          wardNumber: wardMap.get(w.wardId)?.wardNumber,
          count: w._count.id,
        })),
        boothWise: boothStats.map((b) => ({
          boothNo: b.boothNo,
          count: b._count.id,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}
