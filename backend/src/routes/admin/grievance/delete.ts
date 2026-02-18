import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";

export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const existing = await prisma.grievance.findUnique({ where: { id } });
        if (!existing) { res.status(404).json({ success: false, message: "Grievance not found." }); return; }

        await prisma.grievance.delete({ where: { id } });
        res.json({ success: true, message: "Grievance deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
