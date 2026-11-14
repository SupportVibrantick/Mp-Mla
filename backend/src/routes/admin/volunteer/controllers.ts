import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { ApiError } from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import catchAsync from "../../../utils/catchAsync.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { env } from "@/lib/env.js";
import { validatePasswordComplexity } from "../../../lib/authUtils.js";
import {
  assertCanCreateUser,
  assertCanCreateVoters,
} from "../../../lib/quota.js";
import { generateApplicationNumber } from "../../../services/voterPortal/applicationNumber.service.js";
import { createVoterAccountForVoter } from "../../../services/voterPortal/voterAuth.service.js";
import { syncVoterDemographics } from "../voterList/demographicsSync.js";

// ══════════════════════════════════════════════════════════
// ADMIN: LIST VOLUNTEERS
// ══════════════════════════════════════════════════════════

export const listVolunteers = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const skip = (page - 1) * limit;
    const search = (req.query.search as string)?.trim();
    const wardId = req.query.wardId as string;
    const status = req.query.status as string;

    const where: any = {
      tenantId,
      role: "WARD_VOLUNTEER",
      isDeleted: false,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (wardId) {
      where.wardAssignments = {
        some: {
          wardId,
          status: "ACTIVE",
        },
      };
    }

    const [volunteers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          designation: true,
          createdAt: true,
          lastLoginAt: true,
          wardAssignments: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              wardId: true,
              status: true,
              assignedAt: true,
              ward: {
                select: {
                  id: true,
                  wardNumber: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              votersCreated: true,
              volunteerSubmissions: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const formatted = volunteers.map((v) => ({
      id: v.id,
      name: v.name,
      email: v.email,
      phone: v.phone,
      status: v.status,
      designation: v.designation,
      createdAt: v.createdAt,
      lastLoginAt: v.lastLoginAt,
      activeWardsCount: v.wardAssignments.length,
      assignedWards: v.wardAssignments.map((a) => ({
        id: a.ward.id,
        wardNumber: a.ward.wardNumber,
        name: a.ward.name,
        assignmentId: a.id,
        assignedAt: a.assignedAt,
      })),
      totalVotersRegistered: v._count.votersCreated,
      totalSubmissions: v._count.volunteerSubmissions,
    }));

    res.json(
      ApiResponse.success(
        {
          volunteers: formatted,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        "Volunteers fetched successfully",
      ),
    );
  },
);

// ══════════════════════════════════════════════════════════
// ADMIN: CREATE VOLUNTEER
// ══════════════════════════════════════════════════════════

export const createVolunteer = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { name, email, phone, password, designation, wardIds, notes } =
      req.body;

    // Check email collision
    const existingEmail = await prisma.user.findFirst({
      where: { tenantId, email },
    });
    if (existingEmail) {
      throw ApiError.conflict(
        "User with this email already exists in this organization.",
      );
    }

    // Check phone collision
    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: { tenantId, phone },
      });
      if (existingPhone) {
        throw ApiError.conflict(
          "User with this phone number already exists in this organization.",
        );
      }
    }

    // Verify wardIds if provided
    if (wardIds && Array.isArray(wardIds) && wardIds.length > 0) {
      const validWards = await prisma.ward.findMany({
        where: { tenantId, id: { in: wardIds }, isDeleted: false },
        select: { id: true },
      });
      if (validWards.length !== wardIds.length) {
        throw ApiError.badRequest(
          "One or more assigned wards were not found in this organization.",
        );
      }
    }

    await assertCanCreateUser(tenantId);
    await validatePasswordComplexity(password, tenantId);

    const hashedPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

    const newVolunteer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone || null,
          password: hashedPassword,
          role: "WARD_VOLUNTEER",
          status: "ACTIVE",
          designation: designation?.trim() || "Ward Volunteer",
          forcePasswordChange: false,
          createdById: req.user?.id || null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          designation: true,
          createdAt: true,
        },
      });

      if (wardIds && Array.isArray(wardIds) && wardIds.length > 0) {
        await tx.wardVolunteerAssignment.createMany({
          data: wardIds.map((wId: string) => ({
            tenantId,
            userId: user.id,
            wardId: wId,
            assignedById: req.user?.id || null,
            status: "ACTIVE",
            notes: notes?.trim() || null,
          })),
          skipDuplicates: true,
        });
      }

      return user;
    });

    // Audit log
    createAuditLog({
      userId: req.user!.id,
      tenantId,
      action: "CREATE",
      module: "volunteers",
      recordId: newVolunteer.id,
      description: `Created volunteer "${newVolunteer.name}" (${newVolunteer.email}) with ${wardIds?.length || 0} ward(s)`,
      newData: { name, email, phone, wardIds },
      ...getRequestMeta(req),
    }).catch(() => {});

    res
      .status(201)
      .json(
        ApiResponse.created(
          newVolunteer,
          "Volunteer account created successfully",
        ),
      );
  },
);

// ══════════════════════════════════════════════════════════
// ADMIN: AGGREGATE VOLUNTEER STATS
// ══════════════════════════════════════════════════════════

export const getVolunteerStats = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const [
      totalVolunteers,
      activeVolunteers,
      totalWards,
      wardsWithVolunteers,
      totalVotersByVolunteers,
      todayVotersByVolunteers,
      weekVotersByVolunteers,
      topVolunteers,
    ] = await Promise.all([
      prisma.user.count({
        where: { tenantId, role: "WARD_VOLUNTEER", isDeleted: false },
      }),
      prisma.user.count({
        where: {
          tenantId,
          role: "WARD_VOLUNTEER",
          status: "ACTIVE",
          isDeleted: false,
        },
      }),
      prisma.ward.count({
        where: { tenantId, isDeleted: false },
      }),
      prisma.wardVolunteerAssignment.findMany({
        where: { tenantId, status: "ACTIVE" },
        distinct: ["wardId"],
        select: { wardId: true },
      }),
      prisma.voter.count({
        where: {
          tenantId,
          isDeleted: false,
          createdByUser: { role: "WARD_VOLUNTEER" },
        },
      }),
      prisma.voter.count({
        where: {
          tenantId,
          isDeleted: false,
          createdAt: { gte: todayStart },
          createdByUser: { role: "WARD_VOLUNTEER" },
        },
      }),
      prisma.voter.count({
        where: {
          tenantId,
          isDeleted: false,
          createdAt: { gte: weekStart },
          createdByUser: { role: "WARD_VOLUNTEER" },
        },
      }),
      prisma.user.findMany({
        where: { tenantId, role: "WARD_VOLUNTEER", isDeleted: false },
        take: 5,
        orderBy: { votersCreated: { _count: "desc" } },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          wardAssignments: {
            where: { status: "ACTIVE" },
            select: {
              ward: { select: { wardNumber: true, name: true } },
            },
          },
          _count: {
            select: { votersCreated: true },
          },
        },
      }),
    ]);

    const assignedWardsCount = wardsWithVolunteers.length;
    const wardCoveragePct =
      totalWards > 0 ? Math.round((assignedWardsCount / totalWards) * 100) : 0;

    res.json(
      ApiResponse.success(
        {
          totalVolunteers,
          activeVolunteers,
          totalWards,
          assignedWardsCount,
          wardCoveragePct,
          totalVotersRegistered: totalVotersByVolunteers,
          todayVotersRegistered: todayVotersByVolunteers,
          weekVotersRegistered: weekVotersByVolunteers,
          topVolunteers: topVolunteers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            wards: u.wardAssignments.map(
              (a) => `Ward ${a.ward.wardNumber} - ${a.ward.name}`,
            ),
            votersCount: u._count.votersCreated,
          })),
        },
        "Volunteer statistics fetched successfully",
      ),
    );
  },
);

// ══════════════════════════════════════════════════════════
// ADMIN: GET SINGLE VOLUNTEER
// ══════════════════════════════════════════════════════════

export const getVolunteer = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const id = req.params.id as string;

  const volunteer = await prisma.user.findFirst({
    where: { id, tenantId, role: "WARD_VOLUNTEER", isDeleted: false },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      designation: true,
      createdAt: true,
      lastLoginAt: true,
      wardAssignments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          notes: true,
          assignedAt: true,
          endedAt: true,
          ward: {
            select: {
              id: true,
              wardNumber: true,
              name: true,
              zone: true,
              _count: {
                select: { voters: true },
              },
            },
          },
        },
      },
      _count: {
        select: {
          votersCreated: true,
          volunteerSubmissions: true,
        },
      },
      votersCreated: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          voterIdNumber: true,
          applicationNumber: true,
          gender: true,
          age: true,
          phone: true,
          createdAt: true,
          ward: { select: { wardNumber: true, name: true } },
        },
      },
    },
  });

  if (!volunteer) {
    throw ApiError.notFound("Volunteer not found");
  }

  res.json(
    ApiResponse.success(volunteer, "Volunteer details fetched successfully"),
  );
});

// ══════════════════════════════════════════════════════════
// ADMIN: LIST ALL VOTERS REGISTERED BY A SPECIFIC VOLUNTEER
// ══════════════════════════════════════════════════════════

export const getVolunteerVoters = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const volunteerId = req.params.id as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const skip = (page - 1) * limit;
    const search = (req.query.search as string)?.trim();
    const wardId = req.query.wardId as string;

    // Verify volunteer belongs to tenant
    const volunteer = await prisma.user.findFirst({
      where: { id: volunteerId, tenantId, isDeleted: false },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!volunteer) {
      throw ApiError.notFound("Volunteer not found");
    }

    const where: any = {
      tenantId,
      createdByUserId: volunteerId,
      isDeleted: false,
    };

    if (wardId && wardId !== "ALL") {
      where.wardId = wardId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { voterIdNumber: { contains: search, mode: "insensitive" } },
        { applicationNumber: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [voters, total] = await Promise.all([
      prisma.voter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          voterIdNumber: true,
          applicationNumber: true,
          gender: true,
          age: true,
          phone: true,
          locality: true,
          address: true,
          isOurVoter: true,
          voterLeaning: true,
          createdAt: true,
          ward: { select: { id: true, wardNumber: true, name: true } },
          _count: { select: { familyMembers: true } },
          familyMembers: {
            select: {
              id: true,
              name: true,
              relationType: true,
              gender: true,
              age: true,
              phone: true,
              voterIdNumber: true,
              isDependent: true,
            },
          },
        },
      }),
      prisma.voter.count({ where }),
    ]);

    res.json(
      ApiResponse.success(
        {
          volunteer,
          voters,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        `Voters registered by ${volunteer.name} fetched successfully`,
      ),
    );
  },
);

// ══════════════════════════════════════════════════════════
// ADMIN: UPDATE VOLUNTEER
// ══════════════════════════════════════════════════════════

export const updateVolunteer = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const { name, phone, designation, status, password } = req.body;

    const existing = await prisma.user.findFirst({
      where: { id, tenantId, role: "WARD_VOLUNTEER", isDeleted: false },
    });

    if (!existing) {
      throw ApiError.notFound("Volunteer not found");
    }

    if (phone && phone !== existing.phone) {
      const phoneExists = await prisma.user.findFirst({
        where: { tenantId, phone, id: { not: id } },
      });
      if (phoneExists) {
        throw ApiError.conflict(
          "Phone number is already in use by another user",
        );
      }
    }

    let hashedPassword: string | undefined;
    if (password) {
      await validatePasswordComplexity(password, tenantId);
      hashedPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone !== undefined && { phone }),
        ...(designation !== undefined && {
          designation: designation?.trim() || null,
        }),
        ...(status && { status }),
        ...(hashedPassword && { password: hashedPassword }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        designation: true,
        updatedAt: true,
      },
    });

    // Audit log
    createAuditLog({
      userId: req.user!.id,
      tenantId,
      action: "UPDATE",
      module: "volunteers",
      recordId: id,
      description: `Updated volunteer account "${updated.name}" (${existing.email})`,
      oldData: {
        name: existing.name,
        phone: existing.phone,
        status: existing.status,
      },
      newData: { name, phone, status, designation },
      ...getRequestMeta(req),
    }).catch(() => {});

    res.json(ApiResponse.success(updated, "Volunteer updated successfully"));
  },
);

// ══════════════════════════════════════════════════════════
// ADMIN: ASSIGN WARDS TO VOLUNTEER
// ══════════════════════════════════════════════════════════

export const assignVolunteerWards = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const { wardIds, notes } = req.body;

    const volunteer = await prisma.user.findFirst({
      where: { id, tenantId, role: "WARD_VOLUNTEER", isDeleted: false },
    });

    if (!volunteer) {
      throw ApiError.notFound("Volunteer not found");
    }

    // Validate all wardIds belong to tenant
    const validWards = await prisma.ward.findMany({
      where: { tenantId, id: { in: wardIds }, isDeleted: false },
      select: { id: true, wardNumber: true, name: true },
    });

    if (validWards.length !== wardIds.length) {
      throw ApiError.badRequest(
        "One or more wards were not found in this organization",
      );
    }

    // Upsert assignments
    await prisma.$transaction(
      wardIds.map((wId: string) =>
        prisma.wardVolunteerAssignment.upsert({
          where: {
            wardId_userId: {
              wardId: wId,
              userId: id,
            },
          },
          create: {
            tenantId,
            userId: id,
            wardId: wId,
            assignedById: req.user?.id || null,
            status: "ACTIVE",
            notes: notes?.trim() || null,
          },
          update: {
            status: "ACTIVE",
            endedAt: null,
            assignedById: req.user?.id || null,
            ...(notes !== undefined && { notes: notes?.trim() || null }),
          },
        }),
      ),
    );

    // Audit log
    createAuditLog({
      userId: req.user!.id,
      tenantId,
      action: "UPDATE",
      module: "volunteers",
      recordId: id,
      description: `Assigned ${wardIds.length} ward(s) to volunteer ${volunteer.name}`,
      newData: { wardIds, notes },
      ...getRequestMeta(req),
    }).catch(() => {});

    const currentAssignments = await prisma.wardVolunteerAssignment.findMany({
      where: { userId: id, status: "ACTIVE" },
      include: { ward: { select: { id: true, wardNumber: true, name: true } } },
    });

    res.json(
      ApiResponse.success(currentAssignments, "Wards assigned successfully"),
    );
  },
);

// ══════════════════════════════════════════════════════════
// ADMIN: REVOKE WARD ASSIGNMENT
// ══════════════════════════════════════════════════════════

export const revokeVolunteerWard = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const wardId = req.params.wardId as string;

    const assignment = await prisma.wardVolunteerAssignment.findFirst({
      where: { userId: id, wardId, tenantId },
    });

    if (!assignment) {
      throw ApiError.notFound("Ward assignment not found");
    }

    await prisma.wardVolunteerAssignment.update({
      where: { id: assignment.id },
      data: {
        status: "REVOKED",
        endedAt: new Date(),
      },
    });

    // Audit log
    createAuditLog({
      userId: req.user!.id,
      tenantId,
      action: "DELETE",
      module: "volunteers",
      recordId: assignment.id,
      description: `Revoked ward access for volunteer ${id} on ward ${wardId}`,
      ...getRequestMeta(req),
    }).catch(() => {});

    res.json(ApiResponse.success(null, "Ward assignment revoked successfully"));
  },
);

// ══════════════════════════════════════════════════════════
// VOLUNTEER ME: DASHBOARD OVERVIEW
// ══════════════════════════════════════════════════════════

export const getVolunteerMeDashboard = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const userId = req.user!.id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const [
      user,
      activeAssignments,
      totalVoters,
      todayVoters,
      weekVoters,
      recentVoters,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          designation: true,
        },
      }),
      prisma.wardVolunteerAssignment.findMany({
        where: { tenantId, userId, status: "ACTIVE" },
        include: {
          ward: {
            select: {
              id: true,
              wardNumber: true,
              name: true,
              zone: true,
              totalPopulation: true,
              areas: {
                where: { isDeleted: false },
                select: { id: true, name: true },
              },
              _count: {
                select: { voters: true },
              },
            },
          },
        },
      }),
      prisma.voter.count({
        where: { tenantId, createdByUserId: userId, isDeleted: false },
      }),
      prisma.voter.count({
        where: {
          tenantId,
          createdByUserId: userId,
          createdAt: { gte: todayStart },
          isDeleted: false,
        },
      }),
      prisma.voter.count({
        where: {
          tenantId,
          createdByUserId: userId,
          createdAt: { gte: weekStart },
          isDeleted: false,
        },
      }),
      prisma.voter.findMany({
        where: { tenantId, createdByUserId: userId, isDeleted: false },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          voterIdNumber: true,
          applicationNumber: true,
          gender: true,
          age: true,
          phone: true,
          createdAt: true,
          ward: { select: { id: true, wardNumber: true, name: true } },
        },
      }),
    ]);

    res.json(
      ApiResponse.success(
        {
          profile: user,
          stats: {
            assignedWardsCount: activeAssignments.length,
            totalVotersRegistered: totalVoters,
            todayVotersRegistered: todayVoters,
            weekVotersRegistered: weekVoters,
          },
          assignedWards: activeAssignments.map((a) => ({
            assignmentId: a.id,
            wardId: a.ward.id,
            wardNumber: a.ward.wardNumber,
            name: a.ward.name,
            zone: a.ward.zone,
            totalWardVoters: a.ward._count?.voters ?? 0,
            totalVoters: a.ward._count?.voters ?? 0,
            areas: a.ward.areas,
          })),
          recentRegistrations: recentVoters,
        },
        "Volunteer dashboard fetched successfully",
      ),
    );
  },
);

// ══════════════════════════════════════════════════════════
// VOLUNTEER ME: LIST ASSIGNED WARDS
// ══════════════════════════════════════════════════════════

export const getVolunteerMeWards = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const userId = req.user!.id;

    const assignments = await prisma.wardVolunteerAssignment.findMany({
      where: { tenantId, userId, status: "ACTIVE" },
      include: {
        ward: {
          select: {
            id: true,
            wardNumber: true,
            name: true,
            zone: true,
            pincode: true,
            totalPopulation: true,
            areas: {
              where: { isDeleted: false },
              select: { id: true, name: true },
            },
            booths: {
              select: { id: true, boothNumber: true, boothName: true },
            },
            _count: {
              select: { voters: true },
            },
          },
        },
      },
    });

    const formatted = assignments.map((a) => ({
      assignmentId: a.id,
      wardId: a.ward.id,
      wardNumber: a.ward.wardNumber,
      name: a.ward.name,
      zone: a.ward.zone,
      pincode: a.ward.pincode,
      totalVoters: a.ward._count?.voters ?? 0,
      totalWardVoters: a.ward._count?.voters ?? 0,
      areas: a.ward.areas,
      booths: a.ward.booths,
    }));

    res.json(
      ApiResponse.success(formatted, "Assigned wards fetched successfully"),
    );
  },
);

// ══════════════════════════════════════════════════════════
// VOLUNTEER ME: DIRECT VOTER REGISTRATION
// ══════════════════════════════════════════════════════════

export const volunteerDirectRegisterVoter = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const userId = req.user!.id;
    const data = req.body;

    // 1. Enforce ward authorization: volunteer MUST have active assignment for this ward
    const activeAssignment = await prisma.wardVolunteerAssignment.findFirst({
      where: {
        tenantId,
        userId,
        wardId: data.wardId,
        status: "ACTIVE",
      },
    });

    if (!activeAssignment) {
      throw ApiError.forbidden(
        "You are not authorized to register voters in this ward.",
      );
    }

    // 2. Check voter quota
    await assertCanCreateVoters(tenantId, 1);

    // 3. Verify ward exists
    const ward = await prisma.ward.findFirst({
      where: { id: data.wardId, tenantId, isDeleted: false },
    });
    if (!ward) {
      throw ApiError.badRequest("Ward not found in this organization.");
    }

    // 4. Verify wardArea if provided
    if (data.wardAreaId) {
      const area = await prisma.wardArea.findFirst({
        where: { id: data.wardAreaId, wardId: data.wardId },
      });
      if (!area) {
        throw ApiError.badRequest("Ward area not found under this ward.");
      }
    }

    // 5. Check duplicate voter ID (EPIC)
    const existing = await prisma.voter.findUnique({
      where: {
        tenantId_voterIdNumber: {
          tenantId,
          voterIdNumber: data.voterIdNumber.trim(),
        },
      },
    });

    if (existing) {
      throw ApiError.conflict(
        `Voter with EPIC / ID ${data.voterIdNumber} already exists.`,
      );
    }

    // 6. Generate application number
    const applicationNumber = await generateApplicationNumber(tenantId);

    // 7. Create Voter record with attribution
    const voter = await prisma.voter.create({
      data: {
        tenantId,
        wardId: data.wardId,
        wardAreaId: data.wardAreaId || null,
        voterIdNumber: data.voterIdNumber.trim(),
        applicationNumber,
        slNo: data.slNo ?? null,
        sectionNo: data.sectionNo ?? null,
        boothNo: data.boothNo ?? null,
        name: data.name.trim(),
        relativeName: data.relativeName?.trim() || null,
        relationType: data.relationType || null,
        gender: data.gender,
        age: data.age ?? null,
        houseNo: data.houseNo?.trim() || null,
        address: data.address?.trim() || null,
        locality: data.locality?.trim() || null,
        phone: data.phone?.trim() || null,
        bloodGroup: data.bloodGroup?.trim() || null,
        isDisabled: data.isDisabled ?? false,
        isOurVoter: data.isOurVoter ?? false,
        voterLeaning:
          data.voterLeaning ?? (data.isOurVoter ? "OUR_VOTER" : "UNKNOWN"),
        voterCadreNotes: data.voterCadreNotes?.trim() || null,
        taggedById: data.isOurVoter ? userId : null,
        taggedAt: data.isOurVoter ? new Date() : null,
        createdByUserId: userId,
      },
      include: {
        ward: { select: { id: true, name: true, wardNumber: true } },
      },
    });

    // 7b. Create Family Members if provided
    let createdFamilyMembersCount = 0;
    if (
      data.familyMembers &&
      Array.isArray(data.familyMembers) &&
      data.familyMembers.length > 0
    ) {
      const validMembers = data.familyMembers.filter(
        (m: any) => m && typeof m.name === "string" && m.name.trim().length > 0,
      );

      if (validMembers.length > 0) {
        await prisma.voterFamilyMember.createMany({
          data: validMembers.map((m: any) => ({
            tenantId,
            voterId: voter.id,
            name: m.name.trim(),
            relationType: m.relationType || "OTHER",
            relationCustom:
              m.relationType === "OTHER"
                ? m.relationCustom?.trim() || null
                : null,
            gender: m.gender || "MALE",
            age: m.age ? parseInt(String(m.age), 10) : null,
            phone: m.phone?.trim() || null,
            voterIdNumber: m.voterIdNumber?.trim() || null,
            bloodGroup: m.bloodGroup?.trim() || null,
            occupationTitle: m.occupationTitle?.trim() || null,
            isDependent: Boolean(m.isDependent),
            isEmergencyContact: Boolean(m.isEmergencyContact),
            sameAddress:
              m.sameAddress !== undefined ? Boolean(m.sameAddress) : true,
            address: m.address?.trim() || voter.address || null,
            remarks: m.remarks?.trim() || null,
            status: "ACTIVE",
          })),
        });
        createdFamilyMembersCount = validMembers.length;
      }
    }



    // 8. Record in volunteer_voter_submissions for activity tracking
    await prisma.volunteerVoterSubmission
      .create({
        data: {
          tenantId,
          wardId: data.wardId,
          volunteerUserId: userId,
          voterId: voter.id,
          status: "APPROVED",
          submissionNotes: data.submissionNotes || "Direct entry by volunteer",
          data: {
            name: data.name,
            voterIdNumber: data.voterIdNumber,
            applicationNumber,
            gender: data.gender,
            age: data.age,
            phone: data.phone,
            wardNumber: ward.wardNumber,
            familyMembersCount: createdFamilyMembersCount,
          },
        },
      })
      .catch((err) =>
        console.error("Error creating volunteer submission snapshot:", err),
      );

    // 9. Create Voter Account & Membership
    await createVoterAccountForVoter(
      tenantId,
      voter.id,
      applicationNumber,
      data.phone,
    );

    // 10. Auto-sync demographics
    await syncVoterDemographics(tenantId, data.wardId);

    // 11. Audit log
    createAuditLog({
      userId,
      tenantId,
      action: "CREATE",
      module: "voter_list",
      recordId: voter.id,
      description: `Volunteer registered voter "${voter.name}" (${voter.voterIdNumber}) in Ward ${ward.wardNumber}`,
      newData: {
        name: voter.name,
        voterIdNumber: voter.voterIdNumber,
        applicationNumber,
        wardId: data.wardId,
      },
      ...getRequestMeta(req),
    }).catch(() => {});

    res.status(201).json(
      ApiResponse.created(
        {
          ...voter,
          applicationNumber,
          initialPassword: applicationNumber,
        },
        "Voter registered successfully",
      ),
    );
  },
);

// ══════════════════════════════════════════════════════════
// VOLUNTEER ME: LIST VOTERS REGISTERED BY THIS VOLUNTEER
// ══════════════════════════════════════════════════════════

export const getVolunteerMeVoters = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const skip = (page - 1) * limit;
    const search = (req.query.search as string)?.trim();
    const wardId = req.query.wardId as string;

    const where: any = {
      tenantId,
      createdByUserId: userId,
      isDeleted: false,
    };

    if (wardId) {
      where.wardId = wardId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { voterIdNumber: { contains: search, mode: "insensitive" } },
        { applicationNumber: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [voters, total] = await Promise.all([
      prisma.voter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          voterIdNumber: true,
          applicationNumber: true,
          gender: true,
          age: true,
          phone: true,
          locality: true,
          address: true,
          isOurVoter: true,
          voterLeaning: true,
          createdAt: true,
          ward: { select: { id: true, wardNumber: true, name: true } },
          _count: { select: { familyMembers: true } },
          familyMembers: {
            select: {
              id: true,
              name: true,
              relationType: true,
              gender: true,
              age: true,
              phone: true,
              voterIdNumber: true,
              isDependent: true,
            },
          },
        },
      }),
      prisma.voter.count({ where }),
    ]);

    res.json(
      ApiResponse.success(
        {
          voters,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        "Volunteer registered voters fetched successfully",
      ),
    );
  },
);

// ══════════════════════════════════════════════════════════
// VOLUNTEER ME: ACTIVITY METRICS
// ══════════════════════════════════════════════════════════

export const getVolunteerMeActivity = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const userId = req.user!.id;

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const voters = await prisma.voter.findMany({
      where: {
        tenantId,
        createdByUserId: userId,
        createdAt: { gte: fourteenDaysAgo },
        isDeleted: false,
      },
      select: {
        id: true,
        createdAt: true,
        ward: { select: { wardNumber: true } },
      },
    });

    // Group by date YYYY-MM-DD
    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dailyCounts[dateStr] = 0;
    }

    for (const v of voters) {
      const dateStr = v.createdAt.toISOString().split("T")[0];
      if (dailyCounts[dateStr] !== undefined) {
        dailyCounts[dateStr]++;
      }
    }

    const timeline = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    res.json(
      ApiResponse.success(
        { timeline, totalLast14Days: voters.length },
        "Volunteer activity fetched",
      ),
    );
  },
);