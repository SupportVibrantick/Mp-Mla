import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { buildPaginationResponse } from "../../../schemas/common/index.js";
import catchAsync from "../../../utils/catchAsync.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import ApiError from "../../../utils/ApiError.js";
import pick from "../../../utils/pick.js";

/**
 * @route GET /api/admin/users
 * @desc Get all users with filters and pagination
 * @access Admin
 */
export const readAll = catchAsync(async (req: Request, res: Response) => {
    const filters = pick(req.query, ["role", "isActive"]);
    const search = req.query.search as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where: any = { ...filters };
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
        ];
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.user.count({ where }),
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            users,
            pagination: buildPaginationResponse(total, page, limit),
        })
    );
});

/**
 * @route GET /api/admin/users/:id
 * @desc Get single user by ID
 * @access Admin
 */
export const readOne = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true },
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json(ApiResponse.success(user));
});
