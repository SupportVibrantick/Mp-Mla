import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "../../../utils/catchAsync.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import ApiError from "../../../utils/ApiError.js";
import logger from "../../../utils/logger.js";

/**
 * @route PATCH /api/admin/grievances/:id
 * @desc Update grievance status/details
 */
export const update = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const existing = await prisma.grievance.findUnique({ where: { id } });

    if (!existing) {
        logger.warn(`Attempted to update non-existent grievance ID: ${id}`);
        throw new ApiError(404, "Grievance not found.");
    }

    const data = { ...req.body };
    if (data.status === "RESOLVED" && existing.status !== "RESOLVED") {
        data.resolvedAt = new Date();
        logger.info(`Grievance ${id} resolved by ${req.user?.name}`);
    }

    const grievance = await prisma.grievance.update({
        where: { id },
        data,
        include: { ward: { select: { name: true } } }
    });

    logger.info(`Grievance ${id} updated successfully`);

    res.json(ApiResponse.success(grievance, "Grievance updated successfully"));
});
