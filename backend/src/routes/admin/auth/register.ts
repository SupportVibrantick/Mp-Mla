// import { Request, Response } from "express";
// import bcrypt from "bcryptjs";
// import prisma from "../../../lib/prisma.js";
// import { createAuditEntry } from "../../../middleware/auditLog.js";

// export async function register(req: Request, res: Response): Promise<void> {
//     try {
//         const { name, email, password, phone, role } = req.body;

//         // Check if user exists
//         const existingUser = await prisma.user.findUnique({ where: { email } });
//         if (existingUser) {
//             res.status(409).json({ success: false, message: "User with this email already exists." });
//             return;
//         }

//         const hashedPassword = await bcrypt.hash(password, 12);

//         const user = await prisma.user.create({
//             data: { name, email, password: hashedPassword, phone, role },
//             select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
//         });

//         // Audit log
//         await createAuditEntry({
//             userId: req.user?.id,
//             action: "CREATE",
//             entity: "user",
//             entityId: user.id,
//             newData: { name, email, role, phone },
//             ipAddress: req.ip || undefined,
//         });

//         res.status(201).json({
//             success: true,
//             message: "User registered successfully",
//             data: user,
//         });
//     } catch (error: any) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }
