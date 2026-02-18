import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";

export async function update(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const data = req.body;

        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: "User not found." });
            return;
        }

        const user = await prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, updatedAt: true },
        });

        res.json({ success: true, message: "User updated successfully", data: user });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
