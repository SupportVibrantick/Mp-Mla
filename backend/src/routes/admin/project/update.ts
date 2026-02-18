import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";

export async function update(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const existing = await prisma.project.findUnique({ where: { id } });
        if (!existing) { res.status(404).json({ success: false, message: "Project not found." }); return; }

        const project = await prisma.project.update({ where: { id }, data: req.body, include: { ward: { select: { name: true } } } });
        res.json({ success: true, message: "Project updated successfully", data: project });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
