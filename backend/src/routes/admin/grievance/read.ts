import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { buildPaginationResponse } from "../../../schemas/common/index.js";

export async function readAll(req: Request, res: Response): Promise<void> {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || "";
        const status = req.query.status as string;
        const priority = req.query.priority as string;
        const wardId = req.query.wardId ? parseInt(req.query.wardId as string) : undefined;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.OR = [
                { category: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { assignedDept: { contains: search, mode: "insensitive" } },
            ];
        }
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (wardId) where.wardId = wardId;

        const [grievances, total] = await Promise.all([
            prisma.grievance.findMany({
                where,
                include: { ward: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.grievance.count({ where }),
        ]);

        res.json({ success: true, data: grievances, pagination: buildPaginationResponse(total, page, limit) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function readOne(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id as string);
        const grievance = await prisma.grievance.findUnique({
            where: { id },
            include: { ward: true, createdBy: { select: { id: true, name: true, email: true } } },
        });
        if (!grievance) { res.status(404).json({ success: false, message: "Grievance not found." }); return; }
        res.json({ success: true, data: grievance });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
