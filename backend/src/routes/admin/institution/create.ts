import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";

export async function create(req: Request, res: Response): Promise<void> {
    try {
        const institution = await prisma.institution.create({ data: req.body, include: { ward: { select: { name: true } } } });
        res.status(201).json({ success: true, message: "Institution created successfully", data: institution });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
