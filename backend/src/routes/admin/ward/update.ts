import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";

export async function update(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const existing = await prisma.ward.findUnique({ where: { id } });
        if (!existing) { res.status(404).json({ success: false, message: "Ward not found." }); return; }

        const ward = await prisma.ward.update({ where: { id }, data: req.body });
        res.json({ success: true, message: "Ward updated successfully", data: ward });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
