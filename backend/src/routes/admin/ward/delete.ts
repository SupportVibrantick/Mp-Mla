import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";

export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const existing = await prisma.ward.findUnique({ where: { id } });
        if (!existing) { res.status(404).json({ success: false, message: "Ward not found." }); return; }

        await prisma.ward.delete({ where: { id } });
        res.json({ success: true, message: "Ward deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
