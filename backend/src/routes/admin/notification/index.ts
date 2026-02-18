import { Router } from "express";
import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { authenticate } from "../../../middleware/auth.js";

const router = Router();
router.use(authenticate);

// GET all notifications for current user
router.get("/", async (req: Request, res: Response): Promise<void> => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user!.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        const unreadCount = await prisma.notification.count({
            where: { userId: req.user!.id, isRead: false },
        });

        res.json({ success: true, data: { notifications, unreadCount } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PATCH mark notification as read
router.patch("/:id/read", async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        await prisma.notification.update({
            where: { id, userId: req.user!.id },
            data: { isRead: true },
        });
        res.json({ success: true, message: "Notification marked as read" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PATCH mark all as read
router.patch("/read-all", async (req: Request, res: Response): Promise<void> => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user!.id, isRead: false },
            data: { isRead: true },
        });
        res.json({ success: true, message: "All notifications marked as read" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE notification
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        await prisma.notification.delete({ where: { id, userId: req.user!.id } });
        res.json({ success: true, message: "Notification deleted" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
