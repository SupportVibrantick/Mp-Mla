import { Router } from "express";
import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validate.js";
import { auditLog } from "../../../middleware/auditLog.js";
import { createSchemeSchema, updateSchemeSchema } from "../../../schemas/admin/scheme/index.js";
import { buildPaginationResponse } from "../../../schemas/common/index.js";

const router = Router();
router.use(authenticate);

// GET all schemes
router.get("/", async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || "";
        const status = req.query.status as string;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { department: { contains: search, mode: "insensitive" } },
            ];
        }
        if (status) where.status = status;

        const [schemes, total] = await Promise.all([
            prisma.scheme.findMany({
                where,
                include: { wards: { include: { ward: { select: { id: true, name: true } } } } },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.scheme.count({ where }),
        ]);

        res.json({ success: true, data: schemes, pagination: buildPaginationResponse(total, page, limit) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET one scheme
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const scheme = await prisma.scheme.findUnique({
            where: { id },
            include: { wards: { include: { ward: true } } },
        });
        if (!scheme) { res.status(404).json({ success: false, message: "Scheme not found." }); return; }
        res.json({ success: true, data: scheme });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create scheme
router.post("/", authorize("SYSTEM_ADMIN", "STAFF"), validate(createSchemeSchema), auditLog("scheme", "CREATE"), async (req: Request, res: Response): Promise<void> => {
    try {
        const { wardIds, ...schemeData } = req.body;

        const scheme = await prisma.scheme.create({
            data: {
                ...schemeData,
                ...(wardIds?.length && {
                    wards: { create: wardIds.map((wardId: number) => ({ wardId })) },
                }),
            },
            include: { wards: { include: { ward: { select: { id: true, name: true } } } } },
        });

        res.status(201).json({ success: true, message: "Scheme created successfully", data: scheme });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PATCH update scheme
router.patch("/:id", authorize("SYSTEM_ADMIN", "STAFF"), validate(updateSchemeSchema), auditLog("scheme", "UPDATE"), async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const { wardIds, ...schemeData } = req.body;

        const existing = await prisma.scheme.findUnique({ where: { id } });
        if (!existing) { res.status(404).json({ success: false, message: "Scheme not found." }); return; }

        // If wardIds provided, replace all ward associations
        if (wardIds) {
            await prisma.schemeWard.deleteMany({ where: { schemeId: id } });
        }

        const scheme = await prisma.scheme.update({
            where: { id },
            data: {
                ...schemeData,
                ...(wardIds?.length && {
                    wards: { create: wardIds.map((wardId: number) => ({ wardId })) },
                }),
            },
            include: { wards: { include: { ward: { select: { id: true, name: true } } } } },
        });

        res.json({ success: true, message: "Scheme updated successfully", data: scheme });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE scheme
router.delete("/:id", authorize("SYSTEM_ADMIN"), auditLog("scheme", "DELETE"), async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const existing = await prisma.scheme.findUnique({ where: { id } });
        if (!existing) { res.status(404).json({ success: false, message: "Scheme not found." }); return; }

        await prisma.scheme.delete({ where: { id } });
        res.json({ success: true, message: "Scheme deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
