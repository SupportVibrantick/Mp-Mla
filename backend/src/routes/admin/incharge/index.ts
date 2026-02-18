import { Router } from "express";
import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validate.js";
import { auditLog } from "../../../middleware/auditLog.js";
import { createInchargeSchema, updateInchargeSchema } from "../../../schemas/admin/incharge/index.js";
import { buildPaginationResponse } from "../../../schemas/common/index.js";
import catchAsync from "../../../utils/catchAsync.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import ApiError from "../../../utils/ApiError.js";
import logger from "../../../utils/logger.js";
import pick from "../../../utils/pick.js";

const router = Router();
router.use(authenticate);

// GET all incharges (with optional institutionId filter)
router.get("/", catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const institutionIdQuery = req.query.institutionId as string;
    const institutionId = institutionIdQuery ? parseInt(institutionIdQuery) : undefined;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (institutionId) where.institutionId = institutionId;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { designation: { contains: search, mode: "insensitive" } },
        ];
    }

    const [incharges, total] = await Promise.all([
        prisma.incharge.findMany({
            where,
            include: { institution: { select: { id: true, name: true, category: true } } },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.incharge.count({ where }),
    ]);

    res.json(ApiResponse.success({
        incharges,
        pagination: buildPaginationResponse(total, page, limit)
    }));
}));

// GET one incharge
router.get("/:id", catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const incharge = await prisma.incharge.findUnique({
        where: { id },
        include: { institution: { include: { ward: true } } },
    });

    if (!incharge) {
        throw new ApiError(404, "Incharge not found.");
    }

    res.json(ApiResponse.success(incharge));
}));

// POST create incharge
router.post("/", authorize("SYSTEM_ADMIN", "STAFF"), validate(createInchargeSchema), auditLog("incharge", "CREATE"), catchAsync(async (req: Request, res: Response) => {
    const data = req.body;
    logger.info(`Adding new incharge: ${data.name} for institution: ${data.institutionId}`);

    const incharge = await prisma.incharge.create({
        data,
        include: { institution: { select: { name: true } } }
    });

    logger.info(`Incharge created successfully with ID: ${incharge.id}`);
    res.status(201).json(ApiResponse.created(incharge, "Incharge created successfully"));
}));

// PATCH update incharge
router.patch("/:id", authorize("SYSTEM_ADMIN", "STAFF"), validate(updateInchargeSchema), auditLog("incharge", "UPDATE"), catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const existing = await prisma.incharge.findUnique({ where: { id } });

    if (!existing) {
        logger.warn(`Attempted to update non-existent incharge ID: ${id}`);
        throw new ApiError(404, "Incharge not found.");
    }

    const incharge = await prisma.incharge.update({ where: { id }, data: req.body });

    logger.info(`Incharge ${id} updated successfully`);
    res.json(ApiResponse.success(incharge, "Incharge updated successfully"));
}));

// DELETE incharge
router.delete("/:id", authorize("SYSTEM_ADMIN"), auditLog("incharge", "DELETE"), catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const existing = await prisma.incharge.findUnique({ where: { id } });

    if (!existing) {
        logger.warn(`Attempted to delete non-existent incharge ID: ${id}`);
        throw new ApiError(404, "Incharge not found.");
    }

    await prisma.incharge.delete({ where: { id } });

    logger.info(`Incharge ${id} deleted by ${req.user?.name || 'Admin'}`);
    res.json(ApiResponse.success(null, "Incharge deleted successfully"));
}));

export default router;
