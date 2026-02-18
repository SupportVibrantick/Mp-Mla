import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";

export async function create(req: Request, res: Response): Promise<void> {
    try {
        const ward = await prisma.ward.create({ data: req.body });
        res.status(201).json({ success: true, message: "Ward created successfully", data: ward });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
