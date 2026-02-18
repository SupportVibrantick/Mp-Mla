import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma.js";

export async function create(req: Request, res: Response): Promise<void> {
    try {
        const { name, email, password, phone, role, isActive } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(409).json({ success: false, message: "User with this email already exists." });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, phone, role, isActive },
            select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
        });

        res.status(201).json({ success: true, message: "User created successfully", data: user });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
