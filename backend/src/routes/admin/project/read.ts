import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { buildPaginationResponse } from "../../../schemas/common/index.js";

export async function readAll(req: Request, res: Response): Promise<void> {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || "";
        const status = req.query.status as string;
        const wardId = req.query.wardId ? parseInt(req.query.wardId as string) : undefined;
        const department = req.query.department as string;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { category: { contains: search, mode: "insensitive" } },
                { contractor: { contains: search, mode: "insensitive" } },
            ];
        }
        if (status) where.status = status;
        if (wardId) where.wardId = wardId;
        if (department) where.department = { contains: department, mode: "insensitive" };

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where,
                include: { ward: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.project.count({ where }),
        ]);

        res.json({ success: true, data: projects, pagination: buildPaginationResponse(total, page, limit) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function readOne(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const project = await prisma.project.findUnique({
            where: { id },
            include: { ward: true, createdBy: { select: { id: true, name: true, email: true } } },
        });
        if (!project) { res.status(404).json({ success: false, message: "Project not found." }); return; }
        res.json({ success: true, data: project });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
