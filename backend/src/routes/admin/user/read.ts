import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import catchAsync from "../../../utils/catchAsync.js";

/**
 * GET /api/admin/users
 */
export const listUsers = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { role, status, search } = req.query as Record<string, string>;

  const where: any = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        lastLoginAt: true,
        forcePasswordChange: true,
        createdAt: true,
        createdByAdmin: { select: { id: true, name: true } },
        _count: {
          select: {
            tasksAssigned: true,
            grievancesCreated: true,
            projectsCreated: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  //  Build pagination metadata
  const pagination = buildPagination(total, page, limit);

  //  Standard response
  res.json(
    ApiResponse.success(
      {
        users,
        pagination,
      },
      "Users fetched successfully",
    ),
  );
});

/**
 * GET /api/admin/users/:id
 */
export const getUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id as string;

  if (!userId) {
    throw ApiError.badRequest("User ID required");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      avatarUrl: true,
      lastLoginAt: true,
      lastLoginIp: true,
      failedLoginCount: true,
      forcePasswordChange: true,
      passwordChangedAt: true,
      createdAt: true,
      updatedAt: true,
      createdByAdmin: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          tasksAssigned: true,
          tasksCreated: true,
          grievancesCreated: true,
          projectsCreated: true,
        },
      },
    },
  });

  if (!user) throw ApiError.notFound("User not found");

  res.json(ApiResponse.success(user, "User fetched successfully"));
});
