import { Router } from "express";
import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { buildPaginationResponse } from "../../../schemas/common/index.js";

const router = Router();
router.use(authenticate, authorize("SYSTEM_ADMIN"));

// GET all audit logs
router.get("/", async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const action = req.query.action as string;
        const entity = req.query.entity as string;
        const userId = req.query.userId as string;
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (action) where.action = action;
        if (entity) where.entity = { contains: entity, mode: "insensitive" };
        if (userId) where.userId = userId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: { user: { select: { id: true, name: true, email: true, role: true } } },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.auditLog.count({ where }),
        ]);

        res.json({ success: true, data: logs, pagination: buildPaginationResponse(total, page, limit) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET single audit log
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const log = await prisma.auditLog.findUnique({
            where: { id },
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
        });
        if (!log) { res.status(404).json({ success: false, message: "Audit log not found." }); return; }
        res.json({ success: true, data: log });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
