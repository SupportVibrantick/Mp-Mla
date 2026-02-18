import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { buildPaginationResponse } from "../../../schemas/common/index.js";

export async function readAll(req: Request, res: Response): Promise<void> {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || "";
        const category = req.query.category as string;
        const status = req.query.status as string;
        const wardId = req.query.wardId ? parseInt(req.query.wardId as string) : undefined;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
            ];
        }
        if (category) where.category = category;
        if (status) where.status = status;
        if (wardId) where.wardId = wardId;

        const [institutions, total] = await Promise.all([
            prisma.institution.findMany({
                where,
                include: {
                    ward: { select: { id: true, name: true } },
                    _count: { select: { incharges: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.institution.count({ where }),
        ]);

        res.json({ success: true, data: institutions, pagination: buildPaginationResponse(total, page, limit) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function readOne(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const institution = await prisma.institution.findUnique({
            where: { id },
            include: { ward: true, incharges: true },
        });
        if (!institution) { res.status(404).json({ success: false, message: "Institution not found." }); return; }
        res.json({ success: true, data: institution });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
