import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { buildPaginationResponse } from "../../../schemas/common/index.js";

export async function readAll(req: Request, res: Response): Promise<void> {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || "";
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { areaName: { contains: search, mode: "insensitive" } },
            ];
        }

        const [wards, total] = await Promise.all([
            prisma.ward.findMany({
                where,
                include: {
                    _count: { select: { projects: true, grievances: true, institutions: true, demographics: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.ward.count({ where }),
        ]);

        res.json({ success: true, data: wards, pagination: buildPaginationResponse(total, page, limit) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function readOne(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const ward = await prisma.ward.findUnique({
            where: { id },
            include: {
                projects: { take: 5, orderBy: { createdAt: "desc" } },
                grievances: { take: 5, orderBy: { createdAt: "desc" } },
                institutions: { take: 10, orderBy: { name: "asc" } },
                demographics: true,
                _count: { select: { projects: true, grievances: true, institutions: true } },
            },
        });

        if (!ward) {
            res.status(404).json({ success: false, message: "Ward not found." });
            return;
        }

        res.json({ success: true, data: ward });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
