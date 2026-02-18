import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";

export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: "User not found." });
            return;
        }

        // Soft delete: deactivate user instead of deleting
        await prisma.user.update({
            where: { id },
            data: { isActive: false },
        });

        res.json({ success: true, message: "User deactivated successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
