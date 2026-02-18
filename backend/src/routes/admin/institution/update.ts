import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";

export async function update(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const existing = await prisma.institution.findUnique({ where: { id } });
        if (!existing) { res.status(404).json({ success: false, message: "Institution not found." }); return; }

        const institution = await prisma.institution.update({ where: { id }, data: req.body });
        res.json({ success: true, message: "Institution updated successfully", data: institution });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
