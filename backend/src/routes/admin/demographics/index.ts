import { Router } from "express";
import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validate.js";
import { auditLog } from "../../../middleware/auditLog.js";
import { createDemographicsSchema, updateDemographicsSchema } from "../../../schemas/admin/demographics/index.js";
import { buildPaginationResponse } from "../../../schemas/common/index.js";

const router = Router();
router.use(authenticate);

// GET all demographics
router.get("/", async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const wardId = req.query.wardId ? parseInt(req.query.wardId as string) : undefined;
        const communityGroup = req.query.communityGroup as string;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (wardId) where.wardId = wardId;
        if (communityGroup) where.communityGroup = { contains: communityGroup, mode: "insensitive" };

        const [demographics, total] = await Promise.all([
            prisma.demographics.findMany({
                where,
                include: { ward: { select: { id: true, name: true } } },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.demographics.count({ where }),
        ]);

        res.json({ success: true, data: demographics, pagination: buildPaginationResponse(total, page, limit) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET one
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const demographics = await prisma.demographics.findUnique({ where: { id }, include: { ward: true } });
        if (!demographics) { res.status(404).json({ success: false, message: "Demographics record not found." }); return; }
        res.json({ success: true, data: demographics });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET ward summary (aggregate demographics for a ward)
router.get("/ward/:wardId/summary", async (req: Request, res: Response): Promise<void> => {
    try {
        const wardId = parseInt(req.params.wardId);
        const demographics = await prisma.demographics.findMany({ where: { wardId } });

        const summary = demographics.reduce(
            (acc, d) => ({
                totalMale: acc.totalMale + d.maleCount,
                totalFemale: acc.totalFemale + d.femaleCount,
                totalAge0to18: acc.totalAge0to18 + d.age0to18,
                totalAge19to35: acc.totalAge19to35 + d.age19to35,
                totalAge36to60: acc.totalAge36to60 + d.age36to60,
                totalAge60plus: acc.totalAge60plus + d.age60plus,
                communityGroups: [...acc.communityGroups, d.communityGroup],
            }),
            { totalMale: 0, totalFemale: 0, totalAge0to18: 0, totalAge19to35: 0, totalAge36to60: 0, totalAge60plus: 0, communityGroups: [] as string[] }
        );

        res.json({ success: true, data: { wardId, ...summary, totalRecords: demographics.length } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST
router.post("/", authorize("SYSTEM_ADMIN", "STAFF"), validate(createDemographicsSchema), auditLog("demographics", "CREATE"), async (req: Request, res: Response): Promise<void> => {
    try {
        const demographics = await prisma.demographics.create({ data: req.body, include: { ward: { select: { name: true } } } });
        res.status(201).json({ success: true, message: "Demographics created successfully", data: demographics });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PATCH
router.patch("/:id", authorize("SYSTEM_ADMIN", "STAFF"), validate(updateDemographicsSchema), auditLog("demographics", "UPDATE"), async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const existing = await prisma.demographics.findUnique({ where: { id } });
        if (!existing) { res.status(404).json({ success: false, message: "Demographics not found." }); return; }
        const demographics = await prisma.demographics.update({ where: { id }, data: req.body });
        res.json({ success: true, message: "Demographics updated successfully", data: demographics });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE
router.delete("/:id", authorize("SYSTEM_ADMIN"), auditLog("demographics", "DELETE"), async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        await prisma.demographics.delete({ where: { id } });
        res.json({ success: true, message: "Demographics deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
