import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "../../../utils/catchAsync.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import logger from "../../../utils/logger.js";

/**
 * @route POST /api/admin/grievances
 * @desc Create new grievance
 */
export const create = catchAsync(async (req: Request, res: Response) => {
    const data = { ...req.body, createdById: req.user?.id };

    logger.info(`Creating grievance for ward ${data.wardId} by user ${req.user?.name}`);

    const grievance = await prisma.grievance.create({
        data,
        include: { ward: { select: { name: true } } }
    });

    logger.info(`Grievance created successfully with ID: ${grievance.id}`);

    res.status(201).json(ApiResponse.created(grievance, "Grievance created successfully"));
});
