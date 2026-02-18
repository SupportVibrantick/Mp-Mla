import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";

export async function remove(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const existing = await prisma.institution.findUnique({ where: { id } });
        if (!existing) { res.status(404).json({ success: false, message: "Institution not found." }); return; }

        await prisma.institution.delete({ where: { id } });
        res.json({ success: true, message: "Institution deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
