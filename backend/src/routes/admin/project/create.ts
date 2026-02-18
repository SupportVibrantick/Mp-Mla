import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";

export async function create(req: Request, res: Response): Promise<void> {
    try {
        const data = { ...req.body, createdById: req.user?.id };
        const project = await prisma.project.create({ data, include: { ward: { select: { name: true } } } });
        res.status(201).json({ success: true, message: "Project created successfully", data: project });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
