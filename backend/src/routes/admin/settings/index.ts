import { Router } from "express";
import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validate.js";
import { createSettingSchema, updateSettingSchema } from "../../../schemas/admin/settings/index.js";

const router = Router();
router.use(authenticate);

// GET all settings (any authenticated user can read)
router.get("/", async (_req: Request, res: Response): Promise<void> => {
    try {
        const settings = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
        res.json({ success: true, data: settings });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET setting by key
router.get("/:key", async (req: Request, res: Response): Promise<void> => {
    try {
        const setting = await prisma.systemSetting.findUnique({ where: { key: req.params.key } });
        if (!setting) { res.status(404).json({ success: false, message: "Setting not found." }); return; }
        res.json({ success: true, data: setting });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create setting (Admin only)
router.post("/", authorize("SYSTEM_ADMIN"), validate(createSettingSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const setting = await prisma.systemSetting.create({ data: req.body });
        res.status(201).json({ success: true, message: "Setting created successfully", data: setting });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PATCH update setting (Admin only)
router.patch("/:key", authorize("SYSTEM_ADMIN"), validate(updateSettingSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const setting = await prisma.systemSetting.update({
            where: { key: req.params.key },
            data: req.body,
        });
        res.json({ success: true, message: "Setting updated successfully", data: setting });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE setting (Admin only)
router.delete("/:key", authorize("SYSTEM_ADMIN"), async (req: Request, res: Response): Promise<void> => {
    try {
        await prisma.systemSetting.delete({ where: { key: req.params.key } });
        res.json({ success: true, message: "Setting deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
